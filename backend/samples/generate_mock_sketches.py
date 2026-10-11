"""
PaperSPICE Sample Sketch Generator
Generates realistic hand-drawn-style circuit sketches for testing,
benchmarking, and zero-friction demonstration.
"""

import cv2
import numpy as np
import os

def create_paper_background(w=800, h=600):
    """Creates textured cream notebook paper background with faint grid lines."""
    # Warm cream paper color
    paper = np.ones((h, w, 3), dtype=np.uint8) * 248
    paper[:, :, 0] = 242 # Slightly less blue for warm paper feel
    paper[:, :, 1] = 246

    # Add subtle grid lines (notebook graph paper style)
    grid_color = (230, 230, 235)
    for x in range(0, w, 30):
        cv2.line(paper, (x, 0), (x, h), grid_color, 1)
    for y in range(0, h, 30):
        cv2.line(paper, (0, y), (w, y), grid_color, 1)

    # Add slight random noise for paper texture
    noise = np.random.normal(0, 3, (h, w, 3)).astype(np.int16)
    textured = np.clip(paper.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return textured

def draw_hand_line(img, pt1, pt2, color=(30, 30, 35), thickness=3, jitter=1.5):
    """Draws slightly imperfect hand-drawn line with jitter."""
    dist = np.hypot(pt2[0] - pt1[0], pt2[1] - pt1[1])
    num_steps = max(2, int(dist / 6))
    xs = np.linspace(pt1[0], pt2[0], num_steps)
    ys = np.linspace(pt1[1], pt2[1], num_steps)

    pts = []
    for i in range(num_steps):
        jx = np.random.uniform(-jitter, jitter) if 0 < i < num_steps - 1 else 0
        jy = np.random.uniform(-jitter, jitter) if 0 < i < num_steps - 1 else 0
        pts.append((int(xs[i] + jx), int(ys[i] + jy)))

    for i in range(len(pts) - 1):
        cv2.line(img, pts[i], pts[i + 1], color, thickness, cv2.LINE_AA)

def generate_samples(output_dir="/home/yusuf/Desktop/bananahack/backend/samples"):
    os.makedirs(output_dir, exist_ok=True)
    ink = (35, 30, 30) # Dark ballpoint pen ink

    # Coordinates
    w, h = 800, 600
    bat_x, bat_y = 150, 300
    sw_x, sw_y = 400, 120
    res_x, res_y = 650, 300
    led_x, led_y = 400, 480

    # ==========================================
    # SAMPLE 1: PERFECT CLOSED CIRCUIT
    # ==========================================
    img1 = create_paper_background(w, h)

    # 1. Battery (Left)
    # Long line (+) and short thick line (-)
    draw_hand_line(img1, (bat_x - 30, bat_y - 25), (bat_x + 30, bat_y - 25), ink, 3) # Long +
    draw_hand_line(img1, (bat_x - 18, bat_y - 5), (bat_x + 18, bat_y - 5), ink, 5)   # Short -
    draw_hand_line(img1, (bat_x - 30, bat_y + 15), (bat_x + 30, bat_y + 15), ink, 3) # Long +
    draw_hand_line(img1, (bat_x - 18, bat_y + 35), (bat_x + 18, bat_y + 35), ink, 5) # Short -
    # Labels
    cv2.putText(img1, "+", (bat_x + 40, bat_y - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, ink, 2, cv2.LINE_AA)
    cv2.putText(img1, "-", (bat_x + 40, bat_y + 45), cv2.FONT_HERSHEY_SIMPLEX, 0.9, ink, 2, cv2.LINE_AA)
    cv2.putText(img1, "9V", (bat_x - 70, bat_y + 10), cv2.FONT_HERSHEY_SIMPLEX, 0.65, ink, 2, cv2.LINE_AA)

    # 2. Switch (Top, Closed)
    cv2.circle(img1, (sw_x - 40, sw_y), 5, ink, 2, cv2.LINE_AA)
    cv2.circle(img1, (sw_x + 40, sw_y), 5, ink, 2, cv2.LINE_AA)
    draw_hand_line(img1, (sw_x - 35, sw_y), (sw_x + 35, sw_y), ink, 3) # Closed arm
    cv2.putText(img1, "SW1", (sw_x - 20, sw_y - 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, ink, 2, cv2.LINE_AA)

    # 3. Resistor (Right, Zig-zag)
    draw_hand_line(img1, (res_x, res_y - 60), (res_x, res_y - 45), ink, 3)
    draw_hand_line(img1, (res_x, res_y - 45), (res_x + 20, res_y - 30), ink, 3)
    draw_hand_line(img1, (res_x + 20, res_y - 30), (res_x - 20, res_y - 15), ink, 3)
    draw_hand_line(img1, (res_x - 20, res_y - 15), (res_x + 20, res_y), ink, 3)
    draw_hand_line(img1, (res_x + 20, res_y), (res_x - 20, res_y + 15), ink, 3)
    draw_hand_line(img1, (res_x - 20, res_y + 15), (res_x + 20, res_y + 30), ink, 3)
    draw_hand_line(img1, (res_x + 20, res_y + 30), (res_x, res_y + 45), ink, 3)
    draw_hand_line(img1, (res_x, res_y + 45), (res_x, res_y + 60), ink, 3)
    cv2.putText(img1, "330", (res_x + 35, res_y + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, ink, 2, cv2.LINE_AA)

    # 4. LED (Bottom)
    draw_hand_line(img1, (led_x - 30, led_y), (led_x - 5, led_y), ink, 3)
    # Triangle
    triangle = np.array([[led_x - 5, led_y - 20], [led_x - 5, led_y + 20], [led_x + 25, led_y]], np.int32)
    cv2.polylines(img1, [triangle], True, ink, 2, cv2.LINE_AA)
    # Vertical line at tip
    draw_hand_line(img1, (led_x + 25, led_y - 20), (led_x + 25, led_y + 20), ink, 3)
    # Output wire
    draw_hand_line(img1, (led_x + 25, led_y), (led_x + 50, led_y), ink, 3)
    # Arrows for light
    draw_hand_line(img1, (led_x + 10, led_y - 25), (led_x + 25, led_y - 45), ink, 2)
    draw_hand_line(img1, (led_x + 22, led_y - 22), (led_x + 37, led_y - 42), ink, 2)
    cv2.putText(img1, "RED LED", (led_x - 40, led_y + 45), cv2.FONT_HERSHEY_SIMPLEX, 0.6, ink, 2, cv2.LINE_AA)

    # Connecting Wires (Continuous)
    # Wire 1: Battery Top to Switch Left
    draw_hand_line(img1, (bat_x, bat_y - 25), (bat_x, sw_y), ink, 3)
    draw_hand_line(img1, (bat_x, sw_y), (sw_x - 40, sw_y), ink, 3)

    # Wire 2: Switch Right to Resistor Top
    draw_hand_line(img1, (sw_x + 40, sw_y), (res_x, sw_y), ink, 3)
    draw_hand_line(img1, (res_x, sw_y), (res_x, res_y - 60), ink, 3)

    # Wire 3: Resistor Bottom to LED Right
    draw_hand_line(img1, (res_x, res_y + 60), (res_x, led_y), ink, 3)
    draw_hand_line(img1, (res_x, led_y), (led_x + 50, led_y), ink, 3)

    # Wire 4: LED Left to Battery Bottom
    draw_hand_line(img1, (led_x - 30, led_y), (bat_x, led_y), ink, 3)
    draw_hand_line(img1, (bat_x, led_y), (bat_x, bat_y + 35), ink, 3)

    cv2.imwrite(os.path.join(output_dir, "circuit_perfect.png"), img1)

    # ==========================================
    # SAMPLE 2: CIRCUIT WITH UNCERTAIN GAP (HERO DEMO!)
    # Wire between Switch Right and Resistor has a 26px break!
    # ==========================================
    img2 = img1.copy()
    # Erase a segment on the top wire near switch terminal B
    cv2.circle(img2, (sw_x + 68, sw_y), 15, (246, 246, 248), -1)
    # Redraw faint grid through the erased patch
    for x in range(sw_x + 40, sw_x + 95, 30):
        cv2.line(img2, (x, sw_y - 15), (x, sw_y + 15), (230, 230, 235), 1)
    cv2.line(img2, (sw_x + 40, sw_y), (sw_x + 95, sw_y), (230, 230, 235), 1)

    cv2.imwrite(os.path.join(output_dir, "circuit_gap.png"), img2)

    # ==========================================
    # SAMPLE 3: SWITCH OPEN
    # ==========================================
    img3 = img1.copy()
    # Erase closed arm and draw angled open lever
    cv2.rectangle(img3, (sw_x - 35, sw_y - 10), (sw_x + 35, sw_y + 10), (246, 246, 248), -1)
    # Draw open arm angled up 35 degrees
    draw_hand_line(img3, (sw_x - 35, sw_y), (sw_x + 15, sw_y - 30), ink, 3)
    cv2.circle(img3, (sw_x - 40, sw_y), 5, ink, 2, cv2.LINE_AA)
    cv2.circle(img3, (sw_x + 40, sw_y), 5, ink, 2, cv2.LINE_AA)

    cv2.imwrite(os.path.join(output_dir, "circuit_open_switch.png"), img3)
    print(f"Sample sketches successfully generated in {output_dir}")

if __name__ == "__main__":
    generate_samples()
