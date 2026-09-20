"""
Unit Tests for Module D Standalone FastAPI Microservice Endpoints:
POST /api/v1/auth/abha/verify -> Mock M1 verification
POST /api/v1/consent/artifact -> Generate DPDP consent artifact
POST /api/v1/his/push -> Push attested FHIR bundle to HIS with idempotency
POST /api/v1/privacy/purge -> Trigger ephemeral session wipe
POST /api/v1/abdm/fidelius/encrypt -> Demonstrate payload encryption
"""

import pytest
from fastapi.testclient import TestClient

from module_d.main import app
from module_d.privacy.crypto_fidelius import fidelius_crypto


@pytest.fixture
def client():
    return TestClient(app)


def test_endpoint_health(client):
    """Verify health endpoint."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "Fidelius" in data["crypto"]


def test_endpoint_mock_m1_verification(client):
    """POST /api/v1/auth/abha/verify -> Mock M1 verification."""
    # 1. Generate OTP
    otp_gen = client.post("/api/v1/auth/abha/otp/generate", json={
        "auth_mode": "MOBILE_OTP",
        "identifier": "9876543210"
    })
    assert otp_gen.status_code == 200
    tx_id = otp_gen.json()["transaction_id"]

    # 2. Verify with standard demo OTP '123456'
    verify_resp = client.post("/api/v1/auth/abha/verify", json={
        "transaction_id": tx_id,
        "otp": "123456",
        "abha_id": "91-4582-7391-0428"
    })
    assert verify_resp.status_code == 200
    auth_data = verify_resp.json()
    assert auth_data["token_type"] == "Bearer"
    assert len(auth_data["access_token"]) > 20
    assert auth_data["patient"]["abha_id"] == "91-4582-7391-0428"


def test_endpoint_consent_artifact_generation(client):
    """POST /api/v1/consent/artifact -> Generate DPDP consent artifact."""
    resp = client.post("/api/v1/consent/artifact", json={
        "session_id": "SES-API-TEST-001",
        "patient_id": "PAT-999",
        "abha_id": "91-4582-7391-0428",
        "granted_purposes": ["CARE_INTAKE", "DOCTOR_CONSULTATION"],
        "language": "hi",
        "method": "TOUCH"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"] == "SES-API-TEST-001"
    assert data["is_active"] is True
    assert data["dataEraseAt"] is not None
    assert len(data["sha256_signature"]) == 64


def test_endpoint_his_push_idempotent(client):
    """POST /api/v1/his/push -> Push attested FHIR bundle to HIS with idempotency."""
    dummy_bundle = {
        "resourceType": "Bundle",
        "type": "document",
        "entry": [
            {
                "resource": {
                    "resourceType": "Composition",
                    "id": "comp-api-01",
                    "status": "final"
                }
            },
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "pat-api-01",
                    "name": [{"text": "Amitabh Sharma"}]
                }
            }
        ]
    }

    resp = client.post("/api/v1/his/push", json={
        "session_id": "SES-HIS-001",
        "idempotency_key": "IDEM-API-KEY-001",
        "bundle": dummy_bundle,
        "target_system": "EMULATOR"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["validation_passed"] is True
    assert data["idempotency_key"] == "IDEM-API-KEY-001"

    # Duplicate transmission with same key returns duplicate response
    dup_resp = client.post("/api/v1/his/push", json={
        "session_id": "SES-HIS-001",
        "idempotency_key": "IDEM-API-KEY-001",
        "bundle": dummy_bundle,
        "target_system": "EMULATOR"
    })
    assert dup_resp.status_code == 200
    assert dup_resp.json()["is_duplicate"] is True


def test_endpoint_privacy_purge(client):
    """POST /api/v1/privacy/purge -> Trigger ephemeral session wipe."""
    from module_d.privacy.session_cleaner import session_cleaner

    session_id = "SES-PURGE-API-001"
    session_cleaner.register_ephemeral_file(session_id, "ocr_crop.png", b"IMAGE-RAW-DATA" * 50)

    resp = client.post("/api/v1/privacy/purge", json={"session_id": session_id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PURGED"
    assert data["bytes_retained"] == 0
    assert data["success"] is True


def test_endpoint_fidelius_encryption(client):
    """POST /api/v1/abdm/fidelius/encrypt -> Demonstrate payload encryption."""
    _, _, _, receiver_pub_b64 = fidelius_crypto.generate_keypair()

    resp = client.post("/api/v1/abdm/fidelius/encrypt", json={
        "payload": {"diagnosis": "Hypertension", "prescription": "Amlodipine 5mg"},
        "receiver_public_key_b64": receiver_pub_b64
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "encrypted_data_b64" in data
    assert "auth_tag_b64" in data
    assert "nonce_b64" in data
    assert "salt_b64" in data
    assert "sender_public_key_b64" in data
