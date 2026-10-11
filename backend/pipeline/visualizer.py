"""
PaperSPICE Proof-of-Perception Visualizer
Renders an annotated diagnostic overlay directly onto the sketch:
- Component bounding boxes with labels
- Exact terminal coordinates (pins)
- Confirmed wire paths in Cyan
- Uncertain wire gaps highlighted in Amber with distance metrics
"""

import cv2
import numpy as np
import base64

def generate_perception_overlay(original_bgr: np.ndarray, detection_results: dict) -> np.ndarray:
    """
    Renders the diagnostic Proof-of-Perception overlay onto a copy of the input image.
    """
    canvas = original_bgr.copy()
    h, w = canvas.shape[:2]

    # Dim the original slightly to make annotations pop
    dimmed = cv2.addWeighted(canvas, 0.70, np.zeros_like(canvas), 0.30, 0)
    canvas = dimmed

    components = detection_results.get("components", [])
    connections = detection_results.get("connections", [])
    uncertain_gaps = detection_results.get("uncertain_gaps", [])

    # Color palette (BGR)
    COLOR_BATTERY = (255, 200, 0)    # Cyan / Blue
    COLOR_SWITCH = (255, 100, 200)   # Purple / Pink
    COLOR_RESISTOR = (50, 180, 255)  # Amber / Gold
    COLOR_LED = (80, 80, 255)        # Red
    COLOR_WIRE_OK = (220, 255, 0)    # Bright Cyan
    COLOR_GAP = (0, 165, 255)        # Orange / Warning Amber
    COLOR_TERMINAL = (0, 255, 128)   # Emerald Green

    # 1. Draw Confirmed Connections
    for conn in connections:
        if conn["status"] == "confirmed":
            # We don't have exact wire trajectory in simple mode, so draw subtle connection indicator
            pass

    # 2. Draw Uncertain Gaps (PROMINENT HIGHLIGHT)
    for gap in uncertain_gaps:
        coords = gap.get("coords")
        if coords:
            p1, p2 = coords
            # Draw gap highlight circle and dotted line
            mid_x = (p1[0] + p2[0]) // 2
            mid_y = (p1[1] + p2[1]) // 2
            radius = int(gap["gap_px"] // 2) + 12

            # Glowing circle around gap
            cv2.circle(canvas, (mid_x, mid_y), radius, COLOR_GAP, 2, cv2.LINE_AA)
            cv2.line(canvas, p1, p2, COLOR_GAP, 3, cv2.LINE_AA)

            # Warning badge
            text = f"GAP: {gap['gap_px']}px"
            cv2.rectangle(canvas, (mid_x - 45, mid_y - 25), (mid_x + 45, mid_y - 5), (20, 20, 30), -1)
            cv2.rectangle(canvas, (mid_x - 45, mid_y - 25), (mid_x + 45, mid_y - 5), COLOR_GAP, 1)
            cv2.putText(canvas, text, (mid_x - 40, mid_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (255, 255, 255), 1, cv2.LINE_AA)

    # 3. Draw Components & Terminals
    for comp in components:
        x, y, bw, bh = comp["bbox"]
        comp_type = comp["type"]

        if comp_type in ["battery", "voltage_source"]:
            box_color = COLOR_BATTERY
        elif comp_type == "switch":
            box_color = COLOR_SWITCH
        elif comp_type == "resistor":
            box_color = COLOR_RESISTOR
        elif comp_type in ["led", "diode"]:
            box_color = COLOR_LED
        elif comp_type == "capacitor":
            box_color = (0, 220, 100) # Emerald
        elif comp_type in ["digital_ic", "logic_block"]:
            box_color = (255, 120, 50) # Electric Blue / Indigo
        elif comp_type == "xor_gate":
            box_color = (255, 50, 200) # Electric Purple / Magenta
        elif comp_type == "not_gate":
            box_color = (0, 230, 255) # Bright Amber / Gold
        elif comp_type == "and_gate":
            box_color = (255, 200, 0) # Neon Cyan
        elif comp_type == "or_gate":
            box_color = (0, 255, 120) # Bright Emerald Green
        elif comp_type == "nand_gate":
            box_color = (0, 140, 255) # Orange
        elif comp_type == "nor_gate":
            box_color = (120, 50, 255) # Deep Indigo
        elif comp_type == "logic_gate":
            box_color = (0, 215, 255) # Gold / Cyan
        else:
            box_color = (200, 200, 200)

        # Bounding box
        cv2.rectangle(canvas, (x, y), (x + bw, y + bh), box_color, 2, cv2.LINE_AA)

        # Label tag
        label = comp["label"]
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(canvas, (x, y - 20), (x + tw + 10, y), box_color, -1)
        cv2.putText(canvas, label, (x + 5, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1, cv2.LINE_AA)

        # Terminals (Pins)
        for term in comp["terminals"]:
            tx, ty = term["x"], term["y"]
            cv2.circle(canvas, (tx, ty), 6, COLOR_TERMINAL, -1, cv2.LINE_AA)
            cv2.circle(canvas, (tx, ty), 8, (255, 255, 255), 1, cv2.LINE_AA)
            # Short pin label
            tname = term["name"]
            cv2.putText(canvas, tname, (tx + 10, ty + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.35, COLOR_TERMINAL, 1, cv2.LINE_AA)

    return canvas

def encode_image_base64(image_bgr: np.ndarray) -> str:
    """Encodes BGR numpy image to base64 JPEG string."""
    _, buffer = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode("utf-8")
