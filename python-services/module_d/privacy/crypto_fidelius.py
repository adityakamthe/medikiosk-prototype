"""
ABDM Fidelius Cryptographic Demonstrator for MediKiosk Module D.
Standard: Curve25519 (X25519) Diffie-Hellman Key Exchange + HKDF SHA-256 + AES-256-GCM.
Emulates the NHA ABDM End-to-End Encryption Protocol for Health Data Transfer.
"""

import os
import base64
import json
from typing import Dict, Tuple, Any, Optional
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import serialization


class FideliusCrypto:
    """
    Curve25519 ECDH + AES-256-GCM Encryption/Decryption matching NHA ABDM specifications.
    """

    @staticmethod
    def generate_keypair() -> Tuple[x25519.X25519PrivateKey, x25519.X25519PublicKey, str, str]:
        """
        Generate an ephemeral X25519 keypair.
        Returns (private_obj, public_obj, private_b64, public_b64).
        """
        private_key = x25519.X25519PrivateKey.generate()
        public_key = private_key.public_key()

        priv_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )
        pub_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )

        priv_b64 = base64.b64encode(priv_bytes).decode("utf-8")
        pub_b64 = base64.b64encode(pub_bytes).decode("utf-8")

        return private_key, public_key, priv_b64, pub_b64

    @staticmethod
    def load_public_key_from_b64(pub_b64: str) -> x25519.X25519PublicKey:
        """Load an X25519 public key from Base64 string."""
        raw_bytes = base64.b64decode(pub_b64)
        return x25519.X25519PublicKey.from_public_bytes(raw_bytes)

    @staticmethod
    def load_private_key_from_b64(priv_b64: str) -> x25519.X25519PrivateKey:
        """Load an X25519 private key from Base64 string."""
        raw_bytes = base64.b64decode(priv_b64)
        return x25519.X25519PrivateKey.from_private_bytes(raw_bytes)

    @staticmethod
    def derive_encryption_key(
        private_key: x25519.X25519PrivateKey,
        peer_public_key: x25519.X25519PublicKey,
        salt: bytes
    ) -> bytes:
        """
        Derive 32-byte (256-bit) symmetric AES key using ECDH shared secret + HKDF-SHA256.
        """
        shared_secret = private_key.exchange(peer_public_key)
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            info=b"ABDM-Fidelius-Key-Derivation"
        )
        return hkdf.derive(shared_secret)

    @classmethod
    def encrypt_payload(
        cls,
        payload_data: Any,
        receiver_public_key_b64: str,
        sender_private_key_b64: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Encrypt arbitrary JSON or text payload using Curve25519 ECDH + AES-256-GCM.
        If sender_private_key_b64 is not supplied, generates an ephemeral sender keypair.
        """
        if sender_private_key_b64:
            sender_priv = cls.load_private_key_from_b64(sender_private_key_b64)
            sender_pub = sender_priv.public_key()
            sender_pub_b64 = base64.b64encode(
                sender_pub.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
            ).decode("utf-8")
        else:
            sender_priv, sender_pub, _, sender_pub_b64 = cls.generate_keypair()

        receiver_pub = cls.load_public_key_from_b64(receiver_public_key_b64)

        # 32-byte random salt and 12-byte random IV/nonce for GCM
        salt = os.urandom(32)
        nonce = os.urandom(12)

        derived_key = cls.derive_encryption_key(sender_priv, receiver_pub, salt)

        # Prepare plaintext bytes
        if isinstance(payload_data, (dict, list)):
            plaintext = json.dumps(payload_data).encode("utf-8")
        elif isinstance(payload_data, str):
            plaintext = payload_data.encode("utf-8")
        else:
            plaintext = bytes(payload_data)

        aesgcm = AESGCM(derived_key)
        # In AESGCM.encrypt(), the 16-byte authentication tag is appended to the ciphertext
        encrypted_data = aesgcm.encrypt(nonce, plaintext, None)

        ciphertext = encrypted_data[:-16]
        tag = encrypted_data[-16:]

        return {
            "encrypted_data_b64": base64.b64encode(ciphertext).decode("utf-8"),
            "auth_tag_b64": base64.b64encode(tag).decode("utf-8"),
            "nonce_b64": base64.b64encode(nonce).decode("utf-8"),
            "salt_b64": base64.b64encode(salt).decode("utf-8"),
            "sender_public_key_b64": sender_pub_b64,
            "algorithm": "Curve25519-ECDH-AES-256-GCM",
            "protocol": "ABDM-Fidelius-v1.0"
        }

    @classmethod
    def decrypt_payload(
        cls,
        encrypted_data_b64: str,
        auth_tag_b64: str,
        nonce_b64: str,
        salt_b64: str,
        sender_public_key_b64: str,
        receiver_private_key_b64: str
    ) -> Any:
        """
        Decrypt payload using receiver private key, sender public key, salt, nonce, and tag.
        Raises InvalidTag if tampering is detected.
        """
        receiver_priv = cls.load_private_key_from_b64(receiver_private_key_b64)
        sender_pub = cls.load_public_key_from_b64(sender_public_key_b64)

        salt = base64.b64decode(salt_b64)
        nonce = base64.b64decode(nonce_b64)
        ciphertext = base64.b64decode(encrypted_data_b64)
        tag = base64.b64decode(auth_tag_b64)

        derived_key = cls.derive_encryption_key(receiver_priv, sender_pub, salt)

        aesgcm = AESGCM(derived_key)
        combined_cipher_and_tag = ciphertext + tag
        decrypted_bytes = aesgcm.decrypt(nonce, combined_cipher_and_tag, None)

        decoded_str = decrypted_bytes.decode("utf-8")
        try:
            return json.loads(decoded_str)
        except Exception:
            return decoded_str


fidelius_crypto = FideliusCrypto()
