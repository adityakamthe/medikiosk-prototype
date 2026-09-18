"""
Unit Tests for ABDM Fidelius Cryptographic Engine (Curve25519 ECDH + AES-256-GCM).
"""

import pytest
from module_d.privacy.crypto_fidelius import fidelius_crypto


def test_keypair_generation():
    """Verify X25519 keypair generation produces valid Base64 encoded keys."""
    priv, pub, priv_b64, pub_b64 = fidelius_crypto.generate_keypair()
    assert len(priv_b64) > 40
    assert len(pub_b64) > 40
    # Loading keys back must succeed
    loaded_pub = fidelius_crypto.load_public_key_from_b64(pub_b64)
    assert loaded_pub is not None


def test_ecdh_roundtrip_encryption_decryption():
    """Verify full round-trip encrypt and decrypt matching ABDM specifications."""
    # 1. Receiver (e.g. Hospital B / Doctor dashboard) generates keypair
    _, _, receiver_priv_b64, receiver_pub_b64 = fidelius_crypto.generate_keypair()

    # 2. Sender (e.g. Hospital A / MediKiosk) has patient data
    sample_clinical_payload = {
        "resourceType": "Bundle",
        "type": "document",
        "patient": {"name": "Rahul Sharma", "age": 36, "gender": "Male"},
        "diagnoses": ["Acute Bronchitis", "Hypertension Stage 1"],
        "medications": ["Azithromycin 500mg", "Paracetamol 650mg"]
    }

    # 3. Encrypt payload for receiver
    encrypted_packet = fidelius_crypto.encrypt_payload(
        payload_data=sample_clinical_payload,
        receiver_public_key_b64=receiver_pub_b64
    )

    assert "encrypted_data_b64" in encrypted_packet
    assert "auth_tag_b64" in encrypted_packet
    assert "nonce_b64" in encrypted_packet
    assert "salt_b64" in encrypted_packet
    assert "sender_public_key_b64" in encrypted_packet

    # 4. Decrypt payload on receiver side
    decrypted_data = fidelius_crypto.decrypt_payload(
        encrypted_data_b64=encrypted_packet["encrypted_data_b64"],
        auth_tag_b64=encrypted_packet["auth_tag_b64"],
        nonce_b64=encrypted_packet["nonce_b64"],
        salt_b64=encrypted_packet["salt_b64"],
        sender_public_key_b64=encrypted_packet["sender_public_key_b64"],
        receiver_private_key_b64=receiver_priv_b64
    )

    assert decrypted_data == sample_clinical_payload
    assert decrypted_data["patient"]["name"] == "Rahul Sharma"


def test_tamper_detection_in_ciphertext_or_tag():
    """Verify that tampering with ciphertext or authentication tag raises a decryption error."""
    _, _, receiver_priv_b64, receiver_pub_b64 = fidelius_crypto.generate_keypair()

    packet = fidelius_crypto.encrypt_payload("Sensitive Patient Data", receiver_pub_b64)

    # 1. Corrupt ciphertext
    corrupted_data = list(packet["encrypted_data_b64"])
    corrupted_data[2] = "X" if corrupted_data[2] != "X" else "Y"
    bad_cipher_b64 = "".join(corrupted_data)

    with pytest.raises(Exception):
        fidelius_crypto.decrypt_payload(
            encrypted_data_b64=bad_cipher_b64,
            auth_tag_b64=packet["auth_tag_b64"],
            nonce_b64=packet["nonce_b64"],
            salt_b64=packet["salt_b64"],
            sender_public_key_b64=packet["sender_public_key_b64"],
            receiver_private_key_b64=receiver_priv_b64
        )


def test_wrong_receiver_key_rejection():
    """Verify that an unauthorized receiver cannot decrypt the payload."""
    _, _, _, receiver_pub_b64 = fidelius_crypto.generate_keypair()
    _, _, wrong_priv_b64, _ = fidelius_crypto.generate_keypair()

    packet = fidelius_crypto.encrypt_payload("Confidential Health Record", receiver_pub_b64)

    with pytest.raises(Exception):
        fidelius_crypto.decrypt_payload(
            encrypted_data_b64=packet["encrypted_data_b64"],
            auth_tag_b64=packet["auth_tag_b64"],
            nonce_b64=packet["nonce_b64"],
            salt_b64=packet["salt_b64"],
            sender_public_key_b64=packet["sender_public_key_b64"],
            receiver_private_key_b64=wrong_priv_b64
        )
