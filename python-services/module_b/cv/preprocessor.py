"""
OpenCV Document Preprocessor for MediKiosk Module B
Stage 1: Document Acquisition, Perspective Warping, HSV Ink Separation, and Legibility Gating.
"""

import cv2
import numpy as np
import base64
from typing import Tuple, Optional, Dict, Any, List


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Orders 4 points in top-left, top-right, bottom-right, bottom-left order.
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # Top-left has smallest sum
    rect[2] = pts[np.argmax(s)]  # Bottom-right has largest sum

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # Top-right has smallest difference
    rect[3] = pts[np.argmax(diff)]  # Bottom-left has largest difference
    return rect


def four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """
    Applies a 4-point perspective transform to rectify skewed document images.
    """
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Compute width of new image
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))

    # Compute height of new image
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))

    if maxWidth <= 0 or maxHeight <= 0:
        return image

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped


def detect_document_boundary(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Finds the 4 corners of the medical document in the image using Canny edge detection
    and contour approximation.
    """
    h, w = image.shape[:2]
    ratio = h / 500.0
    resized = cv2.resize(image, (int(w / ratio), 500))

    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 200)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edged, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    min_area = (resized.shape[0] * resized.shape[1]) * 0.15

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4 and cv2.contourArea(c) >= min_area:
            return (approx.reshape(4, 2) * ratio).astype("float32")

    return None


def normalize_illumination(gray_image: np.ndarray) -> np.ndarray:
    """
    Eliminates non-uniform illumination and shadow gradients caused by ambient OPD lighting
    by computing background illumination via large morphological opening and dividing it out.
    """
    h, w = gray_image.shape
    q1 = float(np.mean(gray_image[:h//2, :w//2]))
    q2 = float(np.mean(gray_image[:h//2, w//2:]))
    q3 = float(np.mean(gray_image[h//2:, :w//2]))
    q4 = float(np.mean(gray_image[h//2:, w//2:]))
    quad_var = float(np.std([q1, q2, q3, q4]))

    if quad_var < 15.0:
        return gray_image

    k_size = max(51, min(w, h) // 8)
    if k_size % 2 == 0:
        k_size += 1
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_size, k_size))
    background = cv2.morphologyEx(gray_image, cv2.MORPH_OPEN, kernel)

    divided = cv2.divide(gray_image, background, scale=255)
    normalized = cv2.normalize(divided, None, 0, 255, cv2.NORM_MINMAX)
    return normalized


def denoise_and_threshold(gray_image: np.ndarray) -> np.ndarray:
    """
    Applies Fast Non-Local Means Denoising paired with Adaptive Gaussian Thresholding.
    """
    denoised = cv2.fastNlMeansDenoising(gray_image, h=10, templateWindowSize=7, searchWindowSize=21)
    binary = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 11
    )
    return binary


def isolate_ink_strokes(image_bgr: np.ndarray) -> np.ndarray:
    """
    Isolates blue and black ballpoint ink strokes from colored backgrounds, clinic logos,
    and preprinted lines using HSV color masking.
    """
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)

    # Blue ballpoint ink
    lower_blue = np.array([85, 35, 30], dtype=np.uint8)
    upper_blue = np.array([140, 255, 255], dtype=np.uint8)
    mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)

    # Black / dark ballpoint ink
    lower_black = np.array([0, 0, 0], dtype=np.uint8)
    upper_black = np.array([180, 255, 85], dtype=np.uint8)
    mask_black = cv2.inRange(hsv, lower_black, upper_black)

    ink_mask = cv2.bitwise_or(mask_blue, mask_black)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    cleaned_mask = cv2.morphologyEx(ink_mask, cv2.MORPH_CLOSE, kernel)
    return cleaned_mask


def segment_prescription_lines(
    image_bgr: np.ndarray,
    min_line_height: int = 15,
    min_line_width: int = 60
) -> List[Dict[str, Any]]:
    """
    Segments horizontal prescription line strips using horizontal projection profiling and contours.
    """
    h, w = image_bgr.shape[:2]
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)

    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 11
    )

    kernel_w = max(20, w // 25)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_w, 3))
    dilated = cv2.dilate(binary, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes = []
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        if ch >= min_line_height and cw >= min_line_width:
            boxes.append((x, y, cw, ch))

    boxes = sorted(boxes, key=lambda b: b[1])

    line_strips: List[Dict[str, Any]] = []
    for idx, (x, y, cw, ch) in enumerate(boxes):
        pad = 4
        y0 = max(0, y - pad)
        y1 = min(h, y + ch + pad)
        x0 = max(0, x - pad)
        x1 = min(w, x + cw + pad)

        crop = image_bgr[y0:y1, x0:x1]
        line_strips.append({
            "line_index": idx,
            "bbox": {"x": int(x0), "y": int(y0), "width": int(x1 - x0), "height": int(y1 - y0)},
            "crop_shape": {"width": int(crop.shape[1]), "height": int(crop.shape[0])}
        })

    return line_strips


def preprocess_medical_document(
    image_bytes: bytes,
    apply_dewarp: bool = True,
    apply_shadow_removal: bool = True,
    apply_binary_mask: bool = False,
    apply_ink_isolation: bool = False,
    extract_lines: bool = False
) -> Dict[str, Any]:
    """
    End-to-End Stage 1 Preprocessing Pipeline.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Failed to decode image buffer")

    orig_h, orig_w = image.shape[:2]
    was_dewarped = False

    # 1. Perspective Dewarping
    if apply_dewarp:
        boundary = detect_document_boundary(image)
        if boundary is not None:
            image = four_point_transform(image, boundary)
            was_dewarped = True

    # 2. Illumination and Quality Analysis
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    if apply_shadow_removal:
        processed_gray = normalize_illumination(gray)
    else:
        processed_gray = gray

    # 3. Enhanced Legibility Gating & Sharpness Metrics
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur_score = float(laplacian_var)
    contrast_range = float(gray.max() - gray.min())

    if blur_score >= 80.0 and contrast_range >= 50.0:
        confidence_tier = "high"
        quality_rating = "good"
    elif blur_score < 25.0 or contrast_range < 35.0:
        confidence_tier = "poor_legibility"
        quality_rating = "poor_legibility"
    else:
        confidence_tier = "ambiguous"
        quality_rating = "acceptable"

    # 4. Optional Ink Color Separation or Binary Mask
    if apply_ink_isolation:
        ink_mask = isolate_ink_strokes(image)
        final_image = ink_mask
    elif apply_binary_mask:
        final_image = denoise_and_threshold(processed_gray)
    elif apply_shadow_removal and processed_gray is not gray:
        final_image = processed_gray
    else:
        final_image = image

    if len(final_image.shape) == 2:
        final_image = cv2.cvtColor(final_image, cv2.COLOR_GRAY2BGR)

    line_strips = []
    if extract_lines:
        line_strips = segment_prescription_lines(image)

    success, encoded_img = cv2.imencode('.jpg', final_image, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    if not success:
        raise RuntimeError("Failed to encode preprocessed image")

    preprocessed_bytes = encoded_img.tobytes()
    b64_result = base64.b64encode(preprocessed_bytes).decode('utf-8')

    return {
        "success": True,
        "original_resolution": {"width": orig_w, "height": orig_h},
        "processed_resolution": {"width": final_image.shape[1], "height": final_image.shape[0]},
        "was_dewarped": was_dewarped,
        "sharpness_score": blur_score,
        "quality_assessment": quality_rating,
        "confidence_tier": confidence_tier,
        "line_strips": line_strips,
        "base64_jpeg": b64_result,
        "dewarped": was_dewarped,
        "processed_image": final_image
    }


class PreprocessEngine:
    """Preprocess Engine facade for CV operations."""
    def preprocess_image_bytes(self, image_bytes: bytes, **kwargs) -> Dict[str, Any]:
        return preprocess_medical_document(image_bytes, **kwargs)

    def isolate_ink_strokes(self, image: np.ndarray) -> np.ndarray:
        return isolate_ink_strokes(image)

    def segment_prescription_lines(self, image: np.ndarray, **kwargs) -> List[Dict[str, Any]]:
        return segment_prescription_lines(image, **kwargs)


cv_preprocessor = PreprocessEngine()
