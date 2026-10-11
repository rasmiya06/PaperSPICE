"""
PaperSPICE Physics & Circuit Simulation Engine
Computes voltages, currents, power dissipation, and component states
using rigorous series circuit physics with diode forward-voltage drops.
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Optional

@dataclass
class SimulationResult:
    is_closed_loop: bool
    current_ma: float
    current_amps: float
    voltage_source_v: float
    resistor_voltage_v: float
    led_voltage_v: float
    resistor_ohms: float
    resistor_power_mw: float
    led_power_mw: float
    led_state: str # "ON", "OFF", "OVERCURRENT_WARNING"
    led_brightness: float # 0.0 to 1.0
    status_message: str
    broken_reason: Optional[str] = None

class CircuitSolver:
    """
    Simulates the series Battery-Switch-Resistor-LED circuit.
    Solves I = (V_source - V_LED) / R when the loop is complete.
    """

    def __init__(self, default_voltage=9.0, default_resistance=330.0, default_led_vf=2.0):
        self.default_voltage = default_voltage
        self.default_resistance = default_resistance
        self.default_led_vf = default_led_vf

    def solve(
        self,
        connections: List[Dict],
        bridged_gaps: List[str],
        switch_state: str = "closed",
        voltage_v: float = 9.0,
        resistance_ohms: float = 330.0,
        led_vf: float = 2.0,
        circuit_type: str = "ANALOG_SERIES",
        logic_inputs: Optional[Dict[str, int]] = None,
        components: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Evaluates connectivity and runs electrical / digital logic simulation.
        """
        # Check if circuit is a digital logic gate network
        is_digital = (circuit_type == "DIGITAL_LOGIC") or any("GATE" in c.get("id", "") or "IC" in c.get("id", "") for c in connections)

        # 1. Check wire continuity
        unresolved_gaps = []
        for conn in connections:
            conn_id = conn["id"]
            status = conn["status"]
            if status != "confirmed" and conn_id not in bridged_gaps:
                unresolved_gaps.append(conn)

        if is_digital:
            is_closed = len(unresolved_gaps) == 0
            first_gap_id = unresolved_gaps[0]["id"] if unresolved_gaps else None

            inputs = logic_inputs or {"a": 1, "b": 1, "c": 1}
            a_val = int(inputs.get("a", 1))
            b_val = int(inputs.get("b", 1))
            c_val = int(inputs.get("c", 1))

            # Inspect actual detected gates from components
            gate_comps = []
            if components:
                gate_comps = [c for c in components if "gate" in c.get("type", "") or c.get("type") == "digital_ic"]

            gate_results = {}
            if len(gate_comps) >= 2:
                # Combinational Multi-Gate Network
                g1 = gate_comps[0]
                t1 = g1.get("properties", {}).get("gate_type", "xor")
                if t1 == "xor":
                    out1 = a_val ^ b_val
                elif t1 == "and":
                    out1 = a_val & b_val
                elif t1 == "or":
                    out1 = a_val | b_val
                elif t1 == "nand":
                    out1 = 1 - (a_val & b_val)
                elif t1 == "nor":
                    out1 = 1 - (a_val | b_val)
                elif t1 == "not":
                    out1 = 1 - a_val
                else:
                    out1 = a_val & b_val
                gate_results["U1"] = {"label": g1.get("label", "Gate 1"), "type": t1, "out": out1}

                g2 = gate_comps[1]
                t2 = g2.get("properties", {}).get("gate_type", "not")
                if t2 == "not":
                    out2 = 1 - c_val
                elif t2 == "xor":
                    out2 = out1 ^ c_val
                elif t2 == "and":
                    out2 = out1 & c_val
                elif t2 == "or":
                    out2 = out1 | c_val
                elif t2 == "nand":
                    out2 = 1 - (out1 & c_val)
                elif t2 == "nor":
                    out2 = 1 - (out1 | c_val)
                else:
                    out2 = 1 - c_val
                gate_results["U2"] = {"label": g2.get("label", "Gate 2"), "type": t2, "out": out2}

                if len(gate_comps) >= 3:
                    g3 = gate_comps[2]
                    t3 = g3.get("properties", {}).get("gate_type", "or")
                    if t3 == "or":
                        final_out = out1 | out2
                    elif t3 == "and":
                        final_out = out1 & out2
                    elif t3 == "xor":
                        final_out = out1 ^ out2
                    elif t3 == "nand":
                        final_out = 1 - (out1 & out2)
                    elif t3 == "nor":
                        final_out = 1 - (out1 | out2)
                    else:
                        final_out = out1 | out2
                    gate_results["U3"] = {"label": g3.get("label", "Gate 3"), "type": t3, "out": final_out}
                else:
                    final_out = out2

                gate_out = final_out if is_closed and switch_state == "closed" else 0
                chip_model = "74HC86 (XOR) + 74HC04 (NOT) Combinational"
                status_desc = f"Combinational Logic: A={a_val}, B={b_val}, C={c_val} → Y={gate_out} (Output {'HIGH' if gate_out else 'LOW'})."
            else:
                primary_type = "and"
                chip_model = "TTL 74HC08 (Quad 2-Input AND)"
                if gate_comps:
                    primary_type = gate_comps[0].get("properties", {}).get("gate_type", "and")
                    if primary_type == "xor":
                        chip_model = "TTL 74HC86 (Quad 2-Input XOR)"
                    elif primary_type == "or":
                        chip_model = "TTL 74HC32 (Quad 2-Input OR)"
                    elif primary_type == "not":
                        chip_model = "TTL 74HC04 (Hex Inverter)"
                    elif primary_type == "nand":
                        chip_model = "TTL 74HC00 (Quad 2-Input NAND)"
                    elif primary_type == "nor":
                        chip_model = "TTL 74HC02 (Quad 2-Input NOR)"

                if primary_type == "xor":
                    raw_out = a_val ^ b_val
                elif primary_type == "or":
                    raw_out = a_val | b_val
                elif primary_type == "not":
                    raw_out = 1 - a_val
                elif primary_type == "nand":
                    raw_out = 1 - (a_val & b_val)
                elif primary_type == "nor":
                    raw_out = 1 - (a_val | b_val)
                else:
                    raw_out = a_val & b_val

                gate_out = raw_out if is_closed and switch_state == "closed" else 0
                gate_results["U1"] = {"label": gate_comps[0]["label"] if gate_comps else "AND Gate", "type": primary_type, "out": gate_out}
                status_desc = f"{chip_model}: A={a_val}, B={b_val} → Y={gate_out} (Output {'HIGH' if gate_out else 'LOW'})."

            current_ma = ((5.0 - led_vf) / max(10.0, resistance_ohms) * 1000.0) if gate_out == 1 else 1.2
            res_v = (5.0 - led_vf) if gate_out == 1 else 0.0
            led_v = led_vf if gate_out == 1 else 0.0
            p_res = (current_ma * current_ma * resistance_ohms) / 1000.0 if gate_out == 1 else 0.0
            p_led = current_ma * led_v if gate_out == 1 else 0.0

            return {
                "circuit_type": "DIGITAL_LOGIC",
                "is_closed_loop": is_closed,
                "current_ma": round(current_ma, 2),
                "current_amps": round(current_ma / 1000.0, 4),
                "voltage_source_v": 5.0,  # Standard TTL 5V Logic
                "resistor_voltage_v": round(res_v, 2),
                "led_voltage_v": round(led_v, 2),
                "resistor_ohms": resistance_ohms,
                "resistor_power_mw": round(p_res, 1),
                "led_power_mw": round(p_led, 1),
                "led_state": "ON" if gate_out == 1 else "OFF",
                "led_brightness": 1.0 if gate_out == 1 else 0.0,
                "status_message": status_desc if is_closed else "Logic bus open due to trace gap.",
                "broken_reason": f"Open logic trace: {first_gap_id}" if first_gap_id else None,
                "logic_inputs": {"a": a_val, "b": b_val, "c": c_val},
                "logic_output": gate_out,
                "logic_state": f"LOGIC {'HIGH (5.0V)' if gate_out else 'LOW (0.0V)'}",
                "propagation_delay_ns": 4.2,
                "chip_model": chip_model,
                "gate_results": gate_results
            }

        if len(unresolved_gaps) > 0:
            first_gap = unresolved_gaps[0]
            return asdict(SimulationResult(
                is_closed_loop=False,
                current_ma=0.0,
                current_amps=0.0,
                voltage_source_v=voltage_v,
                resistor_voltage_v=0.0,
                led_voltage_v=0.0,
                resistor_ohms=resistance_ohms,
                resistor_power_mw=0.0,
                led_power_mw=0.0,
                led_state="OFF",
                led_brightness=0.0,
                status_message="Circuit open due to unverified wire gap.",
                broken_reason=f"Open wire gap: {first_gap['id']}"
            ))

        # 2. Check switch state
        if switch_state.lower() != "closed":
            return asdict(SimulationResult(
                is_closed_loop=False,
                current_ma=0.0,
                current_amps=0.0,
                voltage_source_v=voltage_v,
                resistor_voltage_v=0.0,
                led_voltage_v=0.0,
                resistor_ohms=resistance_ohms,
                resistor_power_mw=0.0,
                led_power_mw=0.0,
                led_state="OFF",
                led_brightness=0.0,
                status_message="Switch is OPEN. No current flows.",
                broken_reason="Switch is in OPEN position"
            ))

        # 3. Closed Loop Physics Calculation
        # Guard against zero or negative resistance
        r = max(1.0, float(resistance_ohms))

        if voltage_v <= led_vf:
            # Source voltage is below the diode barrier threshold
            return asdict(SimulationResult(
                is_closed_loop=True,
                current_ma=0.0,
                current_amps=0.0,
                voltage_source_v=voltage_v,
                resistor_voltage_v=0.0,
                led_voltage_v=voltage_v,
                resistor_ohms=r,
                resistor_power_mw=0.0,
                led_power_mw=0.0,
                led_state="OFF",
                led_brightness=0.0,
                status_message=f"Source voltage ({voltage_v}V) is below LED forward threshold ({led_vf}V). Diode is non-conducting."
            ))

        # I = (V_s - V_LED) / R
        v_resistor = voltage_v - led_vf
        i_amps = v_resistor / r
        i_ma = i_amps * 1000.0

        # Power calculations: P = I^2 * R, P = I * V
        p_res_mw = (i_amps ** 2) * r * 1000.0
        p_led_mw = i_amps * led_vf * 1000.0

        # LED State & Brightness
        if i_ma > 35.0:
            led_state = "OVERCURRENT_WARNING"
            brightness = 1.0
            msg = f"WARNING: Current is {round(i_ma, 1)} mA. Exceeds standard 30 mA continuous rating! Risk of LED burnout."
        else:
            led_state = "ON"
            brightness = min(1.0, max(0.1, i_ma / 20.0))
            msg = f"Circuit active. Current: {round(i_ma, 2)} mA. LED glowing at {int(brightness * 100)}% brightness."

        return asdict(SimulationResult(
            is_closed_loop=True,
            current_ma=round(i_ma, 2),
            current_amps=round(i_amps, 5),
            voltage_source_v=round(voltage_v, 2),
            resistor_voltage_v=round(v_resistor, 2),
            led_voltage_v=round(led_vf, 2),
            resistor_ohms=round(r, 1),
            resistor_power_mw=round(p_res_mw, 1),
            led_power_mw=round(p_led_mw, 1),
            led_state=led_state,
            led_brightness=round(brightness, 2),
            status_message=msg,
            broken_reason=None
        ))
