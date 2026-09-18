"""
Unit tests for Computer Vision Preprocessor module (CV & Line Extraction).
"""
import pytest
import numpy as np
import cv2

from cv.preprocessor import cv_preprocessor, PreprocessEngine
from ocr.line_extractor import line_extractor, LineExtractor


def test_ink_color_separation():
    img = np.ones((200, 400, 3), dtype=np.uint8) * 255
    # Add blue ink
    cv2.putText(img, "Rx: Ultrafen Plus", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 50, 20), 2)
    # Add red background header
    cv2.rectangle(img, (20, 150), (380, 180), (40, 40, 220), -1)

    ink_mask = cv_preprocessor.isolate_ink_strokes(img)
    assert ink_mask is not None
    assert ink_mask.shape == (200, 400)
    assert ink_mask.dtype == np.uint8
    # Ink should be present in top region
    assert np.any(ink_mask[40:80, 20:200] == 255)


def test_laplacian_sharpness_and_legibility_gating():
    sharp_img = np.ones((200, 200, 3), dtype=np.uint8) * 255
    for i in range(0, 200, 10):
        cv2.line(sharp_img, (0, i), (200, i), (0, 0, 0), 2)

    _, enc_sharp = cv2.imencode(".jpg", sharp_img)
    res_sharp = cv_preprocessor.preprocess_image_bytes(enc_sharp.tobytes())
    assert res_sharp["confidence_tier"] == "high"
    assert res_sharp["sharpness_score"] > 80.0

    blurry_img = cv2.GaussianBlur(np.ones((200, 200, 3), dtype=np.uint8) * 128, (31, 31), 0)
    _, enc_blur = cv2.imencode(".jpg", blurry_img)
    res_blur = cv_preprocessor.preprocess_image_bytes(enc_blur.tobytes())
    assert res_blur["confidence_tier"] in ["poor_legibility", "ambiguous"]


def test_horizontal_line_strip_segmentation():
    img = np.ones((300, 500, 3), dtype=np.uint8) * 255
    cv2.putText(img, "Line 1: Tab Ultrafen Plus 50mg", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "Line 2: Cap Cartilix 1-0-0", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "Line 3: Tab Telma 40mg daily", (30, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

    lines = line_extractor.extract_lines(img, min_line_height=10, min_line_width=50)
    assert len(lines) >= 3
    for l in lines:
        assert l.bbox.y >= 0
        assert l.bbox.height > 0
