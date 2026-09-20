"""
Unit Tests for Ephemeral Session Cleaner & Multi-Pass File Shredder in Module D.
"""

import uuid

from module_d.privacy.session_cleaner import session_cleaner


def test_ephemeral_file_creation_and_shredding():
    """Verify that temporary files are securely overwritten and shredded to 0 bytes."""
    session_id = str(uuid.uuid4())
    dummy_payload = b"Patient-Intake-Audio-Sample-Recording-1234567890" * 50

    # 1. Register temporary file
    file_path = session_cleaner.register_ephemeral_file(session_id, "mic_sample.wav", dummy_payload)
    assert file_path.exists()
    assert file_path.stat().st_size == len(dummy_payload)

    # 2. Check retained bytes before purge
    retained_before = session_cleaner.get_session_retained_bytes(session_id)
    assert retained_before == len(dummy_payload)

    # 3. Purge session
    purge_report = session_cleaner.purge_session(session_id)
    assert purge_report["success"] is True
    assert purge_report["status"] == "PURGED"
    assert purge_report["bytes_retained"] == 0
    assert purge_report["files_purged"] == 1
    assert purge_report["bytes_purged"] == len(dummy_payload)
    assert purge_report["remaining_bytes"] == 0
    assert purge_report["verification_status"] == "ZERO_BYTES_RETAINED"

    # 4. Confirm physical file and directory are gone
    assert not file_path.exists()
    assert session_cleaner.get_session_retained_bytes(session_id) == 0


def test_purge_multiple_ephemeral_assets():
    """Verify multiple images, OCR text snippets, and audio files are completely flushed."""
    session_id = str(uuid.uuid4())
    session_cleaner.register_ephemeral_file(session_id, "doc1.jpg", b"Simulated-Prescription-Image" * 100)
    session_cleaner.register_ephemeral_file(session_id, "doc2.jpg", b"Simulated-Lab-Report-Image" * 100)
    session_cleaner.register_ephemeral_file(session_id, "voice.raw", b"PCM-Audio-Buffer" * 200)

    assert session_cleaner.get_session_retained_bytes(session_id) > 0

    report = session_cleaner.purge_session(session_id)
    assert report["success"] is True
    assert report["files_purged"] == 3
    assert report["remaining_bytes"] == 0


def test_purge_nonexistent_session():
    """Verify purge on empty or already-purged session completes safely with 0 remaining bytes."""
    session_id = str(uuid.uuid4())
    report = session_cleaner.purge_session(session_id)
    assert report["success"] is True
    assert report["remaining_bytes"] == 0
    assert report["files_purged"] == 0
