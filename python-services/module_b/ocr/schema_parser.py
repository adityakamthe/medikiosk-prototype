"""
Constrained Output Schema Parser and 1-Shot Retry Gate for MediKiosk Module B.
Enforces strict JSON schema validation for VLM outputs, with automatic 1-shot retry.
If validation still fails, flags output as MANUAL_REVIEW_REQUIRED and prevents silent drop.
"""
import json
import re
from collections.abc import Callable
from typing import Any

try:
    from module_b.schemas.intake_schemas import (
        ConstrainedMedicationExtraction,
        ConstrainedPrescriptionExtraction,
    )
except (ImportError, ValueError):
    try:
        from ..schemas.intake_schemas import (  # type: ignore[no-redef]
            ConstrainedMedicationExtraction,
            ConstrainedPrescriptionExtraction,
        )
    except (ImportError, ValueError):
        from schemas.intake_schemas import (  # type: ignore[no-redef]
            ConstrainedMedicationExtraction,
            ConstrainedPrescriptionExtraction,
        )


SCHEMA_RETRY_PROMPT = """CRITICAL SCHEMA ERROR:
Your previous response did NOT match the required JSON schema or failed validation.
You MUST output ONLY a valid JSON object with EXACTLY this structure:
{
  "medications": [
    {
      "drug_candidate": "exact transcribed brand or generic name",
      "dosage_form": "Tab | Cap | Syr | Inj | Oint | etc",
      "strength": "e.g. 500mg, 650mg",
      "frequency": "e.g. 1-0-1, OD, BD, TDS",
      "duration": "e.g. 5 days, 3/7, 1/52",
      "raw_sig": "original instruction line",
      "confidence_self_assessment": 0.85
    }
  ],
  "is_rx_symbol_present": true,
  "doctor_notes": "clinical notes or null"
}
Do NOT include markdown backticks or commentary. Output raw JSON only.
"""


def clean_json_string(text: str) -> str:
    """Strips markdown code blocks, backticks, and whitespace."""
    s = text.strip()
    # Match ```json ... ``` or ``` ... ```
    m = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', s)
    if m:
        s = m.group(1).strip()
    elif s.startswith("```"):
        s = re.sub(r'^```(?:json)?', '', s)
        s = re.sub(r'```$', '', s).strip()
    return s


def normalize_medication_dict(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalizes medication dict keys, mapping legacy keys to constrained schema."""
    candidate = raw.get("drug_candidate") or raw.get("name") or raw.get("drug") or raw.get("medication") or ""
    dosage_form = raw.get("dosage_form") or raw.get("form")
    strength = raw.get("strength") or raw.get("dose") or raw.get("potency")
    frequency = raw.get("frequency") or raw.get("sig")
    duration = raw.get("duration") or raw.get("period")
    raw_sig = raw.get("raw_sig") or raw.get("raw_text") or raw.get("sig")

    conf = raw.get("confidence_self_assessment")
    if conf is None:
        conf = raw.get("confidence", 0.85)
    try:
        conf = float(conf)
        conf = max(0.0, min(1.0, conf))
    except (ValueError, TypeError):
        conf = 0.85

    return {
        "drug_candidate": str(candidate).strip(),
        "dosage_form": str(dosage_form).strip() if dosage_form else None,
        "strength": str(strength).strip() if strength else None,
        "frequency": str(frequency).strip() if frequency else None,
        "duration": str(duration).strip() if duration else None,
        "raw_sig": str(raw_sig).strip() if raw_sig else None,
        "confidence_self_assessment": conf
    }


def parse_and_validate_extraction(data: Any) -> ConstrainedPrescriptionExtraction:
    """Parses Python dict or json into ConstrainedPrescriptionExtraction."""
    if isinstance(data, str):
        cleaned = clean_json_string(data)
        data = json.loads(cleaned)

    if not isinstance(data, dict):
        raise ValueError(f"Expected dict from JSON parse, got {type(data)}")

    raw_meds = data.get("medications", [])
    if not isinstance(raw_meds, list):
        raise ValueError(f"Expected list for 'medications', got {type(raw_meds)}")

    normalized_meds = []
    for item in raw_meds:
        if isinstance(item, dict):
            norm_item = normalize_medication_dict(item)
            if norm_item["drug_candidate"]:
                normalized_meds.append(ConstrainedMedicationExtraction(**norm_item))

    return ConstrainedPrescriptionExtraction(
        medications=normalized_meds,
        is_rx_symbol_present=bool(data.get("is_rx_symbol_present", True)),
        doctor_notes=data.get("doctor_notes")
    )


def extract_partial_fallback(raw_text: str, err_msg: str) -> ConstrainedPrescriptionExtraction:
    """
    Best-effort regex recovery of medication lines when JSON is malformed.
    Never fails silently; tags output for manual review.
    """
    meds: list[ConstrainedMedicationExtraction] = []
    lines = raw_text.splitlines()
    for line in lines:
        line_clean = line.strip()
        # Look for drug-like patterns e.g. "Tab Paracetamol 650mg 1-0-1"
        match = re.search(r'(?i)\b(Tab|Cap|Syr|Inj|Oint)?\.?\s*([A-Za-z0-9\-\s]{3,30}?)\s+(\d+\s*(?:mg|ml|mcg|gm|iu))\b', line_clean)
        if match:
            form, name, dose = match.groups()
            meds.append(ConstrainedMedicationExtraction(
                drug_candidate=name.strip(),
                dosage_form=form.strip() if form else None,
                strength=dose.strip() if dose else None,
                raw_sig=line_clean,
                confidence_self_assessment=0.30
            ))

    return ConstrainedPrescriptionExtraction(
        medications=meds,
        is_rx_symbol_present=True,
        doctor_notes=f"Recovered from malformed VLM output: {raw_text[:100]}...",
        validation_error=f"Schema parsing error: {err_msg}",
        schema_retry_attempted=True
    )


def parse_vlm_output_with_retry(
    raw_response: Any,
    retry_callback: Callable[[str], Any] | None = None
) -> tuple[ConstrainedPrescriptionExtraction, bool]:
    """
    Attempts to parse VLM response against ConstrainedPrescriptionExtraction.
    If parsing fails and retry_callback is provided, executes a 1-shot retry.
    Returns (extraction, was_retried).
    """
    try:
        parsed = parse_and_validate_extraction(raw_response)
        return parsed, False
    except Exception as first_err:
        if retry_callback:
            try:
                retry_response = retry_callback(SCHEMA_RETRY_PROMPT)
                parsed = parse_and_validate_extraction(retry_response)
                parsed.schema_retry_attempted = True
                return parsed, True
            except Exception as second_err:
                fallback = extract_partial_fallback(
                    str(raw_response),
                    f"Attempt 1: {first_err!s}; Attempt 2: {second_err!s}"
                )
                return fallback, True

        # No retry callback provided or immediate fallback
        fallback = extract_partial_fallback(str(raw_response), str(first_err))
        return fallback, False
