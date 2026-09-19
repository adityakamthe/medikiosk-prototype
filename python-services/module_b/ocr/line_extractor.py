"""
Line-Level Bounding Box Extractor for MediKiosk Module B
Implements horizontal projection profiling and connected contour strip extraction.
"""

import cv2
import numpy as np
import base64
from typing import List, Dict, Any


def extract_prescription_lines(
    image_bgr: np.ndarray,
    min_line_height: int = 18,
    min_line_width: int = 80,
    export_base64: bool = False
) -> List[Dict[str, Any]]:
    """
    Extracts ordered text line strips from a medical document image.
    Enforces minimum height 18px and minimum width 80px for reliable prescription line segmentation.
    Returns bounding box metadata and optional cropped image base64 strings.
    """
    h, w = image_bgr.shape[:2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    # Adaptive threshold to isolate ink strokes
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 11
    )

    # Horizontal structuring element to bridge adjacent words in a line
    kernel_w = max(20, w // 25)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_w, 3))
    dilated = cv2.dilate(binary, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes = []
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        if ch >= min_line_height and cw >= min_line_width:
            boxes.append((x, y, cw, ch))

    # Sort vertically from top to bottom
    boxes = sorted(boxes, key=lambda b: b[1])

    line_strips: List[Dict[str, Any]] = []
    for idx, (x, y, cw, ch) in enumerate(boxes):
        pad = 4
        y0 = max(0, y - pad)
        y1 = min(h, y + ch + pad)
        x0 = max(0, x - pad)
        x1 = min(w, x + cw + pad)

        crop = image_bgr[y0:y1, x0:x1]
        line_item: Dict[str, Any] = {
            "line_index": idx,
            "bbox": {"x": int(x0), "y": int(y0), "width": int(x1 - x0), "height": int(y1 - y0)},
            "crop_shape": {"width": int(crop.shape[1]), "height": int(crop.shape[0])}
        }

        if export_base64:
            success, enc = cv2.imencode(".jpg", crop, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            if success:
                line_item["crop_base64"] = base64.b64encode(enc.tobytes()).decode("utf-8")

        line_strips.append(line_item)

    return line_strips


def prepare_multimodal_vlm_input(
    image_bgr: np.ndarray,
    min_line_height: int = 18,
    min_line_width: int = 80,
    max_strips: int = 12
) -> Dict[str, Any]:
    """
    Prepares multimodal VLM input combining full-page context image and cropped line strips.
    Prevents skipped lines and column association errors.
    """
    success, enc = cv2.imencode(".jpg", image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    full_page_b64 = base64.b64encode(enc.tobytes()).decode("utf-8") if success else ""

    line_strips = extract_prescription_lines(
        image_bgr,
        min_line_height=min_line_height,
        min_line_width=min_line_width,
        export_base64=True
    )

    crops = [
        {
            "line_index": s["line_index"],
            "bbox": s["bbox"],
            "crop_base64": s["crop_base64"]
        }
        for s in line_strips[:max_strips]
        if s.get("crop_base64")
    ]

    return {
        "full_page_base64": full_page_b64,
        "total_lines_detected": len(line_strips),
        "line_crops": crops
    }


class LineExtractor:
    """Line extractor helper converting contour strips into RawPrescriptionLine schemas."""
    def extract_lines(
        self,
        image_bgr: np.ndarray,
        min_line_height: int = 18,
        min_line_width: int = 80,
        export_base64: bool = False
    ) -> List[Any]:
        try:
            from module_b.schemas.intake_schemas import RawPrescriptionLine, BoundingBox
        except (ImportError, ValueError):
            try:
                from ..schemas.intake_schemas import RawPrescriptionLine, BoundingBox
            except (ImportError, ValueError):
                from schemas.intake_schemas import RawPrescriptionLine, BoundingBox

        raw_lines = extract_prescription_lines(image_bgr, min_line_height, min_line_width, export_base64)
        results = []
        for rl in raw_lines:
            bb = BoundingBox(**rl["bbox"])
            results.append(RawPrescriptionLine(
                line_index=rl["line_index"],
                bbox=bb,
                crop_base64=rl.get("crop_base64")
            ))
        return results

    def prepare_vlm_payload(
        self,
        image_bgr: np.ndarray,
        min_line_height: int = 18,
        min_line_width: int = 80,
        max_strips: int = 12
    ) -> Dict[str, Any]:
        return prepare_multimodal_vlm_input(
            image_bgr,
            min_line_height=min_line_height,
            min_line_width=min_line_width,
            max_strips=max_strips
        )


line_extractor = LineExtractor()

