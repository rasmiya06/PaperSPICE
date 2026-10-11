"""
PaperSPICE Perception Pipeline - Preprocessing Module
Converts raw photographic sketches into clean, binarized ink skeletons
with adaptive handling for uneven lighting and shadows.
"""

import cv2
import numpy as np

def preprocess_image(image_input, max_dim=1200):
    """
    Load and preprocess input image.
    image_input can be:
      - a numpy array (BGR image)
      - a file path string
    Returns:
      - original_bgr: resized original image
      - gray: grayscale image
      - binary_inv: white strokes (255) on black background (0)
      - skeleton: 1-pixel thinned ink paths
    """
    if isinstance(image_input, str):
        image = cv2.imread(image_input)
        if image is None:
            raise ValueError(f"Could not load image from {image_input}")
    else:
        image = image_input.copy()

    # Normalize dimensions if too large
    h, w = image.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # 1. Grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    is_dark_bg = float(np.mean(gray)) < 120.0

    if is_dark_bg:
        # Dark-mode / Blackboard / CAD diagram: bright strokes on dark background
        _, binary = cv2.threshold(gray, 55, 255, cv2.THRESH_BINARY)
        kernel_clean = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        binary_clean = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_clean)
    else:
        # Light paper sketch: dark ink on light background
        dilated = cv2.dilate(gray, np.ones((7, 7), np.uint8))
        bg_diff = cv2.medianBlur(dilated, 21)
        diff = 255 - cv2.absdiff(gray, bg_diff)
        norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8UC1)

        binary = cv2.adaptiveThreshold(
            norm,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            blockSize=25,
            C=10
        )
        kernel_clean = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        binary_clean = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_clean)

    # Thinning / Skeletonization
    skeleton = thin_skeleton(binary_clean)

    return image, gray, binary_clean, skeleton


def thin_skeleton(binary_inv):
    """
    Morphological skeletonization to reduce strokes to 1-pixel centerline paths.
    Works reliably without external C++ packages.
    """
    img = binary_inv.copy()
    skel = np.zeros(img.shape, np.uint8)
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))

    done = False
    iterations = 0
    max_iter = 100

    while not done and iterations < max_iter:
        eroded = cv2.erode(img, element)
        temp = cv2.dilate(eroded, element)
        temp = cv2.subtract(img, temp)
        skel = cv2.bitwise_or(skel, temp)
        img = eroded.copy()

        zeros = cv2.countNonZero(img)
        if zeros == 0:
            done = True
        iterations += 1

    return skel
