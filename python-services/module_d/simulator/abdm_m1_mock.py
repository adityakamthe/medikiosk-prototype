"""
ABDM M1 (ABHA Scan & Share / OTP Authentication) Mock Service for MediKiosk Module D.
Simulates National Health Authority (NHA) M1 Gateway APIs without requiring live sandbox whitelisting.
"""

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from ..config import settings
from ..schemas.auth_schemas import (
    AbhaDemographics,
    AbhaQRScanResponse,
    AuthTokenResponse,
    OTPGenerateRequest,
    OTPGenerateResponse,
    OTPVerifyRequest,
)

# Mock patient repository for OTP lookups
MOCK_PATIENTS_DB: dict[str, dict[str, Any]] = {
    "91-4582-7391-0428": {
        "abha_number": "91-4582-7391-0428",
        "abha_address": "rahul.sharma@abdm",
        "name": "Rahul Sharma",
        "gender": "Male",
        "dob": "1988-06-15",
        "year_of_birth": 1988,
        "mobile": "9876543210",
        "email": "rahul.sharma@example.com",
        "address": "Flat 402, Green Meadows, Shivajinagar",
        "district": "Pune",
        "state": "Maharashtra",
        "pincode": "411005"
    },
    "91-8832-1920-5541": {
        "abha_number": "91-8832-1920-5541",
        "abha_address": "priya.patel@abdm",
        "name": "Priya Patel",
        "gender": "Female",
        "dob": "1994-11-20",
        "year_of_birth": 1994,
        "mobile": "9823012345",
        "email": "priya.patel@example.com",
        "address": "12 Shanti Nagar, Navrangpura",
        "district": "Ahmedabad",
        "state": "Gujarat",
        "pincode": "380009"
    }
}


class ABDMM1MockService:
    """Simulates ABHA QR scanning, OTP dispatch, and OAuth token issuance."""

    def __init__(self):
        self._active_otps: dict[str, dict[str, Any]] = {}

    def parse_qr_code(self, raw_payload: str) -> AbhaQRScanResponse:
        """
        Parse either official NHA JSON ABHA QR codes or delimiter-separated tokens.
        """
        raw_text = raw_payload.strip()
        parsed_name = None
        parsed_gender = "Other"
        parsed_dob = "1990-01-01"
        parsed_year = 1990
        parsed_abha = None
        parsed_address = None
        parsed_mobile = None
        parsed_district = None
        parsed_state = None

        # 1. Try JSON parsing (Standard ABDM QR specification)
        try:
            data = json.loads(raw_text)
            if isinstance(data, dict):
                parsed_abha = data.get("hidn") or data.get("abha_number") or data.get("id")
                parsed_address = data.get("hid") or data.get("abha_address") or data.get("phr_address")
                parsed_name = data.get("name")

                g = str(data.get("gender", "")).upper()
                if g in ["M", "MALE"]:
                    parsed_gender = "Male"
                elif g in ["F", "FEMALE"]:
                    parsed_gender = "Female"
                else:
                    parsed_gender = "Other"

                if data.get("dob"):
                    parsed_dob = str(data.get("dob"))
                    parts = re.split(r"[-/]", parsed_dob)
                    if len(parts) >= 3 and len(parts[0]) == 4:
                        parsed_year = int(parts[0])
                    elif len(parts) >= 3 and len(parts[2]) == 4:
                        parsed_year = int(parts[2])
                elif data.get("yearOfBirth") is not None:
                    parsed_year = int(data["yearOfBirth"])
                    parsed_dob = f"{parsed_year}-01-01"

                parsed_mobile = data.get("mobile")
                parsed_district = data.get("districtName") or data.get("district")
                parsed_state = data.get("stateName") or data.get("state")
        except Exception:
            # 2. Try Delimiter parsing (comma, pipe, or newline separated)
            tokens = [t.strip() for t in re.split(r"[,|\n\t]", raw_text) if t.strip()]
            for t in tokens:
                if re.match(r"^\d{2}-\d{4}-\d{4}-\d{4}$", t):
                    parsed_abha = t
                elif re.match(r"^\d{14}$", t):
                    parsed_abha = f"{t[:2]}-{t[2:6]}-{t[6:10]}-{t[10:]}"
                elif "@" in t:
                    parsed_address = t
                elif t.upper() in ["M", "MALE"]:
                    parsed_gender = "Male"
                elif t.upper() in ["F", "FEMALE"]:
                    parsed_gender = "Female"
                elif re.match(r"^\d{4}[-/]\d{2}[-/]\d{2}$", t):
                    parsed_dob = t
                    parsed_year = int(t[:4])
                elif not parsed_name and re.match(r"^[A-Za-z\s]{3,35}$", t):
                    parsed_name = t

        if not parsed_abha:
            # Generate deterministic fallback ABHA if not detected
            parsed_abha = "91-4582-7391-0428"
        if not parsed_name:
            parsed_name = "Ramesh Kumar"
        if not parsed_address:
            parsed_address = f"{parsed_name.lower().replace(' ', '.')}@abdm"

        demo = AbhaDemographics(
            abha_number=parsed_abha,
            abha_address=parsed_address,
            name=parsed_name,
            gender=parsed_gender,
            dob=parsed_dob,
            year_of_birth=parsed_year,
            mobile=parsed_mobile or "9876543210",
            district=parsed_district or "New Delhi",
            state=parsed_state or "Delhi",
            is_verified=True,
            auth_methods=["QR_CODE", "DEMOGRAPHICS"]
        )

        return AbhaQRScanResponse(
            success=True,
            demographics=demo,
            raw_parsed_data={"source": "QR_DECODER", "raw": raw_text}
        )

    def generate_otp(self, req: OTPGenerateRequest) -> OTPGenerateResponse:
        """Generate authentication OTP transaction."""
        txn_id = f"TXN-ABDM-{uuid.uuid4().hex[:8].upper()}"
        masked = req.identifier[:3] + "X" * 6 + req.identifier[-2:] if len(req.identifier) >= 5 else "XXXX"

        # Register OTP transaction (Default demo OTP is always '123456')
        self._active_otps[txn_id] = {
            "identifier": req.identifier,
            "auth_mode": req.auth_mode,
            "expected_otp": settings.ABDM_MOCK_OTP,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        return OTPGenerateResponse(
            success=True,
            txn_id=txn_id,
            auth_mode=req.auth_mode,
            masked_target=masked,
            message="OTP dispatched successfully. Use demo code '123456' for verification."
        )

    def verify_otp(self, req: OTPVerifyRequest) -> AuthTokenResponse:
        """Verify OTP code and return signed Bearer auth token and profile."""
        txn_key = req.effective_txn_id
        record = self._active_otps.get(txn_key)

        # In testing / mock mode, accept either matching txn OTP or universal demo OTP '123456'
        if req.otp != settings.ABDM_MOCK_OTP and (not record or record.get("expected_otp") != req.otp):
            raise ValueError("Invalid OTP code. Please use '123456' for verification.")

        identifier = (record.get("identifier") if record else None) or "91-4582-7391-0428"
        patient_data = MOCK_PATIENTS_DB.get(identifier, MOCK_PATIENTS_DB["91-4582-7391-0428"])

        demo = AbhaDemographics(**patient_data)
        access_token = f"eyJhbGciOiJSUzI1NiJ9.mock_abdm_token_{uuid.uuid4().hex[:16]}"

        return AuthTokenResponse(
            success=True,
            token_type="Bearer",
            access_token=access_token,
            expires_in=settings.ABDM_TOKEN_EXPIRY_SECONDS,
            scope="abdm:m1:patient_share abdm:m2:care_context",
            patient=demo
        )


abdm_m1_mock = ABDMM1MockService()
