import numpy as np
from typing import List, Dict
from schemas import PreventionSuggestion


# ─── Prevention rules: feature → human readable issue + action ───────────────

PREVENTION_RULES: Dict[str, Dict] = {
    "PriorAuthRequired": {
        "message": "This procedure requires prior authorization from the payer.",
        "action": "Obtain prior authorization before submitting. Contact the payer auth line immediately.",
        "severity": "High"
    },
    "IsHighDollarClaim": {
        "message": "Claim amount exceeds payer threshold and will trigger manual review.",
        "action": "Attach medical necessity letter, operative notes, and physician justification proactively.",
        "severity": "High"
    },
    "ICDCPTMismatch": {
        "message": "Diagnosis code may not support the medical necessity of the procedure billed.",
        "action": "Review with coder — ensure ICD-10 diagnosis correctly aligns with the CPT procedure code.",
        "severity": "High"
    },
    "InsuranceStatus": {
        "message": "Patient insurance status is not fully approved.",
        "action": "Verify active patient coverage and eligibility with the payer before submitting.",
        "severity": "High"
    },
    "ClaimSubmissionMethod": {
        "message": "Non-electronic submissions have significantly higher processing error and rejection rates.",
        "action": "Switch to electronic submission via clearinghouse or payer portal.",
        "severity": "Medium"
    },
    "CompanyProblemRate": {
        "message": "This payer has a historically elevated rejection rate for similar claims.",
        "action": "Review payer-specific documentation requirements and coverage policies before submitting.",
        "severity": "Medium"
    },
    "SpecialtyProblemRate": {
        "message": "Claims from this specialty have an elevated historical rejection rate.",
        "action": "Double-check all specialty-specific billing requirements, modifiers, and bundling rules.",
        "severity": "Medium"
    },
    "DiagnosisProblemRate": {
        "message": "Claims with this diagnosis code are frequently rejected by payers.",
        "action": "Attach supporting clinical documentation and ensure diagnosis is fully documented in the chart.",
        "severity": "Medium"
    },
    "ProcedureProblemRate": {
        "message": "This procedure code has a historically high rejection rate.",
        "action": "Verify procedure is covered under the patient plan and attach medical necessity documentation.",
        "severity": "Medium"
    },
    "ClaimTypeProblemRate": {
        "message": "This claim type has a higher than average rejection rate.",
        "action": "Review claim type classification — ensure it is correctly categorized for this payer.",
        "severity": "Medium"
    },
    "ClaimAmountVsSpecialtyAvg": {
        "message": "Claim amount is significantly above the average for this specialty.",
        "action": "Ensure all charges are itemized and each line item is supported by documentation.",
        "severity": "Low"
    },
    "CompositeRiskScore": {
        "message": "Multiple risk factors detected on this claim simultaneously.",
        "action": "Address all high and medium severity issues listed above before submitting.",
        "severity": "High"
    },
    "LocationProblemRate": {
        "message": "This provider location has an elevated rejection rate with this payer.",
        "action": "Check for any state-specific coverage restrictions or network issues.",
        "severity": "Low"
    },
    "DiagnosisCategory": {
        "message": "Claims in this diagnosis category have an elevated rejection rate.",
        "action": "Ensure diagnosis is fully documented and supported by clinical notes in the patient chart.",
        "severity": "Medium"
    },
    "DaysSinceEarliestClaim": {
        "message": "Claim has been in the system for an extended period without submission.",
        "action": "Review and submit promptly — delayed submissions face higher rejection risk.",
        "severity": "Medium"
    }
}


def get_prevention_suggestions(
    shap_values,
    feature_names: list,
    threshold: float = 0.01
) -> List[PreventionSuggestion]:
    """
    Convert SHAP values into ranked human-readable prevention suggestions.

    Uses absolute SHAP value — any feature with strong impact in either
    direction is flagged as a denial risk contributor.
    """
    suggestions = []

    # Flatten to 1D array of plain Python floats
    # SHAP can return 2D arrays depending on model type and version
    shap_flat = np.array(shap_values).flatten().tolist()

    for feat, shap_val in zip(feature_names, shap_flat):
        shap_scalar = float(shap_val)
        # Use abs() — flag any feature with meaningful impact
        if abs(shap_scalar) > threshold and feat in PREVENTION_RULES:
            rule = PREVENTION_RULES[feat]
            contribution = abs(round(shap_scalar * 100, 1))
            suggestions.append(PreventionSuggestion(
                feature=feat,
                risk_contribution=f"+{contribution}% problem risk",
                severity=rule["severity"],
                message=rule["message"],
                action=rule["action"]
            ))

    # Sort by highest risk contribution first
    suggestions.sort(
        key=lambda x: float(x.risk_contribution.replace("+", "").replace("% problem risk", "")),
        reverse=True
    )

    return suggestions


def get_top_risk_features(shap_values, feature_names: list, top_n: int = 3) -> List[str]:
    """Return names of top N features driving denial risk."""
    # Flatten to 1D
    shap_flat = np.array(shap_values).flatten().tolist()

    pairs = sorted(
        zip(feature_names, shap_flat),
        key=lambda x: float(x[1])  # most negative = highest denial risk
    )
    return [feat for feat, _ in pairs[:top_n]]