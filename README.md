# ⚡ PaperSPICE
### *Hand-Drawn Paper Sketches ➔ Verified Living Circuit Simulation & SPICE Netlists*

Built for **Banana Hacks 2026** (Theme: Image AI)  
**Live Demo:** [http://localhost:5173](http://localhost:5173) • **Backend API:** [http://localhost:8000](http://localhost:8000)

---

## 🚀 The Core Innovation: Uncertainty-Aware Perception

Most hackathon projects take a shortcut: they upload an image to a generic Vision LLM and let it hallucinate answers. If a hand-drawn wire stops 2 millimeters short of a switch, a blind LLM wrapper simply guesses that the circuit is connected.

**PaperSPICE refuses to guess.**

Instead, it implements an **explainable, topological computer vision pipeline** with an **Uncertainty Gate**:
1. **Adaptive Morphology:** Preprocesses photographs using bilateral filtering and adaptive background subtraction to cancel out phone shadows and paper texture.
2. **Topological Connected-Component Analysis:** Evaluates exact Euclidean continuity between symbol terminals and wire paths.
3. **The Uncertainty Gate:** When an unclosed wire gap (15px to 65px) is detected, PaperSPICE does **not** hallucinate a connection. It immediately halts simulation, highlights the ambiguous coordinates with a warning beacon, and prompts the user to **verify or bridge the gap**.
4. **Modified Nodal Analysis (MNA) Physics:** Once verified, it solves real electrical physics ($I = \frac{V_s - V_{\text{LED}}}{R}$) with non-linear diode forward drops ($V_f = 2.0\text{V}$), animates glowing electron particles at 60 FPS, and exports standard **SPICE 3f5 netlists**.

---

## ⚡ The Live Experience

| Feature | Description |
| :--- | :--- |
| **Proof-of-Perception Overlay** | Side-by-side diagnostic viewer showing raw ink vs. detected component bounding boxes, terminals, and wire paths. |
| **The Uncertainty Gate** | Flags ambiguous gaps (e.g. 30.1px gap between Switch and Resistor) with confidence metrics and human-in-the-loop verification. |
| **Living Simulation Canvas** | 60 FPS HTML5 Canvas with animated electron particles traveling at speeds proportional to current $I$. |
| **Interactive Components** | Clickable SPST switch that opens/closes in real time; sliders to adjust battery voltage ($2.5\text{V} - 15\text{V}$) and resistance ($50\Omega - 1500\Omega$). |
| **Digital Multimeter** | Live telemetry displaying branch current ($mA$), resistor drop ($V$), LED drop ($V$), and power dissipation ($mW$). |
| **SPICE 3f5 Export** | One-click copy or `.cir` file download compatible with LTspice, Ngspice, and KiCad. |

---

## 📐 Circuit Physics Model

For the series Battery–Switch–Resistor–LED loop:
$$I = \begin{cases} 0\text{ mA} & \text{if switch is OPEN or loop has unbridged gaps} \\ \frac{V_{\text{source}} - V_{\text{LED}}}{R} & \text{if closed loop and } V_{\text{source}} > V_{\text{LED}} \end{cases}$$

* **Nominal State ($9\text{V}$ Battery, $330\Omega$ Resistor, $2\text{V}$ Red LED):**
  $$I = \frac{9.0 - 2.0}{330} \approx 21.21\text{ mA}$$
  * Resistor Power: $P_R = I^2 \cdot R \approx 148.5\text{ mW}$
  * LED Power: $P_{\text{LED}} = I \cdot V_f \approx 42.4\text{ mW}$
  * Total Power: $P_{\text{total}} \approx 190.9\text{ mW}$
* **Overcurrent Stress State ($9\text{V}$ Battery, $100\Omega$ Resistor):**
  $$I = \frac{9.0 - 2.0}{100} = 70.00\text{ mA}$$
  * Triggers **Overcurrent Burnout Warning** (current exceeds standard 30 mA continuous rating).

---

## 🛠️ Project Architecture

```
bananahack/
├── backend/
│   ├── app.py                     # FastAPI REST API
│   ├── pipeline/
│   │   ├── preprocess.py          # Adaptive background subtraction & thinning
│   │   ├── detector.py            # Connected-component topology & Uncertainty Gate
│   │   ├── solver.py              # Series circuit MNA physics & diode model
│   │   ├── visualizer.py          # Proof-of-Perception diagnostic overlay
│   │   └── spice.py               # SPICE 3f5 netlist generator
│   ├── samples/                   # Curated hand-drawn test sketches
│   │   ├── circuit_perfect.png    # Nominal closed loop
│   │   ├── circuit_gap.png        # 30.1px wire gap (Uncertainty Gate demo)
│   │   └── circuit_open_switch.png# Open switch state
│   └── tests/
│       └── test_pipeline.py       # End-to-end unit tests (100% pass)
└── frontend/
    ├── src/
    │   ├── App.jsx                # Workstation controller
    │   └── components/
    │       ├── Header.jsx         # Navigation and tech stack badges
    │       ├── PerceptionViewer.jsx# Proof-of-Perception & Uncertainty Gate UI
    │       ├── SimulatorCanvas.jsx # 60 FPS electron drift canvas
    │       ├── PhysicsControls.jsx# Sliders for voltage and resistance
    │       ├── Multimeter.jsx     # Live power & telemetry inspector
    │       ├── SpiceViewer.jsx    # Code preview & .cir downloader
    │       └── WebcamModal.jsx    # Live webcam scanner
    └── package.json
```

---

## 🚦 Quickstart (Running Locally)

### 1. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install opencv-python-headless numpy scipy fastapi uvicorn python-multipart
uvicorn app:app --host 0.0.0.0 --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🧪 Automated Test Suite
Run the test suite to verify the perception pipeline, gap detection, and physics engine:
```bash
PYTHONPATH=backend backend/venv/bin/python backend/tests/test_pipeline.py
```
**Output:**
```
✅ test_perfect_circuit passed! Current: 21.21 mA, LED: ON
✅ test_uncertainty_gate passed! Successfully caught wire gap: Uncertain gap of 30.1px detected.
✅ test_uncertainty_gate bridging passed! Human-in-the-loop verified.
✅ test_spice_export passed! Valid SPICE netlist syntax generated.

🎉 ALL PIPELINE TESTS PASSED!
```

---

## 🏆 Banana Hacks 2026 Submission Details
* **Theme:** Image AI (Apps, games, and tools)
* **Team:** Solo Developer
* **License:** MIT
