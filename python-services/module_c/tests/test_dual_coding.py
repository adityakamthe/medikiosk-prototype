"""
Unit tests for Native FHIR R4 Dual-Coding Engine (NAMASTE + WHO ICD-11 TM2 + SNOMED CT).
"""
import pytest
try:
    from engine.dual_coder import dual_coder, DUAL_CODING_REGISTRY
    from fhir.dual_coded_bundle import dual_coded_fhir_builder
    from schemas.synthesis_schemas import Standard8PartSummary
    from schemas.ingestion_schemas import PatientMeta
except (ImportError, ModuleNotFoundError):
    from module_c.engine.dual_coder import dual_coder, DUAL_CODING_REGISTRY
    from module_c.fhir.dual_coded_bundle import dual_coded_fhir_builder
    from module_c.schemas.synthesis_schemas import Standard8PartSummary
    from module_c.schemas.ingestion_schemas import PatientMeta


def test_dual_coding_amlapitta():
    entry = dual_coder.code_finding("Amlapitta / Severe Hyperacidity")
    assert entry is not None
    assert entry.namaste_code == "AYU-DG-0142"
    assert entry.namaste_display is not None and "Amlapitta" in entry.namaste_display
    assert entry.who_tm2_code == "TM2-SD-8812"
    assert entry.who_tm2_display is not None and "WHO TM2" in entry.who_tm2_display
    assert entry.snomed_code == "196727004"
    assert entry.icd11_mms_code == "MD90.0"


def test_dual_coding_sandhivata_osteoarthritis():
    entry = dual_coder.code_finding("Knee Osteoarthritis (Joint Pain)")
    assert entry is not None
    assert entry.namaste_code == "AYU-DG-0381"
    assert entry.who_tm2_code == "TM2-SD-4102"
    assert entry.snomed_code == "399269003"


def test_dual_coding_madhumeha_diabetes():
    entry = dual_coder.code_finding("Type 2 Diabetes Mellitus")
    assert entry is not None
    assert entry.namaste_code == "AYU-DG-0415"
    assert entry.who_tm2_code == "TM2-SD-7719"
    assert entry.snomed_code == "44054006"


def test_dual_coded_fhir_r4_bundle_generation():
    meta = PatientMeta(
        patient_id="Q-104",
        name="Sunil Kumar",
        abha_id="14-9999-8888-7777",
        gender="male"
    )
    summary = Standard8PartSummary(
        chief_complaint="Amlapitta / Hyperacidity",
        hpi="Gradual onset burning pain",
        past_medical_surgical="None",
        drug_allergy_history="None",
        family_history="Non-contributory",
        personal_social="Vegetarian",
        review_of_systems="GI symptoms present",
        prior_investigations="Pending"
    )
    entry_aml = dual_coder.code_finding("Amlapitta")
    assert entry_aml is not None
    dual_entries = [entry_aml]

    bundle = dual_coded_fhir_builder.build_bundle(
        encounter_id="ENC-FHIR-01",
        patient_meta=meta,
        summary_8_part=summary,
        dual_codings=dual_entries,
        is_attested=True
    )

    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "document"
    assert len(bundle["entry"]) >= 4

    resource_types = [e["resource"]["resourceType"] for e in bundle["entry"]]
    assert resource_types[0] == "Composition"
    assert "Patient" in resource_types
    assert "Encounter" in resource_types
    assert "Condition" in resource_types

    # Verify Condition contains concurrent NAMASTE + WHO TM2 + SNOMED codings
    cond_entry = next(e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Condition")
    codings = cond_entry["code"]["coding"]
    systems = [c["system"] for c in codings]

    assert "http://namstp.ayush.gov.in/fhir/CodeSystem/namaste" in systems
    assert "http://id.who.int/icd/release/11/mms" in systems
    assert "http://snomed.info/sct" in systems
