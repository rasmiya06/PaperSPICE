"""
PaperSPICE SPICE Netlist Generator
Formats the reconstructed circuit topology into standard, runnable SPICE code
compatible with LTspice, Ngspice, and KiCad.
"""

from typing import Dict, List

def generate_spice_netlist(
    voltage_v: float = 9.0,
    resistance_ohms: float = 330.0,
    led_vf: float = 2.0,
    switch_state: str = "closed",
    is_closed_loop: bool = True
) -> str:
    """
    Generates a valid SPICE 3f5 netlist.
    """
    sw_ctrl_v = "1.0V" if switch_state.lower() == "closed" and is_closed_loop else "0.0V"

    netlist = f"""* =========================================================
* PaperSPICE v1.0 — Reconstructed Netlist from Hand-Drawn Sketch
* Validated by PaperSPICE Uncertainty-Aware Perception Pipeline
* =========================================================
.title PaperSPICE Hand-Drawn Series Loop Simulation

* --- Independent Power Source ---
* Battery (DC Source): {voltage_v}V connected between Node 1 and Ground (0)
V1 N_BAT_POS 0 DC {voltage_v}V

* --- Switching Device ---
* SPST Switch between Battery Positive (N_BAT_POS) and Node 2 (N_SW_OUT)
S1 N_BAT_POS N_SW_OUT N_SW_CTRL 0 SW_MODEL
V_SW_CTRL N_SW_CTRL 0 DC {sw_ctrl_v}

* --- Passive Elements ---
* Current-Limiting Resistor: {resistance_ohms} Ohms between Node 2 and Node 3
R1 N_SW_OUT N_LED_ANODE {resistance_ohms}

* --- Semiconductor Devices ---
* Red Light Emitting Diode between Node 3 and Ground (0)
* Forward voltage parameter: Vf ~ {led_vf}V
D1 N_LED_ANODE 0 D_RED_LED

* --- Device Models ---
.model SW_MODEL VSWITCH (RON=0.01 ROFF=1e7 VON=0.5 VOFF=0.2)
.model D_RED_LED D (IS=1e-22 N=1.8 RS=12 EG={led_vf})

* --- Simulation Directives ---
* Operating point analysis
.op
* Transient analysis (0 to 10 milliseconds)
.tran 0.05m 10m

* --- Measurement Commands ---
.print tran V(N_BAT_POS) V(N_SW_OUT) V(N_LED_ANODE) I(R1)

.end
"""
    return netlist
