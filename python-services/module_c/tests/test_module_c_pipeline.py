"""
Integration test for Module C Master Pipeline Coordinator.
"""
import pytest
from coordinator import module_c_coordinator
from schemas.ingestion_schemas import (
    PatientRecordPayload,
    ChiefComplaint,
    SocratesHPI,
    ReportedAllergy,
    CurrentMedicationItem,
    MedicalItem,
    PriorInvestigationItem,
    PatientMeta
)


def test_full_module_c_synthesis_pipeline():
    payload = PatientRecordPayload(
        encounter_id="ENC-E2E-999",
        patient_meta=PatientMeta(
            patient_id="Q-99",
            name="Pooja Sharma",
            age="38",
            gender="female",
            abha_id="91-4821-9921-0012",
            preferred_language="hi",
            clinical_mode="ayurveda"
        ),
        chief_complaint=ChiefComplaint(
            verbatim="pet me jalan aur khatti dakar aati hai",
            normalized="Hyperacidity / Amlapitta",
            duration="3 weeks"
        ),
        socrates_hpi=SocratesHPI(
            site="Epigastrium",
            onset="Gradual",
            character="Burning pain",
            radiation="Retrosternal chest",
            associations=["Acid reflux", "Nausea"],
            severity="6/10"
        ),
        reported_allergies=[
            ReportedAllergy(allergen="No known drug allergies", source="speech"),
            ReportedAllergy(allergen="Penicillin anaphylaxis", source="document", doc_ref="prior_record.jpg", bbox=[100, 200, 300, 40])
        ],
        current_medications=[
            CurrentMedicationItem(name="Tab Pantocid 40mg", dose="40mg", frequency="1-0-0", source="document")
        ],
        past_history=[
            MedicalItem(condition="Gastritis", source="document", diagnosed_year=2022)
        ]
    )

    response = module_c_coordinator.process_intake(payload, is_attested=False)

    # 1. Pipeline Status & Identity
    assert response.success is True
    assert response.encounter_id == "ENC-E2E-999"
    assert response.status == "DRAFT_UNVERIFIED"

    # 2. Contradiction Interception
    assert len(response.contradictions) >= 1
    assert any(c.field == "Allergies" for c in response.contradictions)

    # 3. 8-Part Summary
    assert "Hyperacidity / Amlapitta" in response.standard_8_part.chief_complaint
    assert "Epigastrium" in response.standard_8_part.hpi
    assert "Pantocid 40mg" in response.standard_8_part.drug_allergy_history

    # 4. Ayurvedic Dashavidha Pariksha
    assert response.ayush_dashavidha is not None
    assert "Pitta" in response.ayush_dashavidha.prakriti_vikriti

    # 5. Dual Coding (NAMASTE + WHO TM2)
    assert len(response.dual_codings) >= 1
    amlapitta_code = next((dc for dc in response.dual_codings if dc.namaste_code == "AYU-DG-0142"), None)
    assert amlapitta_code is not None
    assert amlapitta_code.who_tm2_code == "TM2-SD-8812"

    # 6. Patient Audio View
    assert response.patient_audio_view.language == "hi-IN"
    assert "Pooja Sharma" in response.patient_audio_view.script
    assert response.patient_audio_view.consent_token is not None

    # 7. FHIR R4 Bundle
    assert response.fhir_bundle is not None
    assert response.fhir_bundle["resourceType"] == "Bundle"
    assert response.fhir_bundle["type"] == "document"

    # 8. Clinician Flat View for UI
    assert "chief_complaint" in response.clinician_view
    assert "hpi" in response.clinician_view
    assert "dashavidha_pariksha" in response.clinician_view
