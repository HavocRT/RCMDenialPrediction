import joblib
import json
import numpy as np
import pandas as pd
import shap
from pathlib import Path

from prevention import get_prevention_suggestions, get_top_risk_features
from schemas import ClaimRequest, PredictionResponse

# ─── Paths ───────────────────────────────────────────────────────────────────
MODELS_DIR = Path(__file__).parent.parent / "ml" / "models"

# ─── Load all artifacts once at startup ──────────────────────────────────────
print("Loading model artifacts...")

model         = joblib.load(MODELS_DIR / "denial_model.pkl")
encoders      = joblib.load(MODELS_DIR / "label_encoders.pkl")
feature_names = joblib.load(MODELS_DIR / "feature_names.pkl")
explainer     = shap.TreeExplainer(model)

with open(MODELS_DIR / "rate_lookup.json") as f:
    rate_lookup = json.load(f)

print(f"Model loaded. Features: {len(feature_names)}")

# ─── Constants matching notebook ─────────────────────────────────────────────
OVERALL_PROBLEM_RATE = 0.61   # from training data: ~61% are problem claims

HIGH_AUTH_PROCEDURES = {
    "70553",   # MRI Brain with contrast
    "27447",   # Total knee replacement
    "66984",   # Cataract surgery
    "43239",   # Upper GI endoscopy
    "92004",   # Ophthalmology exam
    "93000",   # Electrocardiogram
}

VALID_DX_PROC = {
    "E": ["99", "80"],
    "I": ["93", "99", "71"],
    "J": ["99", "71", "85"],
    "K": ["43", "99"],
    "M": ["27", "97", "20"],
    "F": ["90", "99"],
    "C": ["99", "85"],
    "N": ["99", "80"],
    "Z": ["99", "92"],
    "G": ["99", "93", "90"],
    "R": ["99", "71", "85"],
}

AGE_BINS    = [0, 25, 40, 55, 65, 100]
AGE_LABELS  = ["18-25", "26-40", "41-55", "56-65", "65+"]

INC_BINS    = [0, 30000, 60000, 100000, 200000, 999999]
INC_LABELS  = ["Low", "Lower-Mid", "Mid", "Upper-Mid", "High"]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _flag_mismatch(diagnosis_code: str, procedure_code: str) -> int:
    diag_cat  = diagnosis_code[0] if diagnosis_code else ""
    proc_cat  = str(procedure_code)[:2]
    valid     = VALID_DX_PROC.get(diag_cat, [])
    return 0 if proc_cat in valid else 1


def _age_bucket(age: int) -> str:
    for i in range(len(AGE_BINS) - 1):
        if AGE_BINS[i] < age <= AGE_BINS[i + 1]:
            return AGE_LABELS[i]
    return AGE_LABELS[-1]


def _income_bucket(income: int) -> str:
    for i in range(len(INC_BINS) - 1):
        if INC_BINS[i] < income <= INC_BINS[i + 1]:
            return INC_LABELS[i]
    return INC_LABELS[-1]


def _risk_level(score: float) -> str:
    if score > 75: return "Critical"
    if score > 55: return "High"
    if score > 35: return "Medium"
    return "Low"


def _lookup_rate(lookup_key: str, value: str) -> float:
    """Look up historical problem rate for a given feature value."""
    result = rate_lookup.get(lookup_key, {}).get(str(value), OVERALL_PROBLEM_RATE)
    return float(result) if result is not None else OVERALL_PROBLEM_RATE


# ─── Main preprocessing function ─────────────────────────────────────────────

def preprocess_claim(claim: ClaimRequest) -> pd.DataFrame:
    """
    Replicate every feature engineering step from the notebook.
    Input: raw ClaimRequest from React
    Output: DataFrame with exactly the features the model expects
    """
    from datetime import datetime

    proc_code = str(claim.ProcedureCode)

    # ── Parse ClaimDate — fallback to today if not provided ──────────────────
    if claim.ClaimDate:
        claim_dt = pd.to_datetime(claim.ClaimDate)
    else:
        claim_dt = pd.Timestamp(datetime.now())

    # ── Specialty average for ClaimAmountVsSpecialtyAvg ───────────────────────
    specialty_avg_map = {
        k: v for k, v in rate_lookup.get("SpecialtyAmountAvg", {}).items()
    }
    specialty_avg = specialty_avg_map.get(claim.ProviderSpecialty, 22928.0)

    row = {
        # ── Original features ──────────────────────────────────────────────
        "CompanyName":             claim.CompanyName,
        "ClaimAmount":             claim.ClaimAmount,
        "DiagnosisCode":           claim.DiagnosisCode,
        "ProcedureCode":           proc_code,
        "PatientAge":              claim.PatientAge,
        "PatientGender":           claim.PatientGender,
        "ProviderSpecialty":       claim.ProviderSpecialty,
        "ClaimType":               claim.ClaimType,
        "ClaimSubmissionMethod":   claim.ClaimSubmissionMethod,
        "InsuranceStatus":         claim.InsuranceStatus,
        "PatientIncome":           claim.PatientIncome,
        "PatientMaritalStatus":    claim.PatientMaritalStatus,
        "PatientEmploymentStatus": claim.PatientEmploymentStatus,
        "ProviderLocation":        claim.ProviderLocation,

        # ── Date features — match notebook Section 4 exactly ──────────────
        "ClaimYear":               claim_dt.year,
        "ClaimMonth":              claim_dt.month,
        "ClaimDayOfWeek":          claim_dt.dayofweek,       # 0=Mon, 6=Sun
        "ClaimQuarter":            claim_dt.quarter,
        "IsWeekend":               int(claim_dt.dayofweek >= 5),
        "IsEndOfMonth":            int(claim_dt.day >= 25),
        "DaysSinceEarliestClaim":  0,  # always 0 for new incoming claims

        # ── Amount features ────────────────────────────────────────────────
        "IsHighDollarClaim":           int(claim.ClaimAmount > 30000),
        "ClaimAmountLog":              np.log1p(claim.ClaimAmount),
        "ClaimAmountVsSpecialtyAvg":   round(claim.ClaimAmount / specialty_avg, 3),

        # ── Patient features ───────────────────────────────────────────────
        "AgeBucket":               _age_bucket(claim.PatientAge),
        "IncomeBucket":            _income_bucket(claim.PatientIncome),

        # ── Clinical features ──────────────────────────────────────────────
        "PriorAuthRequired":       int(proc_code in HIGH_AUTH_PROCEDURES),
        "DiagnosisCategory":       claim.DiagnosisCode[0] if claim.DiagnosisCode else "Z",
        "ProcedureCategory":       proc_code[:2],
        "ICDCPTMismatch":          _flag_mismatch(claim.DiagnosisCode, proc_code),

        # ── Historical problem rates from lookup table ─────────────────────
        "SpecialtyProblemRate":    _lookup_rate("SpecialtyProblemRate",  claim.ProviderSpecialty),
        "CompanyProblemRate":      _lookup_rate("CompanyProblemRate",    claim.CompanyName),
        "LocationProblemRate":     _lookup_rate("LocationProblemRate",   claim.ProviderLocation),
        "ClaimTypeProblemRate":    _lookup_rate("ClaimTypeProblemRate",  claim.ClaimType),
        "DiagnosisProblemRate":    _lookup_rate("DiagnosisProblemRate",  claim.DiagnosisCode),
        "ProcedureProblemRate":    _lookup_rate("ProcedureProblemRate",  proc_code),
    }

    # CompositeRiskScore — sum of binary risk flags
    row["CompositeRiskScore"] = int(
        int(row["PriorAuthRequired"]) +
        int(row["IsHighDollarClaim"]) +
        int(row["ICDCPTMismatch"]) +
        int(str(claim.ClaimSubmissionMethod) == "Paper") +
        int(float(row["CompanyProblemRate"]) > float(OVERALL_PROBLEM_RATE))
    )

    df = pd.DataFrame([row])

    # ── Label encode categoricals using saved encoders ────────────────────
    for col, encoder in encoders.items():
        if col in df.columns:
            val = df[col].astype(str).iloc[0]
            # Handle unseen labels gracefully
            if val in encoder.classes_:
                df[col] = encoder.transform([val])
            else:
                df[col] = -1   # unknown category

    # ── Enforce exact column order from training ──────────────────────────
    df = df[feature_names]

    return df


# ─── Inference ────────────────────────────────────────────────────────────────

def run_prediction(claim: ClaimRequest) -> PredictionResponse:
    """
    Full pipeline: raw claim → preprocessed → model → SHAP → response
    """
    # Preprocess
    processed = preprocess_claim(claim)

    # Risk score — probability of being a problem claim (class 0)
    risk_proba = model.predict_proba(processed)[0][0]
    risk_score = round(risk_proba * 100, 1)

    # SHAP explanation
    shap_values = explainer.shap_values(processed)

    # Handle XGBoost vs RF shap value format
    if isinstance(shap_values, list):
        shap_vals = shap_values[0][0]   # RF: list of arrays per class
    else:
        shap_vals = shap_values[0]      # XGBoost: single array

    # Prevention suggestions from SHAP
    suggestions = get_prevention_suggestions(shap_vals, feature_names)

    # Top risk features
    top_features = get_top_risk_features(shap_vals, feature_names)

    # Projected risk if top issues are fixed
    projected_risk = _simulate_fixed_risk(claim, suggestions)

    return PredictionResponse(
        risk_score=risk_score,
        risk_level=_risk_level(risk_score),
        prevention_suggestions=suggestions,
        projected_risk_if_fixed=projected_risk,
        top_risk_features=top_features
    )


def _simulate_fixed_risk(claim: ClaimRequest, suggestions) -> float:
    """
    Simulate what the risk score would be if top flagged issues were fixed.
    Creates a modified copy of the claim with issues resolved.
    """
    if not suggestions:
        return round(model.predict_proba(preprocess_claim(claim))[0][0] * 100, 1)

    # Build a fixed version of the claim
    fixed = claim.model_copy()

    for suggestion in suggestions[:3]:   # fix top 3 issues
        feat = suggestion.feature
        if feat == "ClaimSubmissionMethod":
            fixed.ClaimSubmissionMethod = "Electronic"
        elif feat == "InsuranceStatus":
            fixed.InsuranceStatus = "Approved"
        elif feat == "PriorAuthRequired":
            # Simulate auth obtained — use a non-auth procedure as proxy
            pass  # flag is derived, not directly settable

    fixed_processed = preprocess_claim(fixed)
    projected = model.predict_proba(fixed_processed)[0][0] * 100
    return round(projected, 1)