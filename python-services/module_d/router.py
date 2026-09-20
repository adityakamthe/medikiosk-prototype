"""
Master FastAPI APIRouter for MediKiosk Module D.
Exposes Consent, Privacy, HIS Connector, and ABDM Simulator endpoints.
Supports both standard REST and specific /api/v1/* technical specification routes.
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .config import settings
from .consent.dpdp_manager import dpdp_manager
from .consent.voice_notice import generate_vernacular_audio_notice
from .his.fhir_connector import fhir_connector
from .his.openmrs_client import openmrs_client
from .privacy.crypto_fidelius import fidelius_crypto
from .privacy.session_cleaner import session_cleaner
from .schemas.auth_schemas import (
    AbhaQRScanRequest,
    AbhaQRScanResponse,
    AuthTokenResponse,
    OTPGenerateRequest,
    OTPGenerateResponse,
    OTPVerifyRequest,
)
from .schemas.consent_schemas import (
    ConsentArtifact,
    ConsentArtifactCreate,
    ConsentNoticeResponse,
    ConsentPurpose,
    ConsentRevokeRequest,
    ConsentRevokeResponse,
    ConsentVerifyResponse,
)
from .schemas.his_schemas import FHIRBundlePushRequest, FHIRBundlePushResponse
from .simulator.abdm_m1_mock import abdm_m1_mock

router = APIRouter(tags=["Module D: Consent, Privacy, HIS & ABDM"])


# --- HEALTH & STATUS ---
@router.get("/health")
@router.get("/api/v1/health")
def module_d_health():
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "dpdp_standard": settings.DPDP_NOTICE_VERSION,
        "crypto": "Curve25519-ECDH-AES-256-GCM (Fidelius)",
        "his_mode": "MOCK_EMULATOR" if settings.USE_MOCK_HIS else "LIVE_OPENMRS"
    }


# =====================================================================
# 1. DPDP ACT 2023 CONSENT ENDPOINTS
# =====================================================================

@router.get("/consent/notice", response_model=ConsentNoticeResponse)
@router.get("/api/v1/consent/notice", response_model=ConsentNoticeResponse)
def get_consent_notice(language: str = Query(default="hi", description="BCP-47 language code")):
    """Get itemized DPDP v5.0 consent notice in patient's preferred language."""
    return dpdp_manager.generate_notice(language=language)


@router.post("/consent/voice-notice")
@router.get("/consent/voice-notice")
@router.post("/api/v1/consent/voice-notice")
def get_voice_consent_notice(language: str = Query(default="hi")):
    """Get vernacular spoken script and audio stream descriptor."""
    return generate_vernacular_audio_notice(language=language)


@router.post("/consent/grant", response_model=ConsentArtifact)
@router.post("/consent/artifact", response_model=ConsentArtifact)
@router.post("/api/v1/consent/artifact", response_model=ConsentArtifact)
def generate_consent_artifact(payload: ConsentArtifactCreate):
    """
    Generate and capture a DPDP v5.0 cryptographically signed JSON consent artifact
    with dataEraseAt timestamp (default: 120 minutes) and affirmative purpose binding.
    """
    return dpdp_manager.capture_consent(payload)


@router.get("/consent/verify/{session_id}", response_model=ConsentVerifyResponse)
@router.get("/api/v1/consent/verify/{session_id}", response_model=ConsentVerifyResponse)
def verify_session_consent(session_id: str, purpose: ConsentPurpose | None = None):
    """Verify validity and scope of consent for a session."""
    return dpdp_manager.verify_consent(session_id=session_id, required_purpose=purpose)


@router.post("/consent/revoke", response_model=ConsentRevokeResponse)
@router.post("/api/v1/consent/revoke", response_model=ConsentRevokeResponse)
def revoke_consent(payload: ConsentRevokeRequest):
    """Revoke consent and trigger zero-byte memory purge."""
    return dpdp_manager.revoke_consent(payload)


# =====================================================================
# 2. SESSION EPHEMERALITY & MEMORY WIPING
# =====================================================================

class PurgeRequest(BaseModel):
    session_id: str = Field(..., description="Active session ID to shred and purge")


@router.post("/privacy/purge")
@router.post("/api/v1/privacy/purge")
def trigger_session_purge(req: PurgeRequest):
    """
    Trigger ephemeral session memory wipe and multi-pass cryptographic file shredding.
    Returns verification payload: {"status": "PURGED", "bytes_retained": 0}.
    """
    res = session_cleaner.purge_session(req.session_id)
    if not res["success"]:
        raise HTTPException(status_code=500, detail="Failed to purge ephemeral memory completely")
    return res


@router.post("/privacy/purge/{session_id}")
def purge_session_memory_by_path(session_id: str):
    """Path-param variant for purging session memory."""
    res = session_cleaner.purge_session(session_id)
    if not res["success"]:
        raise HTTPException(status_code=500, detail="Failed to purge ephemeral memory completely")
    return res


# =====================================================================
# 3. HIS CLIENT & OPENMRS FHIR BRIDGE
# =====================================================================

@router.get("/his/patient-lookup")
@router.get("/api/v1/his/patient-lookup")
async def lookup_his_patient(identifier: str = Query(..., description="ABHA Number or National ID")):
    """Lookup patient in OpenMRS / Bahmni database."""
    patient = await openmrs_client.lookup_patient(identifier)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found in HIS")
    return {"success": True, "patient": patient}


@router.post("/his/push", response_model=FHIRBundlePushResponse)
@router.post("/his/push-fhir", response_model=FHIRBundlePushResponse)
@router.post("/api/v1/his/push", response_model=FHIRBundlePushResponse)
async def push_attested_fhir_bundle(req: FHIRBundlePushRequest):
    """
    Idempotently validate and push attested NRCeS FHIR R4 document bundle to OpenMRS / HAPI-FHIR.
    Enforces X-MediKiosk-Idempotency-Key handling to eliminate duplicate transmissions.
    """
    return await fhir_connector.push_bundle(req)


# =====================================================================
# 4. ZERO-SANDBOX ABDM SIMULATION & FIDELIUS CRYPTOGRAPHY
# =====================================================================

# --- ABDM M1 AUTH SIMULATOR ---
@router.post("/abdm/m1/scan-qr", response_model=AbhaQRScanResponse)
@router.post("/api/v1/auth/abha/scan-qr", response_model=AbhaQRScanResponse)
def scan_abha_qr(req: AbhaQRScanRequest):
    """Parse ABHA QR Code and extract verified demographics."""
    return abdm_m1_mock.parse_qr_code(req.raw_payload)


@router.post("/abdm/m1/otp/generate", response_model=OTPGenerateResponse)
@router.post("/api/v1/auth/abha/otp/generate", response_model=OTPGenerateResponse)
def generate_abha_otp(req: OTPGenerateRequest):
    """Initiate M1 OTP authentication transaction."""
    return abdm_m1_mock.generate_otp(req)


@router.post("/abdm/m1/otp/verify", response_model=AuthTokenResponse)
@router.post("/auth/abha/verify", response_model=AuthTokenResponse)
@router.post("/api/v1/auth/abha/verify", response_model=AuthTokenResponse)
def verify_abha_otp(req: OTPVerifyRequest):
    """Verify 6-digit OTP (demo: '123456') and issue standard ABHA tokens."""
    try:
        return abdm_m1_mock.verify_otp(req)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# --- FIDELIUS CRYPTOGRAPHY DEMO ---
class KeypairResponse(BaseModel):
    public_key_b64: str
    private_key_b64: str


@router.post("/crypto/fidelius/keypair", response_model=KeypairResponse)
@router.post("/api/v1/abdm/fidelius/keypair", response_model=KeypairResponse)
def generate_fidelius_keypair():
    """Generate ephemeral Curve25519 (X25519) keypair."""
    _, _, priv_b64, pub_b64 = fidelius_crypto.generate_keypair()
    return KeypairResponse(public_key_b64=pub_b64, private_key_b64=priv_b64)


class EncryptPayloadRequest(BaseModel):
    payload: Any = Field(..., description="Arbitrary clinical JSON or text data")
    receiver_public_key_b64: str = Field(..., description="Base64 encoded Curve25519 public key of recipient")
    sender_private_key_b64: str | None = Field(None, description="Optional sender private key for deterministic test derivation")


@router.post("/crypto/fidelius/encrypt")
@router.post("/abdm/fidelius/encrypt")
@router.post("/api/v1/abdm/fidelius/encrypt")
def encrypt_clinical_payload(req: EncryptPayloadRequest):
    """
    Encrypt clinical payload using Curve25519 ECDH shared secret + HKDF/SHA-256 + AES-256-GCM.
    Demonstrates zero-knowledge end-to-end encryption across ABDM intermediary gateway.
    """
    return fidelius_crypto.encrypt_payload(
        payload_data=req.payload,
        receiver_public_key_b64=req.receiver_public_key_b64,
        sender_private_key_b64=req.sender_private_key_b64
    )


class DecryptPayloadRequest(BaseModel):
    encrypted_data_b64: str
    auth_tag_b64: str
    nonce_b64: str
    salt_b64: str
    sender_public_key_b64: str
    receiver_private_key_b64: str


@router.post("/crypto/fidelius/decrypt")
@router.post("/abdm/fidelius/decrypt")
@router.post("/api/v1/abdm/fidelius/decrypt")
def decrypt_clinical_payload(req: DecryptPayloadRequest):
    """Decrypt payload and verify authentication tag using recipient private key."""
    try:
        decrypted = fidelius_crypto.decrypt_payload(
            encrypted_data_b64=req.encrypted_data_b64,
            auth_tag_b64=req.auth_tag_b64,
            nonce_b64=req.nonce_b64,
            salt_b64=req.salt_b64,
            sender_public_key_b64=req.sender_public_key_b64,
            receiver_private_key_b64=req.receiver_private_key_b64
        )
        return {"success": True, "data": decrypted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {e!s}")
