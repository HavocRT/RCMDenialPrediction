from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import ClaimRequest, PredictionResponse, SummaryStats, TrendsResponse
from model import run_prediction
from analytics import get_summary, get_trends, get_monthly_trend, get_high_risk_claims

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="RCM Denial Prediction & Prevention Engine",
    description="Predicts claim denial risk before submission and suggests corrective actions.",
    version="1.0.0"
)

# ─── CORS — allow React dev server to talk to this API ───────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # React dev server (Vite)
        "http://localhost:5173",   # React dev server (CRA)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Health check — confirms API and model are loaded."""
    return {"status": "ok", "model": "denial_model.pkl loaded"}


@app.post("/predict", response_model=PredictionResponse)
def predict_claim(claim: ClaimRequest):
    """
    Core endpoint. Accepts raw claim data, returns:
    - Denial risk score (0-100%)
    - Risk level (Low / Medium / High / Critical)
    - Prevention suggestions with corrective actions
    - Projected risk if top issues are fixed
    - Top 3 features driving the risk
    """
    try:
        result = run_prediction(claim)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/summary", response_model=SummaryStats)
def summary_stats():
    """
    Dashboard header stats:
    - Total claims, overall problem rate, avg claim amount
    - Top denial company and specialty
    """
    try:
        return get_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary failed: {str(e)}")


@app.get("/trends", response_model=TrendsResponse)
def denial_trends():
    """
    Denial/rejection rates broken down by:
    - Company, Specialty, Claim Type, Submission Method, Location
    Used to populate dashboard bar charts.
    """
    try:
        return get_trends()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trends failed: {str(e)}")


@app.get("/trends/monthly")
def monthly_trend():
    """
    Rejection rate over time — used for the time series line chart.
    """
    try:
        return get_monthly_trend()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Monthly trend failed: {str(e)}")


@app.get("/claims/high-risk")
def high_risk_claims(limit: int = 20):
    """
    Returns top N high-risk claims for the dashboard queue.
    These represent claims that need attention before submission.
    """
    try:
        return get_high_risk_claims(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"High risk claims failed: {str(e)}")


# ─── Feedback & Retraining ────────────────────────────────────────────────────

from schemas import FeedbackRequest, FeedbackResponse, RetrainResponse, ModelStatus
from retrainer import (
    save_feedback, retrain_model, get_model_status,
    get_feedback_count, MIN_SAMPLES_TO_RETRAIN
)
import model as model_module


@app.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(feedback: FeedbackRequest):
    """
    Submit the real outcome of a claim after the insurer responds.
    Saves the claim + actual outcome to feedback_data.csv.
    Automatically triggers retraining when MIN_SAMPLES_TO_RETRAIN is reached.
    """
    try:
        total = save_feedback(
            claim_data=feedback.claim.model_dump(),
            actual_outcome=feedback.actual_outcome,
            predicted_score=feedback.predicted_risk_score,
            predicted_level=feedback.predicted_risk_level,
            feedback_date=feedback.feedback_date
        )

        # Check if retraining threshold is reached
        retrain_triggered = total >= MIN_SAMPLES_TO_RETRAIN and total % MIN_SAMPLES_TO_RETRAIN == 0
        samples_until = max(0, MIN_SAMPLES_TO_RETRAIN - (total % MIN_SAMPLES_TO_RETRAIN))

        if retrain_triggered:
            # Auto retrain in background
            try:
                result = retrain_model()
                # Hot reload model in memory
                model_module.model    = __import__('joblib').load(
                    str(__import__('pathlib').Path(__file__).parent.parent / "ml" / "models" / "denial_model.pkl")
                )
                model_module.explainer = __import__('shap').TreeExplainer(model_module.model)
            except Exception as retrain_err:
                # Don't fail the feedback submission if retrain fails
                print(f"Auto retrain failed: {retrain_err}")
                retrain_triggered = False

        return FeedbackResponse(
            message=f"Feedback saved. {'Retraining triggered automatically.' if retrain_triggered else f'{samples_until} more samples needed to trigger retraining.'}",
            total_feedback_collected=total,
            retraining_triggered=retrain_triggered,
            samples_until_retrain=samples_until if not retrain_triggered else 0
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback submission failed: {str(e)}")


@app.post("/retrain", response_model=RetrainResponse)
def trigger_retrain():
    """
    Manually trigger model retraining on base dataset + all feedback collected so far.
    Backs up current model before replacing it.
    Hot reloads the new model in memory — no server restart needed.
    """
    try:
        feedback_count = get_feedback_count()
        if feedback_count == 0:
            raise HTTPException(
                status_code=400,
                detail="No feedback data collected yet. Submit real claim outcomes first via /feedback."
            )

        result = retrain_model()

        # Hot reload new model into memory
        import joblib
        import shap
        from pathlib import Path

        new_model_path = Path(__file__).parent.parent / "ml" / "models" / "denial_model.pkl"
        model_module.model    = joblib.load(new_model_path)
        model_module.explainer = shap.TreeExplainer(model_module.model)

        return RetrainResponse(
            message=f"Model retrained successfully. Version: {result['version']}",
            model_version=result["version"],
            previous_accuracy=result["previous_accuracy"],
            new_accuracy=result["new_accuracy"],
            improvement=result["improvement"],
            training_samples=result["training_samples"],
            feedback_samples_used=result["feedback_samples_used"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")


@app.get("/model/status", response_model=ModelStatus)
def model_status():
    """
    Returns current model version, training data size,
    feedback collected, accuracy, and how many more samples
    are needed before the next retraining is triggered.
    """
    try:
        status = get_model_status()
        return ModelStatus(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model status failed: {str(e)}")