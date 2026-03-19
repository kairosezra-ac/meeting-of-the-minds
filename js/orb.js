// ══ ORB ENGINE ══
// Animated canvas orbs for each model
// Each orb has idle, thinking, and speaking states

const COLORS = {
  claude:   [242, 101,  34],
  chatgpt:  [ 16, 163, 127],
  gemini:   [251, 188,   4],
  mistral:  [237,  41,  57],
  deepseek: [ 91, 110, 245],
};

const orbs = {};
const orbAnim = {};

function drawOrb(id, colorStr, phase, intensity) {
  const canvas = document.getElementById('orb-' + id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const baseR = Math.min(W, H) * 0.38;

  ctx.clearRect(0, 0, W, H);

  const wobble = intensity * 18;
  const r = Math.max(10, baseR + Math.sin(phase * 2.1) * wobble * 0.6);
  const ox = Math.sin(phase * 1.3) * wobble * 0.4;
  const oy = Math.cos(phase * 1.7) * wobble * 0.3;

  const [R, G, B] = colorStr.split(',').map(Number);

  const grad = ctx.createRadialGradient(
    cx + ox - r * 0.25, cy + oy - r * 0.25, r * 0.05,
    cx + ox, cy + oy, r
  );
  grad.addColorStop(0, `rgba(${R},${G},${B},${0.9 + intensity * 0.1})`);
  grad.addColorStop(0.5, `rgba(${R},${G},${B},${0.5 + intensity * 0.2})`);
  grad.addColorStop(1, `rgba(${R},${G},${B},0)`);

  ctx.beginPath();
  ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Outer glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.4);
  glow.addColorStop(0, `rgba(${R},${G},${B},${intensity * 0.15})`);
  glow.addColorStop(1, `rgba(${R},${G},${B},0)`);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
}

function initOrb(model) {
  const color = COLORS[model].join(',');
  let phase = 0;
  let intensity = 0.3;
  let targetIntensity = 0.3;
  let speaking = false;

  function loop() {
    phase += speaking ? 0.05 : 0.02;
    intensity += (targetIntensity - intensity) * 0.08;
    drawOrb(model, color, phase, intensity);
    orbAnim[model] = requestAnimationFrame(loop);
  }

  orbs[model] = {
    setThinking: function(v) { targetIntensity = v ? 0.7 : 0.3; speaking = false; },
    setSpeaking: function(v) { speaking = v; targetIntensity = v ? 1.0 : 0.3; },
  };

  loop();
}

const modelList = ['claude', 'chatgpt', 'gemini', 'mistral', 'deepseek'];
modelList.forEach(initOrb);
