"""
OCR and Vision-Language Model Extraction package for MediKiosk Module B
"""
from .line_extractor import LineExtractor, extract_prescription_lines, line_extractor
from .schema_parser import (
    extract_partial_fallback,
    parse_and_validate_extraction,
    parse_vlm_output_with_retry,
)
from .secondary_recognizer import (
    SecondaryRecognizer,
    apply_disagreement_gate,
    evaluate_cross_model_agreement,
    secondary_recognizer,
)
from .vlm_ensemble import (
    normalize_token_name,
    resolve_token_agreement,
    run_ensemble_decoding,
)

__all__ = [
    "LineExtractor",
    "SecondaryRecognizer",
    "apply_disagreement_gate",
    "evaluate_cross_model_agreement",
    "extract_partial_fallback",
    "extract_prescription_lines",
    "line_extractor",
    "normalize_token_name",
    "parse_and_validate_extraction",
    "parse_vlm_output_with_retry",
    "resolve_token_agreement",
    "run_ensemble_decoding",
    "secondary_recognizer"
]

