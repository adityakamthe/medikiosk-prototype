"""
Idempotency Interceptor for MediKiosk Module D HIS Connectors.
Prevents duplicate clinical encounters or FHIR bundles on network retries.
"""

import time
import hashlib
import json
from typing import Dict, Any, Optional, Tuple
from ..config import settings


class IdempotencyRecord:
    def __init__(self, key: str, payload_hash: str, status_code: int, response_data: Dict[str, Any]):
        self.key = key
        self.payload_hash = payload_hash
        self.status_code = status_code
        self.response_data = response_data
        self.created_at = time.time()

    def is_expired(self, ttl: int) -> bool:
        return (time.time() - self.created_at) > ttl


class IdempotencyManager:
    """In-memory thread-safe idempotency registry with TTL expiration."""

    def __init__(self, ttl_seconds: int = settings.IDEMPOTENCY_TTL_SECONDS):
        self._store: Dict[str, IdempotencyRecord] = {}
        self.ttl = ttl_seconds

    def _hash_payload(self, payload: Any) -> str:
        if isinstance(payload, (dict, list)):
            dumped = json.dumps(payload, sort_keys=True)
        elif isinstance(payload, str):
            dumped = payload
        else:
            dumped = str(payload)
        return hashlib.sha256(dumped.encode("utf-8")).hexdigest()

    def check_transaction(self, idempotency_key: str, payload: Any) -> Tuple[bool, Optional[IdempotencyRecord], Optional[str]]:
        """
        Check if transaction was already processed.
        Returns:
            (is_duplicate, cached_record, error_message)
        """
        self._clean_expired()
        current_hash = self._hash_payload(payload)

        record = self._store.get(idempotency_key)
        if not record:
            return False, None, None

        if record.payload_hash != current_hash:
            return False, record, f"Idempotency conflict: Key '{idempotency_key}' reused with differing payload."

        return True, record, None

    def record_transaction(self, idempotency_key: str, payload: Any, status_code: int, response_data: Dict[str, Any]) -> None:
        """Store the processed result of an idempotent operation."""
        self._clean_expired()
        payload_hash = self._hash_payload(payload)
        self._store[idempotency_key] = IdempotencyRecord(
            key=idempotency_key,
            payload_hash=payload_hash,
            status_code=status_code,
            response_data=response_data
        )

    def _clean_expired(self):
        """Purge entries older than TTL."""
        expired_keys = [k for k, v in self._store.items() if v.is_expired(self.ttl)]
        for k in expired_keys:
            del self._store[k]

    def clear(self):
        """Clear all stored idempotency records (useful for test resets)."""
        self._store.clear()


idempotency_manager = IdempotencyManager()
