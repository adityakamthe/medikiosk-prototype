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


def test_high_res_dewarp_preservation():
    from cv.preprocessor import detect_document_boundary, four_point_transform
    # Create a 1000x1200 high-res synthetic document
    high_res = np.ones((1000, 1200, 3), dtype=np.uint8) * 40
    # Draw a rotated rectangular document inside
    pts = np.array([[150, 100], [1050, 150], [1000, 900], [100, 850]], dtype=np.int32)
    cv2.fillPoly(high_res, [pts], (250, 250, 250))
    cv2.putText(high_res, "High Res 0.5mm Pen Stroke", (300, 500), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (180, 40, 20), 2)

    corners = detect_document_boundary(high_res)
    assert corners is not None
    assert len(corners) == 4
    # Corner coordinates must be scaled up to full high-res space (> 500px)
    assert np.max(corners[:, 0]) > 500.0
    assert np.max(corners[:, 1]) > 500.0

    warped = four_point_transform(high_res, corners)
    assert warped.shape[0] > 700
    assert warped.shape[1] > 800


def test_clahe_ink_contrast_enhancement():
    from cv.preprocessor import enhance_ink_contrast_lab
    # Image with faded ballpoint ink on aged non-uniform background
    faded_doc = np.ones((400, 600, 3), dtype=np.uint8) * 220
    # Add non-uniform background gradient
    for y in range(400):
        faded_doc[y, :, 0] = np.clip(faded_doc[y, :, 0] - int(y * 0.2), 100, 255)
    # Faint 0.5mm ballpoint pen ink
    cv2.putText(faded_doc, "Tab Ultrafen Plus 50mg", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (120, 60, 40), 1)

    enhanced = enhance_ink_contrast_lab(faded_doc)
    assert enhanced is not None
    assert enhanced.shape == faded_doc.shape
    # Check contrast improvement
    assert enhanced.std() > 5.0


def test_multimodal_line_slicing_integration():
    from ocr.line_extractor import prepare_multimodal_vlm_input
    img = np.ones((400, 600, 3), dtype=np.uint8) * 255
    cv2.putText(img, "Prescription Header: Dr. S. Roy", (40, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "Tab Ultrafen Plus 50mg 1-0-1", (40, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "Cap Cartilix 500mg 1-0-0", (40, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "Tab Pantocid 40mg 1-0-0", (40, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

    vlm_payload = prepare_multimodal_vlm_input(img, min_line_height=18, min_line_width=80)
    assert vlm_payload["full_page_base64"] is not None
    assert vlm_payload["total_lines_detected"] >= 3
    assert len(vlm_payload["line_crops"]) >= 3
    for crop in vlm_payload["line_crops"]:
        assert "crop_base64" in crop
        assert crop["bbox"]["height"] >= 18
        assert crop["bbox"]["width"] >= 80

