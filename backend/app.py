"""
PaperSPICE FastAPI Backend Server
Serves the computer vision perception pipeline, interactive simulation engine,
uncertainty bridging, SPICE netlist generation, Electrical Rule Checker (ERC),
and empirical benchmark test harness.
"""

import os
import cv2
import base64
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional

from pipeline.preprocess import preprocess_image
from pipeline.detector import CircuitDetector
from pipeline.solver import CircuitSolver
from pipeline.visualizer import generate_perception_overlay, encode_image_base64
from pipeline.spice import generate_spice_netlist
from pipeline.erc import run_electrical_rule_check
from pipeline.benchmark import run_benchmark_suite

app = FastAPI(title="PaperSPICE API", version="2.0.0")

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = CircuitDetector()
solver = CircuitSolver()

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "samples")

class SimulationRequest(BaseModel):
    connections: List[Dict]
    bridged_gaps: List[str]
    switch_state: str = "closed"
    voltage_v: float = 9.0
    resistance_ohms: float = 330.0
    led_vf: float = 2.0
    circuit_type: Optional[str] = "ANALOG_SERIES"
    logic_inputs: Optional[Dict[str, int]] = None
    components: Optional[List[Dict]] = None

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "PaperSPICE v2.0", "engine": "OpenCV + Modified MNA Solver + ERC"}

@app.get("/api/presets")
def get_presets():
    """Serves the 3 pre-calibrated sample circuits for zero-friction judge evaluation."""
    presets = [
        {
            "id": "preset_gap",
            "title": "⚡ Hero Demo: Uncertainty Wire Gap",
            "description": "Hand-drawn loop with an unclosed 30px gap. Proves our central innovation: the Uncertainty Gate halts simulation until human verification.",
            "file": "circuit_gap.png",
            "badge": "Uncertainty Gate Demo"
        },
        {
            "id": "preset_perfect",
            "title": "🟢 Continuous Closed Loop",
            "description": "Hand-drawn 9V Battery, closed Switch, 330Ω Resistor, and Red LED. Full current (21.2 mA) conducts immediately.",
            "file": "circuit_perfect.png",
            "badge": "Nominal Operation"
        },
        {
            "id": "preset_open_switch",
            "title": "⚪ Open Switch Loop",
            "description": "Switch lever is physically drawn open at 35°. Demonstrates zero-current open circuit physics.",
            "file": "circuit_open_switch.png",
            "badge": "Open Circuit"
        }
    ]

    for p in presets:
        path = os.path.join(SAMPLE_DIR, p["file"])
        if os.path.exists(path):
            img = cv2.imread(path)
            p["image_base64"] = encode_image_base64(img)

    return {"presets": presets}

@app.get("/api/benchmark")
def get_benchmark():
    """Runs the empirical benchmark test suite across all calibrated sketches and returns verified metrics."""
    return run_benchmark_suite(SAMPLE_DIR)

@app.post("/api/scan")
async def scan_circuit(
    file: Optional[UploadFile] = File(None),
    preset_id: Optional[str] = Form(None),
    voltage_v: float = Form(9.0),
    resistance_ohms: float = Form(330.0),
    led_vf: float = Form(2.0),
    switch_state: str = Form("closed")
):
    """
    Perception endpoint: Ingests hand-drawn image (file upload or preset),
    runs Computer Vision perception, generates Proof-of-Perception overlay,
    detects wire gaps, runs ERC validation, and computes initial electrical simulation.
    """
    # 1. Ingest image
    if preset_id:
        preset_file_map = {
            "preset_gap": "circuit_gap.png",
            "preset_perfect": "circuit_perfect.png",
            "preset_open_switch": "circuit_open_switch.png"
        }
        filename = preset_file_map.get(preset_id, "circuit_perfect.png")
        path = os.path.join(SAMPLE_DIR, filename)
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Preset file not found")
        orig_img = cv2.imread(path)
    elif file:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        orig_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if orig_img is None:
            raise HTTPException(status_code=400, detail="Invalid image file format")
    else:
        # Fallback to perfect sample
        path = os.path.join(SAMPLE_DIR, "circuit_perfect.png")
        orig_img = cv2.imread(path)

    # 2. Run Perception Pipeline
    orig_bgr, gray, binary, skel = preprocess_image(orig_img)
    detection = detector.detect(orig_bgr, binary, skel)

    # 3. Generate Diagnostic Proof-of-Perception Overlay
    overlay_img = generate_perception_overlay(orig_bgr, detection)

    # 4. Run Physics Solver
    sim = solver.solve(
        connections=detection["connections"],
        bridged_gaps=[],
        switch_state=switch_state,
        voltage_v=voltage_v,
        resistance_ohms=resistance_ohms,
        led_vf=led_vf,
        circuit_type=detection.get("circuit_type", "ANALOG_SERIES"),
        components=detection["components"]
    )

    # 5. Run Electrical Rule Checker (ERC)
    erc_results = run_electrical_rule_check(
        components=detection["components"],
        connections=detection["connections"],
        bridged_gaps=[],
        simulation=sim,
        switch_state=switch_state,
        voltage_v=voltage_v,
        resistance_ohms=resistance_ohms
    )

    # 6. Generate SPICE Netlist
    spice_netlist = generate_spice_netlist(
        voltage_v=voltage_v,
        resistance_ohms=resistance_ohms,
        led_vf=led_vf,
        switch_state=switch_state,
        is_closed_loop=sim["is_closed_loop"]
    )

    return {
        "components": detection["components"],
        "connections": detection["connections"],
        "uncertain_gaps": detection["uncertain_gaps"],
        "simulation": sim,
        "erc_results": erc_results,
        "spice_netlist": spice_netlist,
        "overlay_image": encode_image_base64(overlay_img),
        "original_image": encode_image_base64(orig_bgr),
        "image_dims": detection["image_dims"]
    }

@app.post("/api/simulate")
def simulate(req: SimulationRequest):
    """
    Real-time interactive simulation endpoint.
    Recalculates circuit physics when user toggles switch, drags resistance slider,
    or bridges an uncertain wire gap. Also reruns live Electrical Rule Checks (ERC).
    """
    sim = solver.solve(
        connections=req.connections,
        bridged_gaps=req.bridged_gaps,
        switch_state=req.switch_state,
        voltage_v=req.voltage_v,
        resistance_ohms=req.resistance_ohms,
        led_vf=req.led_vf,
        circuit_type=req.circuit_type or "ANALOG_SERIES",
        logic_inputs=req.logic_inputs,
        components=req.components
    )

    erc_results = run_electrical_rule_check(
        components=req.components or [],
        connections=req.connections,
        bridged_gaps=req.bridged_gaps,
        simulation=sim,
        switch_state=req.switch_state,
        voltage_v=req.voltage_v,
        resistance_ohms=req.resistance_ohms
    )

    spice = generate_spice_netlist(
        voltage_v=req.voltage_v,
        resistance_ohms=req.resistance_ohms,
        led_vf=req.led_vf,
        switch_state=req.switch_state,
        is_closed_loop=sim["is_closed_loop"]
    )

    return {
        "simulation": sim,
        "erc_results": erc_results,
        "spice_netlist": spice
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
