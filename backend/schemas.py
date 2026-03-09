from pydantic import BaseModel, Field
from typing import List, Optional


# ─── Incoming claim from React ───────────────────────────────────────────────

class ClaimRequest(BaseModel):
    CompanyName: str             = Field(..., example="UnitedHealth Group")
    ClaimAmount: float           = Field(..., example=24000.0)
    ClaimDate: Optional[str]     = Field(None, example="2023-06-15")  # optional, used for ClaimYear
    DiagnosisCode: str           = Field(..., example="I25.10")
    ProcedureCode: str           = Field(..., example="70553")
    PatientAge: int              = Field(..., example=58)
    PatientGender: str           = Field(..., example="Male")
    ProviderSpecialty: str       = Field(..., example="Cardiology")
    ClaimType: str               = Field(..., example="Inpatient")
    ClaimSubmissionMethod: str   = Field(..., example="Paper")
    InsuranceStatus: str         = Field(..., example="Pending")
    PatientIncome: int           = Field(..., example=75000)
    PatientMaritalStatus: str    = Field(..., example="Married")
    PatientEmploymentStatus: str = Field(..., example="Full-Time")
    ProviderLocation: str        = Field(..., example="TX")


# ─── Individual prevention suggestion ────────────────────────────────────────

class PreventionSuggestion(BaseModel):
    feature: str
    risk_contribution: str       # e.g. "+18.3% problem risk"
    severity: str                # High / Medium / Low
    message: str                 # what the issue is
    action: str                  # what the billing team should do


# ─── Prediction response back to React ───────────────────────────────────────

class PredictionResponse(BaseModel):
    risk_score: float                              # 0-100
    risk_level: str                                # Low / Medium / High / Critical
    prevention_suggestions: List[PreventionSuggestion]
    projected_risk_if_fixed: float                 # risk score after fixing top issues
    top_risk_features: List[str]                   # top 3 feature names driving risk


# ─── Summary stats for dashboard header ──────────────────────────────────────

class SummaryStats(BaseModel):
    total_claims: int
    overall_problem_rate: float
    overall_rejection_rate: float
    avg_claim_amount: float
    top_denial_company: str
    top_denial_specialty: str


# ─── Trend data point ────────────────────────────────────────────────────────

class TrendPoint(BaseModel):
    label: str
    rejection_rate: float
    total_claims: int


# ─── Full trends response ─────────────────────────────────────────────────────

class TrendsResponse(BaseModel):
    by_company: List[TrendPoint]
    by_specialty: List[TrendPoint]
    by_claim_type: List[TrendPoint]
    by_submission_method: List[TrendPoint]
    by_location: List[TrendPoint]