let ambientOsc = null;

export const getAudioContext = () => {
  if (!window.audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window.audioCtx;
};

export function initAmbientAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    // Prevent multiple ambient drones
    if (ambientOsc) return;
    
    ambientOsc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Low, subtle hum
    ambientOsc.type = 'sine';
    ambientOsc.frequency.setValueAtTime(55, ctx.currentTime); // Low A
    
    // LFO for slow volume modulation
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.05, ctx.currentTime); // 20-second cycle
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.02, ctx.currentTime); // depth of modulation
    
    // Base gain extremely low (0.02)
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    
    ambientOsc.connect(gain);
    gain.connect(ctx.destination);
    
    ambientOsc.start();
    lfo.start();
  } catch(e) {
    console.error("Ambient audio failed", e);
  }
}

export function playDiscoveryChime() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.5); // C6
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch(e) {
    console.error("Audio playback failed", e);
  }
}

export function playSpellChime() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880.0, ctx.currentTime); // A5
    osc.frequency.linearRampToValueAtTime(440.0, ctx.currentTime + 0.4); // A4
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  } catch(e) {
    console.error("Audio playback failed", e);
  }
}
