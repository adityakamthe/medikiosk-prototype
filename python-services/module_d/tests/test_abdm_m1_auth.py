"""
Unit Tests for ABDM M1 (ABHA QR Scanner, OTP Auth & Token Issuance) in Module D.
"""

import pytest
import json
from module_d.simulator.abdm_m1_mock import abdm_m1_mock
from module_d.schemas.auth_schemas import OTPGenerateRequest, OTPVerifyRequest


def test_parse_official_abha_json_qr():
    """Verify parsing of standard NHA JSON QR code payload."""
    sample_qr_json = json.dumps({
        "hidn": "91-4582-7391-0428",
        "hid": "rahul.sharma@abdm",
        "name": "Rahul Sharma",
        "gender": "M",
        "dob": "1988-06-15",
        "mobile": "9876543210",
        "stateName": "Maharashtra",
        "districtName": "Pune"
    })

    res = abdm_m1_mock.parse_qr_code(sample_qr_json)
    assert res.success is True
    assert res.demographics is not None
    assert res.demographics.name == "Rahul Sharma"
    assert res.demographics.gender == "Male"
    assert res.demographics.year_of_birth == 1988
    assert res.demographics.abha_number == "91-4582-7391-0428"
    assert res.demographics.district == "Pune"


def test_parse_delimiter_separated_qr():
    """Verify parsing of comma/pipe separated ABHA QR tokens."""
    sample_delimiter_qr = "91-8832-1920-5541,Priya Patel,F,1994-11-20"
    res = abdm_m1_mock.parse_qr_code(sample_delimiter_qr)
    assert res.success is True
    assert res.demographics is not None
    assert res.demographics.name == "Priya Patel"
    assert res.demographics.gender == "Female"
    assert res.demographics.abha_number == "91-8832-1920-5541"


def test_otp_generation_and_verification_flow():
    """Verify M1 OTP dispatch and verification with demo code '123456'."""
    # 1. Generate OTP
    gen_req = OTPGenerateRequest(identifier="91-4582-7391-0428", auth_mode="MOBILE_OTP")
    gen_res = abdm_m1_mock.generate_otp(gen_req)

    assert gen_res.success is True
    assert gen_res.txn_id.startswith("TXN-ABDM-")
    assert "X" in gen_res.masked_target

    # 2. Verify with valid demo OTP
    verify_req = OTPVerifyRequest(txn_id=gen_res.txn_id, otp="123456")
    auth_token_res = abdm_m1_mock.verify_otp(verify_req)

    assert auth_token_res.success is True
    assert auth_token_res.token_type == "Bearer"
    assert len(auth_token_res.access_token) > 20
    assert auth_token_res.patient.abha_number == "91-4582-7391-0428"
    assert auth_token_res.patient.name == "Rahul Sharma"


def test_invalid_otp_rejection():
    """Verify that an incorrect OTP is rejected."""
    gen_res = abdm_m1_mock.generate_otp(OTPGenerateRequest(identifier="91-4582-7391-0428"))

    with pytest.raises(ValueError) as exc:
        abdm_m1_mock.verify_otp(OTPVerifyRequest(txn_id=gen_res.txn_id, otp="999999"))
    assert "Invalid OTP" in str(exc.value)
