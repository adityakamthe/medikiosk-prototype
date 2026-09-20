"""
Integration test for PipelineCoordinator in MediKiosk Module B.
"""
import pytest
import numpy as np
import cv2

try:
    from module_b.coordinator import pipeline_coordinator
    from module_b.schemas.intake_schemas import (
        DocumentIntakePayload,
        DocumentMetadata,
        ExtractedMedication,
        ExtractedLabResult
    )
    from module_b.schemas.verification_schemas import VerificationReport, VerificationActionGate
except ImportError:
    from coordinator import pipeline_coordinator
    from schemas.intake_schemas import (
        DocumentIntakePayload,
        DocumentMetadata,
        ExtractedMedication,
        ExtractedLabResult
    )
    from schemas.verification_schemas import VerificationReport, VerificationActionGate


def test_end_to_end_coordinator_pipeline():
    # Generate synthetic prescription image
    img = np.ones((400, 600, 3), dtype=np.uint8) * 255
    cv2.putText(img, "Prescription", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img, "Tab Ultrafen Plus 1-0-1", (50, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "Cap Doxycycline 100mg", (50, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "Tab Shelcal 500mg", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    _, enc_img = cv2.imencode(".jpg", img)

    # Prepare intake payload
    payload = DocumentIntakePayload(
        metadata=DocumentMetadata(
            session_id="SESS-INT-001",
            patient_name="Pooja Sharma",
            document_type="prescription",
            verbal_transcription="Patient was prescribed Ultrafen Plus with Doxycycline and Shelcal"
        ),
        medications=[
            ExtractedMedication(
                name="Ultrafen plus",
                raw_text="Ultrafen plus",
                dosage="500mg",
                frequency="১+০+১ খাওয়ার পর"  # Bengali sig
            ),
            ExtractedMedication(
                name="Doxycycline",
                raw_text="Doxycycline",
                dosage="100mg",
                frequency="1-0-0"
            ),
            ExtractedMedication(
                name="Shelcal",
                raw_text="Shelcal",
                dosage="500mg",
                frequency="0-0-1"
            )
        ],
        labs=[
            ExtractedLabResult(
                name="Hemoglobin",
                test_name="Hemoglobin",
                raw_value="6.2",  # Critical panic low
                value="6.2",
                unit="g/dL"
            )
        ]
    )

    report: VerificationReport = pipeline_coordinator.run_pipeline(
        image_bytes=enc_img.tobytes(),
        intake_payload=payload
    )

    # Verify overall report integrity
    assert report.session_id == "SESS-INT-001"
    assert report.confidence_tier in ["high", "ambiguous"]
    assert len(report.medications) == 3
    assert len(report.labs) == 1

    # Verify Bengali sig translation
    ultrafen = next(m for m in report.medications if "ultrafen" in m.name.lower())
    assert ultrafen.standardized_sig == "1-0-1 After Meals"
    assert ultrafen.generic_name is not None and "Diclofenac" in ultrafen.generic_name
    assert ultrafen.action_gate == VerificationActionGate.AUTO_APPROVED

    # Verify Lab Panic detection
    hb_lab = report.labs[0]
    assert hb_lab.is_panic is True
    assert hb_lab.loinc_code == "718-7"

    # Verify Safety alerts:
    # 1. GASTROPROTECTION_OMISSION (Ultrafen without PPI)
    # 2. DRUG_INTERACTION (Doxycycline + Shelcal chelation)
    # 3. CRITICAL_LAB_PANIC (Hb < 7.0)
    assert report.has_critical_alerts is True
    alert_types = [a.type for a in report.alerts]
    assert "GASTROPROTECTION_OMISSION" in alert_types
    assert "DRUG_INTERACTION" in alert_types
    assert "CRITICAL_LAB_PANIC" in alert_types
    assert report.gastroprotection_status == "AT_RISK"

    # Verify ABDM FHIR R4 Bundle
    assert report.fhir_bundle is not None
    assert report.fhir_bundle["resourceType"] == "Bundle"
    assert report.fhir_bundle["type"] == "document"
