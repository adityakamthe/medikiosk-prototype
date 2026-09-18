"""
Unit tests for ABDM FHIR R4 Document Bundle Generation.
"""
import pytest
try:
    from module_b.fhir.bundle_builder import fhir_builder
    from module_b.schemas.verification_schemas import (
        NormalizedMedicationItem,
        EvaluatedLabItem,
        SeverityTier
    )
except ImportError:
    from fhir.bundle_builder import fhir_builder
    from schemas.verification_schemas import (
        NormalizedMedicationItem,
        EvaluatedLabItem,
        SeverityTier
    )


def test_fhir_r4_bundle_structure():
    meds = [
        NormalizedMedicationItem(
            name="Tab Ultrafen Plus",
            brand_name="Ultrafen Plus",
            generic_name="Diclofenac Sodium + Paracetamol",
            dose="500mg",
            frequency="1-0-1",
            standardized_sig="1-0-1 After Meals",
            rxcui="209459"
        )
    ]
    labs = [
        EvaluatedLabItem(
            test_name="Hemoglobin",
            raw_test_query="hb",
            parsed_value=13.5,
            raw_value="13.5",
            unit="g/dL",
            status="NORMAL",
            flag=SeverityTier.NORMAL,
            loinc_code="718-7"
        )
    ]

    bundle = fhir_builder.build_bundle(
        session_id="SESS-12345",
        patient_name="Rahul Verma",
        abha_id="14-5555-6666-7777",
        medications=meds,
        labs=labs
    )

    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "document"
    assert "entry" in bundle
    assert len(bundle["entry"]) >= 4

    resource_types = [e["resource"]["resourceType"] for e in bundle["entry"]]
    # Entry 0 must be Composition as per FHIR Document standard
    assert resource_types[0] == "Composition"
    assert "Patient" in resource_types
    assert "Encounter" in resource_types
    assert "MedicationRequest" in resource_types
    assert "Observation" in resource_types

    # Validate Observation LOINC code
    obs_entry = next(e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Observation")
    assert obs_entry["code"]["coding"][0]["code"] == "718-7"
    assert obs_entry["valueQuantity"]["value"] == 13.5
    assert obs_entry["valueQuantity"]["unit"] == "g/dL"

    # Validate MedicationRequest RxCUI
    med_entry = next(e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "MedicationRequest")
    assert med_entry["medicationCodeableConcept"]["coding"][0]["code"] == "209459"
    assert med_entry["dosageInstruction"][0]["text"] == "1-0-1 After Meals"
