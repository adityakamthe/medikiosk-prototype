"""
Tests for Constrained Output Schema Validation and 1-Shot Retry Gate
"""
import pytest
from ocr.schema_parser import (
    parse_vlm_output_with_retry,
    parse_and_validate_extraction,
    extract_partial_fallback
)
from schemas.intake_schemas import (
    ConstrainedMedicationExtraction,
    ConstrainedPrescriptionExtraction
)


def test_valid_json_schema_parsing():
    valid_data = {
        "medications": [
            {
                "drug_candidate": "Augmentin 625",
                "dosage_form": "Tab",
                "strength": "625mg",
                "frequency": "1-0-1",
                "duration": "5 days",
                "raw_sig": "Tab Augmentin 625 1-0-1 x 5 days",
                "confidence_self_assessment": 0.95
            }
        ],
        "is_rx_symbol_present": True,
        "doctor_notes": "Take after meals"
    }

    parsed, was_retried = parse_vlm_output_with_retry(valid_data)
    assert not was_retried
    assert len(parsed.medications) == 1
    assert parsed.medications[0].drug_candidate == "Augmentin 625"
    assert parsed.medications[0].dosage_form == "Tab"
    assert parsed.medications[0].strength == "625mg"
    assert parsed.is_rx_symbol_present is True


def test_markdown_code_block_stripping():
    markdown_str = """```json
    {
        "medications": [
            {
                "name": "Pan 40",
                "form": "Tab",
                "dose": "40mg",
                "frequency": "1-0-0"
            }
        ],
        "is_rx_symbol_present": true
    }
    ```"""

    parsed, was_retried = parse_vlm_output_with_retry(markdown_str)
    assert not was_retried
    assert len(parsed.medications) == 1
    assert parsed.medications[0].drug_candidate == "Pan 40"
    assert parsed.medications[0].strength == "40mg"


def test_one_shot_retry_success():
    malformed_initial = "This is not JSON: Patient should take Paracetamol 650"

    # Retry callback returns valid JSON
    def mock_retry_callback(prompt: str):
        assert "CRITICAL SCHEMA ERROR" in prompt
        return {
            "medications": [
                {
                    "drug_candidate": "Paracetamol 650",
                    "dosage_form": "Tab",
                    "strength": "650mg",
                    "frequency": "1-0-1"
                }
            ],
            "is_rx_symbol_present": True
        }

    parsed, was_retried = parse_vlm_output_with_retry(
        malformed_initial,
        retry_callback=mock_retry_callback
    )
    assert was_retried is True
    assert parsed.schema_retry_attempted is True
    assert len(parsed.medications) == 1
    assert parsed.medications[0].drug_candidate == "Paracetamol 650"


def test_retry_failure_fallback_to_partial_extraction():
    malformed_text = "Doctor prescribed Tab Azithral 500mg once daily"

    # Retry callback also returns malformed text
    def bad_retry_callback(prompt: str):
        return "Still broken: Tab Azithral 500mg"

    parsed, was_retried = parse_vlm_output_with_retry(
        malformed_text,
        retry_callback=bad_retry_callback
    )
    assert was_retried is True
    assert parsed.validation_error is not None
    assert parsed.schema_retry_attempted is True
    # Should recover partial medication item via regex fallback rather than failing silently
    assert len(parsed.medications) >= 1
    assert "Azithral" in parsed.medications[0].drug_candidate
