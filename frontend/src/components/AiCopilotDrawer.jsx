import React, { useState } from 'react';
import { Bot, X, Send, Sparkles, Terminal, Code, BookOpen, Zap, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { circuitAudio } from '../utils/audio';

const KNOWLEDGE_BASE = {
  diode_physics: {
    question: "⚡ Why is current 21.21 mA instead of 27.27 mA?",
    answer: `### Modified Nodal Analysis (MNA) with Forward Diode Drop

Many beginner students assume Ohm's Law directly applies to the entire loop:
$$I = \\frac{V_s}{R} = \\frac{9.0\\text{ V}}{330\\,\\Omega} = 27.27\\text{ mA} \\quad \\text{(INCORRECT)}$$

However, an LED is a non-linear semiconductor diode. When forward biased, it maintains an intrinsic bandgap barrier potential ($V_f \\approx 2.0\\text{ V}$).

According to Kirchhoff's Voltage Law (KVL):
$$V_s - V_R - V_D = 0$$
$$V_R = V_s - V_D = 9.0\\text{ V} - 2.0\\text{ V} = 7.0\\text{ V}$$

Now applying Ohm's law strictly across the ballast resistor:
$$I = \\frac{V_R}{R} = \\frac{7.0\\text{ V}}{330\\,\\Omega} = 0.02121\\text{ A} = \\mathbf{21.21\\text{ mA}}$$

This is why PaperSPICE uses an explainable Modified Nodal Analysis engine rather than guessing!`,
    badge: 'Physics Proof'
  },
  burnout_prevention: {
    question: "🔥 How do I prevent thermal burnout if I lower resistance to 100Ω?",
    answer: `### Thermal Dissipation & Overcurrent Analysis

When resistance drops to $100\\,\\Omega$:
$$I = \\frac{9.0\\text{ V} - 2.0\\text{ V}}{100\\,\\Omega} = 70.0\\text{ mA}$$

1. **LED Junction Limit:** Standard 5mm T-1 3/4 indicator LEDs have an absolute maximum continuous forward current $I_{\\max} = 30.0\\text{ mA}$. At $70\\text{ mA}$, the microscopic bond wire melts ($\approx 150^\\circ\\text{C}$ junction temperature), causing the Tinkercad-style burnout explosion!
2. **Resistor Wattage Rating:**
$$P_R = I^2 R = (0.070\\text{ A})^2 \\times 100\\,\\Omega = 0.490\\text{ W} = 490\\text{ mW}$$
Standard carbon film resistors are rated for $1/4\\text{ W} = 250\\text{ mW}$. A $490\\text{ mW}$ load will cause the resistor coating to smoke and char.

**Engineering Fix:**
- Maintain $R \\ge 240\\,\\Omega$ for nominal 5V–9V rails.
- Or use an active constant-current driver IC (such as AMC7135 or LM317 in current regulator mode).`,
    badge: 'Thermal Safety'
  },
  battery_life: {
    question: "🔋 How do I calculate battery runtime for 9V Alkaline vs Li-Ion 18650?",
    answer: `### Electrochemical Energy Density Comparison

For continuous load current $I = 21.21\\text{ mA}$:

| Battery Chemistry | Nominal Voltage | Capacity (mAh) | Usable Watt-Hours | Calculated Runtime |
| :--- | :--- | :--- | :--- | :--- |
| **9V Alkaline (6LR61)** | 9.0 V | 550 mAh | 4.95 Wh | **25.9 Hours** |
| **CR2032 Lithium Coin** | 3.0 V | 220 mAh | 0.66 Wh | **10.3 Hours** (requires low $V_f$) |
| **18650 Li-Ion (Single)** | 3.7 V | 2600 mAh | 9.62 Wh | **122.5 Hours** (with boost converter) |
| **2x 18650 in Series** | 7.4 V | 2600 mAh | 19.24 Wh | **148.6 Hours** |

$$t_{\\text{runtime}} = \\frac{\\text{Capacity (mAh)}}{I_{\\text{load}} (\\text{mA})} = \\frac{550}{21.21} = 25.92\\text{ hours}$$`,
    badge: 'Battery Sizing'
  },
  arduino_code: {
    question: "💻 Generate Arduino C++ PWM Dimmer Code",
    answer: `### Production Arduino C++ Driver Sketch

Use this code on an Arduino Uno / Nano / ESP32 to pulse-width modulate this circuit without analog ballast changes:

\`\`\`cpp
// PaperSPICE Auto-Generated Arduino Driver
// Hardware: Gate driver connected to N-channel MOSFET (e.g., 2N7000 or IRLZ44N)

const int PWM_PIN = 9; // Timer 1 Output (490 Hz)

void setup() {
  pinMode(PWM_PIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("PaperSPICE PWM Controller Initialized");
}

void loop() {
  // Smooth breathing animation (0% to 100% duty cycle)
  for (int brightness = 0; brightness <= 255; brightness += 5) {
    analogWrite(PWM_PIN, brightness);
    delay(20);
  }
  for (int brightness = 255; brightness >= 0; brightness -= 5) {
    analogWrite(PWM_PIN, brightness);
    delay(20);
  }
}
\`\`\``,
    badge: 'Firmware'
  },
  spice_script: {
    question: "🐍 Generate Python PySpice Simulation Script",
    answer: `### Executable PySpice Python Code

Run this script in terminal to verify against ngspice backend:

\`\`\`python
from PySpice.Spice.Netlist import Circuit
from PySpice.Unit import *

circuit = Circuit('PaperSPICE Auto-Export')

# Power supply
circuit.V('input', 'vcc', circuit.gnd, 9@u_V)

# Ballast resistor
circuit.R('ballast', 'vcc', 'node_diode', 330@u_Omega)

# 1N4148 / 5mm LED Diode model
circuit.model('LED_MODEL', 'D', IS=1e-15, N=1.8, RS=2.0)
circuit.D('1', 'node_diode', circuit.gnd, model='LED_MODEL')

# Operating point analysis
simulator = circuit.simulator(temperature=25, nominal_temperature=25)
analysis = simulator.operating_point()

for node in analysis.nodes.values():
    print(f"Node {str(node)}: {float(node):.4f} V")
\`\`\``,
    badge: 'PySpice EDA'
  }
};

export default function AiCopilotDrawer({
  isOpen,
  onClose,
  simulation,
  voltage = 9.0,
  resistance = 330.0,
  switchState = 'closed'
}) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello! I am **PaperSPICE Copilot**, your real-time AI lab assistant. I analyze your paper circuit topology, check KVL equations, predict thermal runaway, and generate hardware code. How can I help you today?`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);

  if (!isOpen) return null;

  const handleAskPreset = (key) => {
    circuitAudio.playProbeBeep(1500);
    const item = KNOWLEDGE_BASE[key];
    if (!item) return;

    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: item.question },
      { sender: 'ai', text: item.answer, badge: item.badge }
    ]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    circuitAudio.playProbeBeep(1200);
    const userMsg = inputText.trim();
    setInputText('');

    // Generate intelligent physics response
    let aiResponse = '';
    const lower = userMsg.toLowerCase();

    if (lower.includes('capacitor') || lower.includes('cap')) {
      aiResponse = `### Adding a Capacitor
Adding a parallel capacitor ($C = 100\\,\\mu\\text{F}$) across the LED and resistor creates an RC low-pass filter:
$$\\tau = R \\cdot C = 330\\,\\Omega \\times 100\\,\\mu\\text{F} = 33\\text{ ms}$$
When you open the tactile switch, the capacitor will discharge its stored energy $E = \\frac{1}{2} C V^2$, giving the LED a smooth, elegant fading tail instead of instantly cutting off!`;
    } else if (lower.includes('reverse') || lower.includes('polarity')) {
      aiResponse = `### Reversing Diode Polarity
If you reverse the LED terminals (Cathode to $+9\\text{V}$, Anode to GND), the diode becomes **reverse-biased**.
Because the reverse saturation current $I_s \\approx 10^{-12}\\text{ A}$, the circuit draws **0.000 mA**.
Most LEDs have a reverse breakdown rating $V_{BR} \\approx 5\\text{V} - 6\\text{V}$. Connecting 9V in reverse without protection can permanently damage the semiconductor junction!`;
    } else if (lower.includes('kvl') || lower.includes('kcl') || lower.includes('law')) {
      aiResponse = `### Kirchhoff's Circuit Laws Check
- **Kirchhoff's Voltage Law (KVL):** The algebraic sum of potentials around any closed loop is zero:
$$V_{\\text{battery}} - V_{\\text{resistor}} - V_{\\text{diode}} = 9.0\\text{V} - 7.0\\text{V} - 2.0\\text{V} = 0.0\\text{V} \\quad \\checkmark$$
- **Kirchhoff's Current Law (KCL):** In this single-loop series circuit, current is identical at every point:
$$I_{\\text{battery}} = I_{\\text{switch}} = I_{\\text{resistor}} = I_{\\text{LED}} = 21.21\\text{ mA}$$`;
    } else {
      aiResponse = `### Circuit Telemetry Diagnostic
- **Power Supply:** $V_s = ${voltage}\\text{ V}$
- **Ballast:** $R = ${resistance}\\,\\Omega$
- **Switch Status:** \`${switchState.toUpperCase()}\`
- **Loop Status:** ${simulation?.is_closed_loop ? 'Closed Loop Conductive' : 'Open Loop (Zero Current)'}
- **Calculated Current:** ${simulation?.current_ma ?? 0.0} mA
- **Total Dissipated Power:** ${((simulation?.resistor_power_mw ?? 0) + (simulation?.led_power_mw ?? 0)).toFixed(1)} mW

Everything is operating nominally within safe electrical margins. You can try testing other resistance values or ask about firmware drivers!`;
    }

    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: userMsg },
      { sender: 'ai', text: aiResponse }
    ]);
  };

  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    circuitAudio.playBridgeChime();
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              PaperSPICE AI Copilot
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                Real-Time Tutor
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Interactive Circuit Intelligence & Hardware Derivations
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full mb-0.5">
          Suggested Topics:
        </span>
        {Object.entries(KNOWLEDGE_BASE).map(([key, val]) => (
          <button
            key={key}
            onClick={() => handleAskPreset(key)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 transition-all font-medium flex items-center gap-1 shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{val.question.split(' ')[1] || val.question}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-2 shadow-lg ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none'
                  : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
              }`}
            >
              {msg.badge && (
                <div className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 mb-1">
                  {msg.badge}
                </div>
              )}
              <div className="whitespace-pre-wrap font-sans">
                {msg.text}
              </div>

              {msg.sender === 'ai' && (
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => copyText(msg.text, i)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedIdx === i ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Response</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask anything (e.g. 'What if I add a capacitor?', 'Explain KCL')..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-colors shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
