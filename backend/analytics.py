import pandas as pd
import numpy as np
from pathlib import Path
from schemas import SummaryStats, TrendsResponse, TrendPoint

# ─── Load dataset once for analytics endpoints ────────────────────────────────
DATA_PATH = Path(__file__).parent.parent / "ml" / "data" / "dataset_featured.csv"

_df = None

def _get_df() -> pd.DataFrame:
    """Lazy load dataset — only read from disk once."""
    global _df
    if _df is None:
        _df = pd.read_csv(DATA_PATH)
    return _df


# ─── Summary stats ────────────────────────────────────────────────────────────

def get_summary() -> SummaryStats:
    df = _get_df()

    total        = len(df)
    problem_rate = round(float((df["ClaimOutcome"] == 0).mean() * 100), 1)
    avg_amount   = round(float(df["ClaimAmount"].mean()), 2)

    # Use ClaimStatus if saved in featured CSV, else approximate from ClaimOutcome
    if "ClaimStatus" in df.columns:
        rejection_rate = round(float((df["ClaimStatus"] == "Rejected").mean() * 100), 1)
    else:
        # Approximate: problem claims = Rejected + Pending + In Review equally split
        rejection_rate = round(float(problem_rate / 3), 1)

    # Top denial company
    top_company = (
        df.groupby("CompanyName")["ClaimOutcome"]
        .apply(lambda x: (x == 0).mean())
        .idxmax()
    )

    # Top denial specialty
    top_specialty = (
        df.groupby("ProviderSpecialty")["ClaimOutcome"]
        .apply(lambda x: (x == 0).mean())
        .idxmax()
    )

    return SummaryStats(
        total_claims=total,
        overall_problem_rate=problem_rate,
        overall_rejection_rate=rejection_rate,
        avg_claim_amount=avg_amount,
        top_denial_company=top_company,
        top_denial_specialty=top_specialty
    )


# ─── Trend helpers ────────────────────────────────────────────────────────────

def _build_trend(df: pd.DataFrame, group_col: str) -> list:
    """Build TrendPoint list for a given grouping column.
    Uses ClaimStatus=Rejected if available, else falls back to ClaimOutcome.
    """
    has_claim_status = "ClaimStatus" in df.columns

    result = []
    for label, group in df.groupby(group_col):
        if has_claim_status:
            rate = round(float((group["ClaimStatus"] == "Rejected").mean() * 100), 1)
        else:
            # Approximate: divide problem rate by 3 (Rejected ~1/3 of problem claims)
            rate = round(float((group["ClaimOutcome"] == 0).mean() * 100 / 3), 1)
        result.append(TrendPoint(
            label=str(label),
            rejection_rate=rate,
            total_claims=int(len(group))
        ))

    result.sort(key=lambda x: x.rejection_rate, reverse=True)
    return result


# ─── Trends ───────────────────────────────────────────────────────────────────

def get_trends() -> TrendsResponse:
    df = _get_df()
    return TrendsResponse(
        by_company=_build_trend(df, "CompanyName"),
        by_specialty=_build_trend(df, "ProviderSpecialty"),
        by_claim_type=_build_trend(df, "ClaimType"),
        by_submission_method=_build_trend(df, "ClaimSubmissionMethod"),
        by_location=_build_trend(df, "ProviderLocation")
    )


# ─── Monthly trend (for time series chart) ───────────────────────────────────

def get_monthly_trend() -> list:
    """Returns monthly rejection rate over time for the line chart."""
    df = _get_df().copy()
    has_claim_status = "ClaimStatus" in df.columns

    def _rate(group):
        if has_claim_status:
            return round(float((group["ClaimStatus"] == "Rejected").mean() * 100), 1)
        return round(float((group["ClaimOutcome"] == 0).mean() * 100 / 3), 1)

    if "ClaimDate" not in df.columns and "ClaimYear" in df.columns:
        result = []
        for year, group in df.groupby("ClaimYear"):
            result.append({
                "label": str(int(year)),
                "rejection_rate": _rate(group),
                "total_claims": int(len(group))
            })
        return result

    df["ClaimDate"] = pd.to_datetime(df["ClaimDate"])
    df["YearMonth"] = df["ClaimDate"].dt.to_period("M").astype(str)

    result = []
    for ym, group in df.groupby("YearMonth"):
        result.append({
            "label": str(ym),
            "rejection_rate": _rate(group),
            "total_claims": int(len(group))
        })
    return result


# ─── High risk claims list (for dashboard queue) ─────────────────────────────

def get_high_risk_claims(limit: int = 20) -> list:
    """
    Return top N highest-risk claims from the dataset.
    In production these would be unsubmitted claims — here we use
    problem claims from the dataset as a demo queue.
    """
    df = _get_df()
    problem_claims = df[df["ClaimOutcome"] == 0].copy()

    # Proxy risk score: use composite risk score if available
    if "CompositeRiskScore" in problem_claims.columns:
        problem_claims = problem_claims.sort_values("CompositeRiskScore", ascending=False)

    top = problem_claims.head(limit)

    result = []
    for _, row in top.iterrows():
        result.append({
            "company":    row.get("CompanyName", "Unknown"),
            "specialty":  row.get("ProviderSpecialty", "Unknown"),
            "claim_type": row.get("ClaimType", "Unknown"),
            "amount":     round(float(row.get("ClaimAmount", 0)), 2),
            "risk_flags": int(row.get("CompositeRiskScore", 0)),
        })

    return result