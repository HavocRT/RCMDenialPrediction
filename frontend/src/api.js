// frontend/src/api.js
const BASE_URL = "http://localhost:8000";

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function predictClaim(formData) {
  const payload = {
    CompanyName:              formData.company      || "",
    ClaimAmount:              parseFloat(formData.claimAmount) || 0,
    ClaimDate:                formData.claimDate    || null,
    DiagnosisCode:            formData.diagCode     || "",
    ProcedureCode:            formData.procCode     || "",
    PatientAge:               parseInt(formData.age)|| 0,
    PatientGender:            formData.gender       || "",
    ProviderSpecialty:        formData.specialty    || "",
    ClaimType:                formData.claimType    || "",
    ClaimSubmissionMethod:    formData.submission   || "",
    InsuranceStatus:          "Pending",
    PatientIncome:            parseInt(formData.income) || 0,
    PatientMaritalStatus:     formData.marital      || "",
    PatientEmploymentStatus:  formData.employment   || "",
    ProviderLocation:         formData.location     || "",
  };

  const res = await fetch(`${BASE_URL}/predict`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error ${res.status}`);
  }

  return res.json();
}
