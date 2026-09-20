"""
Unit Tests for HIS / OpenMRS Connector and Idempotent FHIR Forwarding in Module D.
"""

import uuid

import pytest

from module_d.his.fhir_connector import fhir_connector
from module_d.his.idempotency import idempotency_manager
from module_d.schemas.his_schemas import FHIRBundlePushRequest


@pytest.fixture(autouse=True)
def clean_idempotency_store():
    idempotency_manager.clear()
    yield
    idempotency_manager.clear()


def make_valid_nrces_bundle(session_id: str) -> dict:
    """Helper to generate a minimal NRCeS-compliant FHIR R4 document bundle."""
    return {
        "resourceType": "Bundle",
        "id": f"bundle-{session_id}",
        "type": "document",
        "timestamp": "2026-09-18T10:00:00Z",
        "entry": [
            {
                "fullUrl": "urn:uuid:composition-01",
                "resource": {
                    "resourceType": "Composition",
                    "id": "composition-01",
                    "status": "final",
                    "type": {
                        "coding": [{"system": "http://loinc.org", "code": "11488-4", "display": "Consultation Note"}]
                    },
                    "title": "OPD Consultation Record"
                }
            },
            {
                "fullUrl": "urn:uuid:patient-01",
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-01",
                    "name": [{"text": "Rahul Sharma"}],
                    "gender": "male",
                    "birthDate": "1988-06-15"
                }
            }
        ]
    }


@pytest.mark.asyncio
async def test_nrces_bundle_validation_success():
    """Verify that a compliant bundle passes NRCeS validation."""
    bundle = make_valid_nrces_bundle("sess-1")
    is_valid, errors = fhir_connector.validate_nrces_bundle(bundle)
    assert is_valid is True
    assert len(errors) == 0


@pytest.mark.asyncio
async def test_nrces_bundle_validation_rejections():
    """Verify that invalid bundles (wrong type, missing Composition, missing Patient) are rejected."""
    # 1. Non-document type
    bundle1 = {"resourceType": "Bundle", "type": "collection", "entry": []}
    valid1, err1 = fhir_connector.validate_nrces_bundle(bundle1)
    assert valid1 is False
    assert any("must be 'document'" in e for e in err1)

    # 2. First resource is not Composition
    bundle2 = {
        "resourceType": "Bundle",
        "type": "document",
        "entry": [{"resource": {"resourceType": "Observation"}}]
    }
    valid2, err2 = fhir_connector.validate_nrces_bundle(bundle2)
    assert valid2 is False
    assert any("Composition" in e for e in err2)

    # 3. Missing Patient
    bundle3 = {
        "resourceType": "Bundle",
        "type": "document",
        "entry": [{"resource": {"resourceType": "Composition"}}]
    }
    valid3, err3 = fhir_connector.validate_nrces_bundle(bundle3)
    assert valid3 is False
    assert any("Patient" in e for e in err3)


@pytest.mark.asyncio
async def test_idempotent_fhir_push():
    """Verify that first push succeeds and second push with identical key returns cached duplicate."""
    session_id = str(uuid.uuid4())
    idempotency_key = str(uuid.uuid4())
    bundle = make_valid_nrces_bundle(session_id)

    req = FHIRBundlePushRequest(
        session_id=session_id,
        idempotency_key=idempotency_key,
        bundle=bundle,
        target_system="EMULATOR"
    )

    # 1. First push
    res1 = await fhir_connector.push_bundle(req)
    assert res1.status in ["SUCCESS", "SUCCESS_FALLBACK"]
    assert res1.is_duplicate is False
    assert res1.validation_passed is True
    assert res1.remote_fhir_id is not None

    # 2. Re-transmitting identical request
    res2 = await fhir_connector.push_bundle(req)
    assert res2.status == "DUPLICATE_SUBMISSION"
    assert res2.is_duplicate is True
    assert res2.remote_fhir_id == res1.remote_fhir_id  # Returns identical remote ID without creating duplicate!


@pytest.mark.asyncio
async def test_idempotency_payload_conflict():
    """Verify that reusing the same key with differing payload triggers a conflict error."""
    idempotency_key = str(uuid.uuid4())
    bundle_a = make_valid_nrces_bundle("sess-a")
    bundle_b = make_valid_nrces_bundle("sess-b")

    req1 = FHIRBundlePushRequest(session_id="sess-a", idempotency_key=idempotency_key, bundle=bundle_a)
    await fhir_connector.push_bundle(req1)

    req2 = FHIRBundlePushRequest(session_id="sess-b", idempotency_key=idempotency_key, bundle=bundle_b)
    res2 = await fhir_connector.push_bundle(req2)
    assert res2.status == "CONFLICT"
    assert res2.http_status == 409
