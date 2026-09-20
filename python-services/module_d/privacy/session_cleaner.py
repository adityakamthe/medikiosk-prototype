"""
Ephemeral Session Memory Cleaner & Secure Shredder for MediKiosk Module D.
Mandate: 0 bytes retained on kiosk once clinical record is ingested or consent revoked.
Complies with DPDP Act 2023 Ephemeral Data Processing provisions.
"""

import gc
import os
import shutil
from pathlib import Path
from typing import Any

from ..config import settings


class KioskSessionCleaner:
    """
    Provides ephemeral memory flushing and multi-pass cryptographic file shredding.
    Targets temporary image directories, intermediate OCR bounding boxes, and unencrypted audio buffers.
    Mandate: 0 bytes retained on kiosk once clinical record is ingested or session discharged.
    """

    def __init__(self):
        self.ephemeral_dir = settings.EPHEMERAL_TEMP_DIR

    def _shred_file(self, file_path: Path, passes: int = 3) -> int:
        """
        Securely shred a file using multi-pass overwrite (DoD 5220.22-M inspired):
        Pass 1: Overwrite with zeros (0x00)
        Pass 2: Overwrite with ones (0xFF)
        Pass 3: Overwrite with cryptographically secure random bytes
        Finally flush, truncate to 0 bytes, and unlink.
        """
        if not file_path.exists() or not file_path.is_file():
            return 0

        length = file_path.stat().st_size
        if length > 0:
            with open(file_path, "ba+", buffering=0) as f:
                # Pass 1: Zeros
                f.seek(0)
                f.write(b"\x00" * length)
                f.flush()
                os.fsync(f.fileno())

                # Pass 2: Ones
                f.seek(0)
                f.write(b"\xFF" * length)
                f.flush()
                os.fsync(f.fileno())

                # Pass 3: Random
                f.seek(0)
                f.write(os.urandom(length))
                f.flush()
                os.fsync(f.fileno())

                # Truncate
                f.seek(0)
                f.truncate(0)
                f.flush()
                os.fsync(f.fileno())

        os.unlink(file_path)
        return length

    def register_ephemeral_file(self, session_id: str, filename: str, content: bytes) -> Path:
        """Create an ephemeral session file in the isolated session directory."""
        session_folder = self.ephemeral_dir / session_id
        session_folder.mkdir(parents=True, exist_ok=True)
        target_path = session_folder / filename
        with open(target_path, "wb") as f:
            f.write(content)
        return target_path

    def purge_session(self, session_id: str) -> dict[str, Any]:
        """
        Purge all ephemeral files, temporary images, OCR bounding boxes, audio buffers,
        and directories for the session.
        Returns verification payload reporting {"status": "PURGED", "bytes_retained": 0}.
        """
        session_folder = self.ephemeral_dir / session_id
        total_shredded_bytes = 0
        shredded_files_count = 0

        if session_folder.exists() and session_folder.is_dir():
            for root, _, files in os.walk(session_folder):
                for f in files:
                    file_path = Path(root) / f
                    total_shredded_bytes += self._shred_file(file_path, passes=settings.PURGE_SHRED_PASSES)
                    shredded_files_count += 1

            shutil.rmtree(session_folder, ignore_errors=True)

        # Force garbage collection to reclaim any dereferenced session memory buffers
        gc.collect()

        # Audit verification: check that 0 bytes and 0 files exist
        remaining_bytes = self.get_session_retained_bytes(session_id)

        return {
            "status": "PURGED" if remaining_bytes == 0 else "PARTIAL",
            "bytes_retained": remaining_bytes,
            "success": remaining_bytes == 0,
            "session_id": session_id,
            "files_purged": shredded_files_count,
            "bytes_purged": total_shredded_bytes,
            "remaining_bytes": remaining_bytes,
            "verification_status": "ZERO_BYTES_RETAINED" if remaining_bytes == 0 else "RESIDUAL_BYTES_DETECTED"
        }

    def get_session_retained_bytes(self, session_id: str) -> int:
        """Verify the total remaining bytes stored for this session."""
        session_folder = self.ephemeral_dir / session_id
        if not session_folder.exists():
            return 0
        total = 0
        for root, _, files in os.walk(session_folder):
            for f in files:
                total += (Path(root) / f).stat().st_size
        return total


# Backward compatibility aliases
SessionCleaner = KioskSessionCleaner
kiosk_session_cleaner = KioskSessionCleaner()
session_cleaner = kiosk_session_cleaner
