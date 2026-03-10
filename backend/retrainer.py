import pandas as pd
import numpy as np
import joblib
import json
import shutil
from pathlib import Path
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score
from sklearn.utils.class_weight import compute_class_weight
from xgboost import XGBClassifier

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR       = Path(__file__).parent.parent
MODELS_DIR     = BASE_DIR / "ml" / "models"
DATA_DIR       = BASE_DIR / "ml" / "data"

FEATURED_CSV   = DATA_DIR / "dataset_featured.csv"
FEEDBACK_CSV   = DATA_DIR / "feedback_data.csv"
MODEL_PATH     = MODELS_DIR / "denial_model.pkl"
ENCODERS_PATH  = MODELS_DIR / "label_encoders.pkl"
FEATURES_PATH  = MODELS_DIR / "feature_names.pkl"
STATS_PATH     = MODELS_DIR / "model_stats.json"

# ─── Constants ────────────────────────────────────────────────────────────────
MIN_SAMPLES_TO_RETRAIN = 50     # minimum feedback rows before retraining
RANDOM_STATE           = 42

# ─── Outcome mapping — align feedback labels with ClaimOutcome target ─────────
OUTCOME_MAP = {
    "Paid":       1,
    "Processed":  1,
    "Rejected":   0,
    "Pending":    0,
    "In Review":  0,
}


# ─── Model stats helpers ──────────────────────────────────────────────────────

def _load_stats() -> dict:
    """Load model stats JSON — create with defaults if it doesn't exist."""
    if STATS_PATH.exists():
        with open(STATS_PATH) as f:
            return json.load(f)
    # Default stats — populated after first retrain
    return {
        "current_version": "v1_base",
        "base_training_samples": 0,
        "feedback_samples_collected": 0,
        "last_retrain_date": None,
        "current_accuracy": 0.0,
    }


def _save_stats(stats: dict):
    with open(STATS_PATH, "w") as f:
        json.dump(stats, f, indent=2)


def get_feedback_count() -> int:
    """Return number of feedback rows collected so far."""
    if not FEEDBACK_CSV.exists():
        return 0
    try:
        return len(pd.read_csv(FEEDBACK_CSV))
    except Exception:
        return 0


def get_model_status() -> dict:
    stats = _load_stats()
    feedback_count = get_feedback_count()
    base_samples = stats.get("base_training_samples", 0)
    samples_until = max(0, MIN_SAMPLES_TO_RETRAIN - feedback_count)

    return {
        "current_version":           stats.get("current_version", "v1_base"),
        "base_training_samples":     base_samples,
        "feedback_samples_collected": feedback_count,
        "total_training_samples":    base_samples + feedback_count,
        "last_retrain_date":         stats.get("last_retrain_date"),
        "current_accuracy":          stats.get("current_accuracy", 0.0),
        "retraining_threshold":      MIN_SAMPLES_TO_RETRAIN,
        "samples_until_retrain":     samples_until,
    }


# ─── Feedback storage ─────────────────────────────────────────────────────────

def save_feedback(claim_data: dict, actual_outcome: str,
                  predicted_score: float, predicted_level: str,
                  feedback_date: str = None) -> int:
    """
    Append one feedback row to feedback_data.csv.
    Returns total feedback count after saving.
    """
    outcome_int = OUTCOME_MAP.get(actual_outcome, 0)

    row = {**claim_data}
    row["ActualOutcome"]       = actual_outcome
    row["ClaimOutcome"]        = outcome_int
    row["PredictedRiskScore"]  = predicted_score
    row["PredictedRiskLevel"]  = predicted_level
    row["FeedbackDate"]        = feedback_date or datetime.now().strftime("%Y-%m-%d")

    df_new = pd.DataFrame([row])

    if FEEDBACK_CSV.exists():
        df_existing = pd.read_csv(FEEDBACK_CSV)
        df_combined = pd.concat([df_existing, df_new], ignore_index=True)
    else:
        df_combined = df_new

    df_combined.to_csv(FEEDBACK_CSV, index=False)

    # Update stats
    stats = _load_stats()
    stats["feedback_samples_collected"] = len(df_combined)
    _save_stats(stats)

    return len(df_combined)


# ─── Retraining pipeline ──────────────────────────────────────────────────────

def retrain_model() -> dict:
    """
    Full retraining pipeline:
    1. Load base dataset + feedback data
    2. Align columns
    3. Retrain XGBoost
    4. Evaluate and compare to previous model
    5. Save new model with versioned backup
    6. Update model stats
    Returns dict with before/after metrics.
    """

    # ── Load base dataset ────────────────────────────────────────────────────
    if not FEATURED_CSV.exists():
        raise FileNotFoundError(f"Base dataset not found at {FEATURED_CSV}")

    df_base = pd.read_csv(FEATURED_CSV)
    base_count = len(df_base)

    # ── Load feedback data ────────────────────────────────────────────────────
    feedback_count = 0
    if FEEDBACK_CSV.exists():
        df_feedback = pd.read_csv(FEEDBACK_CSV)
        feedback_count = len(df_feedback)

        # Keep only columns that exist in base dataset
        shared_cols = [c for c in df_base.columns if c in df_feedback.columns]
        df_feedback = df_feedback[shared_cols]

        # Combine
        df_combined = pd.concat([df_base, df_feedback], ignore_index=True)
    else:
        df_combined = df_base

    # ── Load saved artifacts ──────────────────────────────────────────────────
    encoders      = joblib.load(ENCODERS_PATH)
    feature_names = joblib.load(FEATURES_PATH)

    # ── Prepare features ──────────────────────────────────────────────────────
    # Drop non-feature columns
    drop_cols = ["ClaimOutcome", "ClaimStatus", "ActualOutcome",
                 "PredictedRiskScore", "PredictedRiskLevel", "FeedbackDate"]
    drop_cols = [c for c in drop_cols if c in df_combined.columns]

    X = df_combined.drop(columns=drop_cols)
    y = df_combined["ClaimOutcome"]

    # Re-encode categoricals
    for col, encoder in encoders.items():
        if col in X.columns:
            X[col] = X[col].astype(str).apply(
                lambda v: encoder.transform([v])[0] if v in encoder.classes_ else -1
            )

    # Enforce feature order
    X = X[feature_names]

    # ── Train/test split ──────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    # ── Class weights ─────────────────────────────────────────────────────────
    classes = np.array([0, 1])
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    scale_pos_weight = weights[0] / weights[1]

    # ── Evaluate CURRENT model before replacing ───────────────────────────────
    current_model = joblib.load(MODEL_PATH)
    y_pred_old = current_model.predict(X_test)
    old_f1 = round(f1_score(y_test, y_pred_old) * 100, 2)

    # ── Train new model ───────────────────────────────────────────────────────
    new_model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        random_state=RANDOM_STATE,
        eval_metric="logloss",
        verbosity=0
    )
    new_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    # ── Evaluate new model ────────────────────────────────────────────────────
    y_pred_new = new_model.predict(X_test)
    new_f1 = round(f1_score(y_test, y_pred_new) * 100, 2)
    improvement = round(new_f1 - old_f1, 2)

    # ── Version and save ──────────────────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    version = f"v{timestamp}"

    # Backup current model into previous_models/, keeping only 3 most recent
    prev_dir = MODELS_DIR / "previous_models"
    prev_dir.mkdir(exist_ok=True)
    backup_path = prev_dir / f"denial_model_{version}.pkl"
    shutil.copy(MODEL_PATH, backup_path)

    # Prune: keep only the 3 most recent backups, delete older ones
    existing_backups = sorted(prev_dir.glob("denial_model_*.pkl"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old_backup in existing_backups[3:]:
        old_backup.unlink()

    # Save new model
    joblib.dump(new_model, MODEL_PATH)

    # ── Update stats ──────────────────────────────────────────────────────────
    stats = _load_stats()
    stats["current_version"]          = version
    stats["base_training_samples"]    = base_count
    stats["feedback_samples_collected"] = feedback_count
    stats["last_retrain_date"]        = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    stats["current_accuracy"]         = new_f1
    _save_stats(stats)

    return {
        "version":               version,
        "previous_accuracy":     old_f1,
        "new_accuracy":          new_f1,
        "improvement":           improvement,
        "training_samples":      len(X_train),
        "feedback_samples_used": feedback_count,
    }