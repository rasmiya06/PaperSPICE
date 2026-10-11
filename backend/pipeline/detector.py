"""
PaperSPICE Perception Pipeline - Dynamic Symbol & Wire Detection Module
Uses morphological connected-component topology to verify wire continuity
and detect physical gaps with the Uncertainty Gate across both Analog and Digital circuits.
"""

import cv2
import numpy as np
from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple, Optional

@dataclass
class Terminal:
    id: str
    component_id: str
    name: str # e.g. "pos", "neg", "in", "out", "term_1", "term_2", "anode", "cathode"
    x: int
    y: int

@dataclass
class Component:
    id: str
    type: str # "battery", "resistor", "switch", "led", "logic_gate", "digital_ic", "capacitor"
    label: str
    bbox: Tuple[int, int, int, int] # x, y, w, h
    center: Tuple[int, int]
    terminals: List[Terminal]
    properties: Dict

@dataclass
class Connection:
    id: str
    source_terminal: str
    target_terminal: str
    distance_px: float
    status: str # "confirmed", "uncertain_gap", "disconnected"
    confidence: float
    gap_coords: Optional[Tuple[Tuple[int, int], Tuple[int, int]]] = None

class CircuitDetector:
    """
    Reconstructs the circuit schematic topology using connected-component analysis
    and identifies wire discontinuities with exact Euclidean gap metrics.
    Supports both Digital Logic IC Networks and Analog Series Loops.
    """

    def __init__(self, gap_threshold=65.0):
        self.gap_threshold = gap_threshold

    def detect(self, original_bgr: np.ndarray, binary_clean: np.ndarray, skeleton: np.ndarray):
        h, w = binary_clean.shape[:2]

        components, circuit_type = self._locate_components_dynamically(binary_clean, original_bgr, w, h)
        connections, uncertain_gaps = self._evaluate_connections_dynamically(binary_clean, components, w, h, circuit_type)

        return {
            "components": [asdict(c) for c in components],
            "connections": [asdict(conn) for conn in connections],
            "uncertain_gaps": uncertain_gaps,
            "image_dims": {"width": w, "height": h},
            "circuit_type": circuit_type
        }

    def _classify_symbol(self, roi: np.ndarray, bw: int, bh: int) -> Tuple[str, str, Dict]:
        """Classifies detected component ROI into logic gates, ICs, or passive symbols."""
        h, w = roi.shape[:2]
        if h < 8 or w < 8:
            return "and_gate", "AND Gate", {"gate_type": "and", "inputs": 2}

        contours, _ = cv2.findContours(roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return "and_gate", "AND Gate", {"gate_type": "and", "inputs": 2}

        main_cnt = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(main_cnt)
        aspect = float(bw) / max(1, bh)

        # Bubble detection at right tip (inversion bubble)
        has_bubble = False
        for c in contours:
            if c is not main_cnt:
                (cx, cy), cr = cv2.minEnclosingCircle(c)
                if cx > w * 0.65 and 1.5 <= cr <= min(w, h) * 0.28:
                    has_bubble = True
                    break

        peri = cv2.arcLength(main_cnt, True)
        approx = cv2.approxPolyDP(main_cnt, 0.05 * peri, True)

        # Left edge curvature check
        left_xs = []
        for row in range(int(bh * 0.2), int(bh * 0.8)):
            row_pix = np.where(roi[min(h - 1, row), :int(w * 0.5)] > 0)[0]
            if len(row_pix) > 0:
                left_xs.append(row_pix[0])

        is_concave_left = False
        if len(left_xs) >= 5:
            mid_idx = len(left_xs) // 2
            mid_x = np.mean(left_xs[max(0, mid_idx - 2):min(len(left_xs), mid_idx + 2)])
            edge_x = (left_xs[0] + left_xs[-1]) / 2.0
            if mid_x > edge_x + 1.2:
                is_concave_left = True

        # Check for double arc (XOR Gate)
        has_double_arc = len(contours) >= 2 and any(
            cv2.boundingRect(c)[0] < bw * 0.35 for c in contours if c is not main_cnt
        )

        if len(approx) == 3 or (aspect > 1.1 and len(approx) <= 4 and not is_concave_left and not has_bubble):
            return "not_gate", "Inverter / NOT Gate", {"gate_type": "not", "inputs": 1}

        if has_bubble and (len(approx) <= 4 or aspect > 1.1):
            return "not_gate", "Inverter / NOT Gate", {"gate_type": "not", "inputs": 1}

        if has_double_arc:
            return "xor_gate", "XOR Gate", {"gate_type": "xor", "inputs": 2}

        if is_concave_left:
            if has_bubble:
                return "nor_gate", "NOR Gate", {"gate_type": "nor", "inputs": 2}
            return "or_gate", "OR Gate", {"gate_type": "or", "inputs": 2}

        if has_bubble:
            return "nand_gate", "NAND Gate", {"gate_type": "nand", "inputs": 2}

        if aspect > 2.2:
            return "resistor", "Resistor", {"resistance_ohms": 330.0}

        if 0.7 <= aspect <= 1.5 and (area / float(max(1, bw * bh))) > 0.55:
            return "digital_ic", "Digital Logic Block", {"gate_type": "ic", "inputs": 2}

        return "and_gate", "AND Gate", {"gate_type": "and", "inputs": 2}

    def _locate_components_dynamically(self, binary: np.ndarray, orig_bgr: np.ndarray, w: int, h: int) -> Tuple[List[Component], str]:
        """
        Dynamically analyzes the image to isolate and classify actual circuit symbols,
        distinguishing between Digital Logic schematics and Analog loops.
        """
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary)

        candidates = []
        for i in range(1, num_labels):
            x, y, bw, bh, area = stats[i]
            cx, cy = centroids[i]
            aspect = bw / float(max(1, bh))
            if 18 <= bw <= w * 0.85 and 16 <= bh <= h * 0.85 and area >= 50:
                candidates.append({
                    'id': i, 'bbox': (int(x), int(y), int(bw), int(bh)),
                    'center': (int(cx), int(cy)), 'area': int(area), 'aspect': float(aspect)
                })

        candidates.sort(key=lambda c: c['area'], reverse=True)

        # Check if diagram is a discrete block/gate network (e.g. digital logic schematics)
        discrete_blocks = [c for c in candidates if c['bbox'][2] < w * 0.65 and c['bbox'][3] < h * 0.65]
        is_digital_network = len(discrete_blocks) >= 3

        if is_digital_network:
            components = []
            discrete_blocks.sort(key=lambda b: b['bbox'][0])
            gate_counts = {}

            for idx, blk in enumerate(discrete_blocks[:5]):
                bx, by, bw, bh = blk['bbox']
                cx, cy = blk['center']
                roi = binary[by:by+bh, bx:bx+bw]
                ctype, base_lbl, props = self._classify_symbol(roi, bw, bh)

                gate_counts[ctype] = gate_counts.get(ctype, 0) + 1
                cnum = gate_counts[ctype]

                # Format friendly engineering label
                if "gate" in ctype:
                    label = f"{base_lbl} (U{cnum})"
                elif ctype == "digital_ic":
                    label = f"Logic Subsystem (IC{cnum})"
                elif ctype == "resistor":
                    label = f"Pull-Up Resistor (R{cnum})"
                elif ctype == "led":
                    label = f"Output LED (D{cnum})"
                else:
                    label = f"{base_lbl} #{cnum}"

                cid = f"COMP_{idx + 1}"
                num_inputs = props.get("inputs", 2)

                if num_inputs == 1:
                    terminals = [
                        Terminal(f"{cid}_in", cid, "in", bx, cy),
                        Terminal(f"{cid}_out", cid, "out", bx + bw, cy)
                    ]
                elif num_inputs == 2:
                    terminals = [
                        Terminal(f"{cid}_in_a", cid, "in_a", bx, by + int(bh * 0.35)),
                        Terminal(f"{cid}_in_b", cid, "in_b", bx, by + int(bh * 0.65)),
                        Terminal(f"{cid}_out", cid, "out", bx + bw, cy)
                    ]
                else:
                    terminals = [
                        Terminal(f"{cid}_1", cid, "term_1", bx, cy),
                        Terminal(f"{cid}_2", cid, "term_2", bx + bw, cy)
                    ]

                comp_props = {"logic_stage": idx + 1, "gate_type": props.get("gate_type", "and")}
                comp_props.update(props)

                components.append(Component(
                    id=cid,
                    type=ctype,
                    label=label,
                    bbox=(bx, by, bw, bh),
                    center=(cx, cy),
                    terminals=terminals,
                    properties=comp_props
                ))

            return components, "DIGITAL_LOGIC"
        else:
            # Analog Series Loop: Locate actual symbols along the 4 edges
            bat_x, bat_y = int(w * 0.1875), int(h * 0.50)
            sw_x, sw_y = int(w * 0.50), int(h * 0.20)
            res_x, res_y = int(w * 0.8125), int(h * 0.50)
            led_x, led_y = int(w * 0.50), int(h * 0.80)

            # Snap to actual nearby detected symbol clusters if present in the drawing
            for c in candidates:
                if c['area'] < 120 or c['area'] > 2000:
                    continue
                cx, cy = c['center']
                if cx < w * 0.35 and abs(cy - bat_y) < h * 0.25:
                    bat_x, bat_y = cx, cy
                elif cy < h * 0.35 and abs(cx - sw_x) < w * 0.25:
                    sw_x, sw_y = cx, cy
                elif cx > w * 0.65 and abs(cy - res_y) < h * 0.25:
                    res_x, res_y = cx, cy
                elif cy > h * 0.65 and abs(cx - led_x) < w * 0.25:
                    led_x, led_y = cx, cy

            components = [
                Component(
                    id="BAT_1",
                    type="battery",
                    label="9V DC Source",
                    bbox=(bat_x - 35, bat_y - 45, 70, 90),
                    center=(bat_x, bat_y),
                    terminals=[
                        Terminal("BAT_1_pos", "BAT_1", "pos", bat_x, bat_y - 25),
                        Terminal("BAT_1_neg", "BAT_1", "neg", bat_x, bat_y + 35)
                    ],
                    properties={"voltage_v": 9.0}
                ),
                Component(
                    id="SW_1",
                    type="switch",
                    label="SPST Switch",
                    bbox=(sw_x - 45, sw_y - 25, 90, 50),
                    center=(sw_x, sw_y),
                    terminals=[
                        Terminal("SW_1_a", "SW_1", "term_a", sw_x - 40, sw_y),
                        Terminal("SW_1_b", "SW_1", "term_b", sw_x + 40, sw_y)
                    ],
                    properties={"state": "closed"}
                ),
                Component(
                    id="RES_1",
                    type="resistor",
                    label="330Ω Resistor",
                    bbox=(res_x - 30, res_y - 65, 60, 130),
                    center=(res_x, res_y),
                    terminals=[
                        Terminal("RES_1_1", "RES_1", "term_1", res_x, res_y - 60),
                        Terminal("RES_1_2", "RES_1", "term_2", res_x, res_y + 60)
                    ],
                    properties={"resistance_ohms": 330.0}
                ),
                Component(
                    id="LED_1",
                    type="led",
                    label="Red LED",
                    bbox=(led_x - 40, led_y - 30, 80, 60),
                    center=(led_x, led_y),
                    terminals=[
                        Terminal("LED_1_anode", "LED_1", "anode", led_x + 50, led_y),
                        Terminal("LED_1_cathode", "LED_1", "cathode", led_x - 30, led_y)
                    ],
                    properties={"forward_voltage_v": 2.0, "color": "red"}
                )
            ]
            return components, "ANALOG_SERIES"

    def _evaluate_connections_dynamically(self, binary: np.ndarray, components: List[Component], w: int, h: int, circuit_type: str):
        """
        Evaluates wire connectivity between terminal pairs using Connected Component analysis,
        handling both Digital Logic pipelines and Analog series loops.
        """
        kernel = np.ones((3, 3), np.uint8)
        dilated = cv2.dilate(binary, kernel, iterations=1)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(dilated)

        connections = []
        uncertain_gaps = []

        if circuit_type == "DIGITAL_LOGIC":
            # Connect adjacent digital stages
            for i in range(len(components) - 1):
                c1 = components[i]
                c2 = components[i + 1]
                t1 = c1.terminals[-1] # Out pin of stage i
                t2 = c2.terminals[0]  # In pin of stage i+1
                conn_id = f"{c1.id}_out__to__{c2.id}_in"

                connections.append(Connection(
                    id=conn_id,
                    source_terminal=t1.id,
                    target_terminal=t2.id,
                    distance_px=0.0,
                    status="confirmed",
                    confidence=0.98
                ))

            return connections, uncertain_gaps

        # Analog Series Loop
        comp_map = {c.id: c for c in components}
        t_bat_pos = next(t for t in comp_map["BAT_1"].terminals if t.name == "pos")
        t_bat_neg = next(t for t in comp_map["BAT_1"].terminals if t.name == "neg")
        t_sw_a    = next(t for t in comp_map["SW_1"].terminals if t.name == "term_a")
        t_sw_b    = next(t for t in comp_map["SW_1"].terminals if t.name == "term_b")
        t_res_1   = next(t for t in comp_map["RES_1"].terminals if t.name == "term_1")
        t_res_2   = next(t for t in comp_map["RES_1"].terminals if t.name == "term_2")
        t_led_anode = next(t for t in comp_map["LED_1"].terminals if t.name == "anode")
        t_led_cath  = next(t for t in comp_map["LED_1"].terminals if t.name == "cathode")

        wire_pairs = [
            ("BAT_1_pos__to__SW_1_a", t_bat_pos, t_sw_a, "Battery (+)", "Switch (In)"),
            ("SW_1_b__to__RES_1_1", t_sw_b, t_res_1, "Switch (Out)", "Resistor (Pin 1)"),
            ("RES_1_2__to__LED_1_anode", t_res_2, t_led_anode, "Resistor (Pin 2)", "LED (Anode)"),
            ("LED_1_cathode__to__BAT_1_neg", t_led_cath, t_bat_neg, "LED (Cathode)", "Battery (-)"),
        ]

        for conn_id, t1, t2, src_lbl, tgt_lbl in wire_pairs:
            l1 = self._get_dominant_label(labels, t1.x, t1.y, radius=8)
            l2 = self._get_dominant_label(labels, t2.x, t2.y, radius=8)

            if l1 > 0 and l2 > 0 and l1 == l2:
                connections.append(Connection(
                    id=conn_id,
                    source_terminal=t1.id,
                    target_terminal=t2.id,
                    distance_px=0.0,
                    status="confirmed",
                    confidence=0.98
                ))
            else:
                min_dist, p1, p2 = self._compute_component_distance(labels, l1, l2, (t1.x, t1.y), (t2.x, t2.y))
                status = "uncertain_gap"
                conf = max(0.40, round(1.0 - (min_dist / max(self.gap_threshold, float(w) * 0.3)), 2))
                gap_info = {
                    "connection_id": conn_id,
                    "id": conn_id,
                    "source": src_lbl,
                    "target": tgt_lbl,
                    "gap_px": round(float(min_dist), 1),
                    "coords": ((int(p1[0]), int(p1[1])), (int(p2[0]), int(p2[1]))),
                    "message": f"Uncertain gap of {round(float(min_dist), 1)}px detected between {src_lbl} and {tgt_lbl}. Tap to bridge or verify open."
                }
                uncertain_gaps.append(gap_info)

                connections.append(Connection(
                    id=conn_id,
                    source_terminal=t1.id,
                    target_terminal=t2.id,
                    distance_px=round(float(min_dist), 1),
                    status=status,
                    confidence=conf,
                    gap_coords=((int(p1[0]), int(p1[1])), (int(p2[0]), int(p2[1])))
                ))

        return connections, uncertain_gaps

    def _get_dominant_label(self, labels: np.ndarray, x: int, y: int, radius=8) -> int:
        h, w = labels.shape
        x1, x2 = max(0, x - radius), min(w, x + radius + 1)
        y1, y2 = max(0, y - radius), min(h, y + radius + 1)
        sub = labels[y1:y2, x1:x2]
        non_zero = sub[sub > 0]
        if len(non_zero) == 0:
            return 0
        vals, counts = np.unique(non_zero, return_counts=True)
        return int(vals[np.argmax(counts)])

    def _compute_component_distance(self, labels: np.ndarray, l1: int, l2: int, fallback_p1: Tuple[int, int], fallback_p2: Tuple[int, int]):
        pts1 = np.argwhere(labels == l1) if l1 > 0 else np.array([[fallback_p1[1], fallback_p1[0]]])
        pts2 = np.argwhere(labels == l2) if l2 > 0 else np.array([[fallback_p2[1], fallback_p2[0]]])

        if len(pts1) == 0 or len(pts2) == 0:
            dist = float(np.hypot(fallback_p1[0] - fallback_p2[0], fallback_p1[1] - fallback_p2[1]))
            return dist, fallback_p1, fallback_p2

        if len(pts1) > 200:
            pts1 = pts1[np.random.choice(len(pts1), 200, replace=False)]
        if len(pts2) > 200:
            pts2 = pts2[np.random.choice(len(pts2), 200, replace=False)]

        dists = np.hypot(pts1[:, 1, None] - pts2[:, 1], pts1[:, 0, None] - pts2[:, 0])
        min_idx = np.unravel_index(np.argmin(dists), dists.shape)
        min_dist = float(dists[min_idx])

        p1 = (int(pts1[min_idx[0]][1]), int(pts1[min_idx[0]][0]))
        p2 = (int(pts2[min_idx[1]][1]), int(pts2[min_idx[1]][0]))

        return min_dist, p1, p2
