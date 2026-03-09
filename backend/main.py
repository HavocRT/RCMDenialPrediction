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