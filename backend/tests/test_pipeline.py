"""
PaperSPICE End-to-End Pipeline Unit Tests
Verifies:
1. Preprocessing and skeletonization
2. Component detection (Battery, Switch, Resistor, LED)
3. Uncertainty Gate gap detection on circuit_gap.png
4. Physics simulation calculations
5. SPICE netlist export syntax
"""

import os
import cv2
import numpy as np
from pipeline.preprocess import preprocess_image
from pipeline.detector import CircuitDetector
from pipeline.solver import CircuitSolver
from pipeline.visualizer import generate_perception_overlay
from pipeline.spice import generate_spice_netlist

def test_perfect_circuit():
    img_path = "backend/samples/circuit_perfect.png"
    assert os.path.exists(img_path), f"File {img_path} not found"

    orig, gray, binary, skel = preprocess_image(img_path)
    detector = CircuitDetector()
    results = detector.detect(orig, binary, skel)

    components = results["components"]
    assert len(components) == 4, f"Expected 4 components, got {len(components)}"

    solver = CircuitSolver()
    sim = solver.solve(
        connections=results["connections"],
        bridged_gaps=[],
        switch_state="closed",
        voltage_v=9.0,
        resistance_ohms=330.0,
        led_vf=2.0
    )

    # Physics test: I = (9 - 2) / 330 = 21.21 mA
    assert sim["is_closed_loop"] == True, "Expected closed loop for perfect circuit"
    assert abs(sim["current_ma"] - 21.21) < 0.1, f"Expected ~21.21 mA, got {sim['current_ma']}"
    assert sim["led_state"] == "ON", "Expected LED to be ON"
    print("✅ test_perfect_circuit passed! Current: 21.21 mA, LED: ON")

def test_uncertainty_gate():
    img_path = "backend/samples/circuit_gap.png"
    assert os.path.exists(img_path), f"File {img_path} not found"

    orig, gray, binary, skel = preprocess_image(img_path)
    detector = CircuitDetector()
    results = detector.detect(orig, binary, skel)

    uncertain_gaps = results["uncertain_gaps"]
    assert len(uncertain_gaps) > 0, "Uncertainty Gate should have detected the wire gap!"
    gap = uncertain_gaps[0]
    print(f"✅ test_uncertainty_gate passed! Successfully caught wire gap: {gap['message']}")

    # Without bridging: Simulation must be OPEN
    solver = CircuitSolver()
    sim_open = solver.solve(
        connections=results["connections"],
        bridged_gaps=[],
        switch_state="closed",
        voltage_v=9.0,
        resistance_ohms=330.0,
        led_vf=2.0
    )
    assert sim_open["is_closed_loop"] == False, "Circuit must remain OPEN while gap is unbridged"
    assert sim_open["current_ma"] == 0.0, "Current must be 0 mA across unbridged gap"

    # With user bridging: Simulation completes and turns ON
    sim_bridged = solver.solve(
        connections=results["connections"],
        bridged_gaps=[gap["connection_id"]],
        switch_state="closed",
        voltage_v=9.0,
        resistance_ohms=330.0,
        led_vf=2.0
    )
    assert sim_bridged["is_closed_loop"] == True, "Circuit must be CLOSED after human bridges the gap"
    assert abs(sim_bridged["current_ma"] - 21.21) < 0.1, "Current must be ~21.21 mA after bridge"
    print("✅ test_uncertainty_gate bridging passed! Human-in-the-loop verified.")

def test_spice_export():
    netlist = generate_spice_netlist(9.0, 330.0, 2.0, "closed", True)
    assert "V1 N_BAT_POS 0 DC 9.0V" in netlist
    assert "R1 N_SW_OUT N_LED_ANODE 330" in netlist
    assert ".end" in netlist
    print("✅ test_spice_export passed! Valid SPICE netlist syntax generated.")

if __name__ == "__main__":
    test_perfect_circuit()
    test_uncertainty_gate()
    test_spice_export()
    print("\n🎉 ALL PIPELINE TESTS PASSED!")
