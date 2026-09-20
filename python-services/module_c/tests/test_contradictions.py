"""
Unit tests for Module C Contradiction Interception Engine.
"""
try:
    from engine.contradiction_engine import contradiction_engine
    from schemas.ingestion_schemas import (
        ChiefComplaint,
        CurrentMedicationItem,
        MedicalItem,
        PatientRecordPayload,
        PriorInvestigationItem,
        ReportedAllergy,
    )
except (ImportError, ModuleNotFoundError):
    from module_c.engine.contradiction_engine import contradiction_engine
    from module_c.schemas.ingestion_schemas import (
        ChiefComplaint,
        CurrentMedicationItem,
        MedicalItem,
        PatientRecordPayload,
        PriorInvestigationItem,
        ReportedAllergy,
    )


def test_allergy_contradiction_speech_denial_vs_document():
    payload = PatientRecordPayload(
        encounter_id="ENC-TEST-001",
        chief_complaint=ChiefComplaint(
            verbatim="pet me jalan hai",
            normalized="Hyperacidity / Reflux",
            duration="5 days"
        ),
        reported_allergies=[
            ReportedAllergy(
                allergen="No known drug allergies",
                source="speech"
            ),
            ReportedAllergy(
                allergen="Severe Penicillin Anaphylaxis",
                reaction="Facial angioedema and hypotension",
                source="document",
                doc_ref="discharge_summary_2021.jpg",
                bbox=[120, 340, 280, 45]
            )
        ]
    )

    conflicts = contradiction_engine.detect_contradictions(payload)
    assert len(conflicts) >= 1

    alg_conflict = next(c for c in conflicts if c.field == "Allergies")
    assert alg_conflict.severity == "CRITICAL"
    assert "No known drug allergies" in alg_conflict.speech_claim
    assert "Penicillin" in alg_conflict.document_claim
    assert alg_conflict.bbox == [120, 340, 280, 45]
    assert len(alg_conflict.resolution_options) >= 2


def test_allergy_medication_cross_conflict():
    payload = PatientRecordPayload(
        encounter_id="ENC-TEST-002",
        chief_complaint=ChiefComplaint(
            verbatim="cough and fever",
            normalized="Acute Respiratory Infection",
            duration="2 days"
        ),
        reported_allergies=[
            ReportedAllergy(
                allergen="Penicillin allergy",
                source="document"
            )
        ],
        current_medications=[
            CurrentMedicationItem(
                name="Tab Amoxicillin 500mg",
                dose="500mg",
                frequency="1-0-1",
                source="document",
                doc_ref="prescription_scan_today.jpg"
            )
        ]
    )

    conflicts = contradiction_engine.detect_contradictions(payload)
    assert any("Allergy-Medication" in c.field for c in conflicts)
    med_conflict = next(c for c in conflicts if "Allergy-Medication" in c.field)
    assert med_conflict.severity == "CRITICAL"


def test_medication_verbal_denial_vs_document():
    payload = PatientRecordPayload(
        encounter_id="ENC-TEST-003",
        chief_complaint=ChiefComplaint(
            verbatim="checkup",
            normalized="Routine Health Review",
            duration="1 day"
        ),
        current_medications=[
            CurrentMedicationItem(
                name="No medicines taken",
                source="speech"
            ),
            CurrentMedicationItem(
                name="Tab Metformin 500mg",
                dose="500mg",
                frequency="1-0-1",
                source="document",
                doc_ref="opd_card_august.jpg"
            )
        ]
    )

    conflicts = contradiction_engine.detect_contradictions(payload)
    assert any(c.field == "Current Medications" for c in conflicts)
    med_conflict = next(c for c in conflicts if c.field == "Current Medications")
    assert med_conflict.severity == "HIGH"
    assert "Metformin" in med_conflict.document_claim


def test_prior_lab_glycemia_vs_verbal_denial():
    payload = PatientRecordPayload(
        encounter_id="ENC-TEST-004",
        chief_complaint=ChiefComplaint(
            verbatim="fatigue",
            normalized="General Malaise",
            duration="2 weeks"
        ),
        past_history=[
            MedicalItem(
                condition="No diabetes history",
                source="patient"
            )
        ],
        prior_investigations=[
            PriorInvestigationItem(
                test_name="HbA1c Glycated Hemoglobin",
                result_value="9.4",
                unit="%",
                reference_range="4.0 - 5.6 %",
                status="ABNORMAL",
                doc_ref="lab_report_recent.jpg"
            )
        ]
    )

    conflicts = contradiction_engine.detect_contradictions(payload)
    assert any("Diagnostic Investigations" in c.field for c in conflicts)
    lab_conflict = next(c for c in conflicts if "Diagnostic Investigations" in c.field)
    assert "9.4" in lab_conflict.document_claim
