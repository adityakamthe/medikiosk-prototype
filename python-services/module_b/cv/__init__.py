"""
Computer Vision preprocessing package for MediKiosk Module B
"""
from .preprocessor import (
    order_points,
    four_point_transform,
    detect_document_boundary,
    normalize_illumination,
    denoise_and_threshold,
    isolate_ink_strokes,
    segment_prescription_lines,
    preprocess_medical_document
)

__all__ = [
    "order_points",
    "four_point_transform",
    "detect_document_boundary",
    "normalize_illumination",
    "denoise_and_threshold",
    "isolate_ink_strokes",
    "segment_prescription_lines",
    "preprocess_medical_document"
]
