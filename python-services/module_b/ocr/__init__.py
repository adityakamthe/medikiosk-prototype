"""
OCR and Vision-Language Model Extraction package for MediKiosk Module B
"""
from .line_extractor import extract_prescription_lines, LineExtractor, line_extractor
from .vlm_ensemble import (
    normalize_token_name,
    resolve_token_agreement,
    run_ensemble_decoding
)
from .schema_parser import (
    parse_vlm_output_with_retry,
    parse_and_validate_extraction,
    extract_partial_fallback
)
from .secondary_recognizer import (
    SecondaryRecognizer,
    secondary_recognizer,
    evaluate_cross_model_agreement,
    apply_disagreement_gate
)

__all__ = [
    "extract_prescription_lines",
    "LineExtractor",
    "line_extractor",
    "normalize_token_name",
    "resolve_token_agreement",
    "run_ensemble_decoding",
    "parse_vlm_output_with_retry",
    "parse_and_validate_extraction",
    "extract_partial_fallback",
    "SecondaryRecognizer",
    "secondary_recognizer",
    "evaluate_cross_model_agreement",
    "apply_disagreement_gate"
]

