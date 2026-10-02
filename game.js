/**
 * SOYKA GAME - Physics, Gameplay, Audio & Particle Effects Engine
 * Based on Suika Game mechanics with Soyjak face tiers.
 */

// --- 1. TIER DEFINITIONS (Requested order & names) ---
// Order: Soyak -> Smugjak -> Cobson -> Gapejak -> Bernd -> Feraljak -> Markiplier -> Meximutt -> Impjak -> Chudjak
const TIERS = [
  { level: 0, name: "Soyak", radius: 24, sx: 0.8110, sy: 1.0000, score: 2, imageSrc: "assets/soyjaks/soyak.png", color: "#e2e8f0" },
  { level: 1, name: "Smugjak", radius: 32, sx: 0.7221, sy: 1.0000, score: 4, imageSrc: "assets/soyjaks/smugjak.png", color: "#cbd5e1" },
  { level: 2, name: "Cobson", radius: 42, sx: 0.6061, sy: 1.0000, score: 8, imageSrc: "assets/soyjaks/cobson.png", color: "#94a3b8" },
  { level: 3, name: "Gapejak", radius: 52, sx: 0.6590, sy: 1.0000, score: 16, imageSrc: "assets/soyjaks/gapejak.png", color: "#64748b" },
  { level: 4, name: "Bernd", radius: 64, sx: 0.6578, sy: 1.0000, score: 32, imageSrc: "assets/soyjaks/bernd.png", color: "#f87171" },
  { level: 5, name: "Feraljak", radius: 78, sx: 0.7348, sy: 1.0000, score: 64, imageSrc: "assets/soyjaks/feraljak.png", color: "#fb923c" },
  { level: 6, name: "Markiplier", radius: 94, sx: 0.6295, sy: 1.0000, score: 128, imageSrc: "assets/soyjaks/markiplier.png", color: "#facc15" },
  { level: 7, name: "Meximutt", radius: 114, sx: 0.9247, sy: 1.0000, score: 256, imageSrc: "assets/soyjaks/meximutt.png", color: "#4ade80" },
  { level: 8, name: "Impjak", radius: 136, sx: 0.9302, sy: 1.0000, score: 512, imageSrc: "assets/soyjaks/impjak.png", color: "#38bdf8" },
  { level: 9, name: "Chudjak", radius: 165, sx: 0.7030, sy: 1.0000, score: 1024, imageSrc: "assets/soyjaks/chudjak.png", color: "#e11d48" }
];

// Preload Images
const loadedImages = {};
let imagesReady = 0;
TIERS.forEach(t => {
  const img = new Image();
  img.src = t.imageSrc;
  img.onload = () => {
    imagesReady++;
  };
  loadedImages[t.level] = img;
});

// Preload Gem Image
const gemImage = new Image();
gemImage.src = 'assets/gem.png';

// --- 2. AUDIO SYNTHESIS & SOUND EFFECTS (Web Audio API with .wav fallback) ---
class SoundController {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.audioPool = {};
    this.initFallbackAudios();
  }

  initFallbackAudios() {
    this.audioPool['drop'] = new Audio('assets/sounds/drop.wav');
    this.audioPool['bounce'] = new Audio('assets/sounds/bounce.wav');
    this.audioPool['gameover'] = new Audio('assets/sounds/gameover.wav');
    this.audioPool['chudmerge'] = new Audio('assets/sounds/chudmerge.mp3');
    for (let i = 0; i < TIERS.length; i++) {
      this.audioPool[`merge_${i}`] = new Audio(`assets/sounds/merge_${i}.wav`);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playDrop() {
    if (!this.enabled) return;
    this.ensureContext();
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (this.audioPool['drop']) {
      this.audioPool['drop'].currentTime = 0;
      this.audioPool['drop'].play().catch(() => { });
    }
  }

  playBounce(intensity = 1) {
    if (!this.enabled) return;
    this.ensureContext();
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const vol = Math.min(0.25, 0.08 * intensity);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  playMerge(level) {
    if (!this.enabled) return;
    this.ensureContext();
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const baseFreq = 220 * Math.pow(1.11, level);

      // Dual osc for rich pop chord
      [1, 1.25, 1.5].forEach((mult, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq * mult, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * mult * 1.35, now + 0.22);

        gain.gain.setValueAtTime(0.25 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      });
    } else if (this.audioPool[`merge_${level}`]) {
      this.audioPool[`merge_${level}`].currentTime = 0;
      this.audioPool[`merge_${level}`].play().catch(() => { });
    }
  }

  playClick() {
    this.ensureContext();
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  }

  playExplosion() {
    if (!this.enabled) return;
    this.ensureContext();
    if (this.ctx) {
      const now = this.ctx.currentTime;
      // Low boom oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);

      // Noise burst for debris crackle
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(1200, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.35);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    }
  }

  playChudMerge() {
    if (!this.enabled) return;
    this.ensureContext();
    if (this.audioPool['chudmerge']) {
      this.audioPool['chudmerge'].currentTime = 0;
      this.audioPool['chudmerge'].play().catch(() => { });
    }
  }

  playBadgeZap() {
    if (!this.enabled) return;
    this.ensureContext();
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  }

  playBlender() {
    if (!this.enabled) return;
    this.ensureContext();
    if (this.ctx) {
      const now = this.ctx.currentTime;
      // 1. Heavy industrial motor churn (low frequency sawtooth rumble)
      const motorOsc = this.ctx.createOscillator();
      const motorGain = this.ctx.createGain();
      motorOsc.type = 'sawtooth';
      motorOsc.frequency.setValueAtTime(65, now);
      motorOsc.frequency.linearRampToValueAtTime(140, now + 0.8);
      motorOsc.frequency.linearRampToValueAtTime(160, now + 1.8);
      motorOsc.frequency.exponentialRampToValueAtTime(40, now + 2.8);

      motorGain.gain.setValueAtTime(0.25, now);
      motorGain.gain.linearRampToValueAtTime(0.35, now + 1.0);
      motorGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

      motorOsc.connect(motorGain);
      motorGain.connect(this.ctx.destination);
      motorOsc.start(now);
      motorOsc.stop(now + 2.8);

      // 2. High-speed churning gear whine & sloshing
      const gearOsc = this.ctx.createOscillator();
      const gearGain = this.ctx.createGain();
      gearOsc.type = 'triangle';
      gearOsc.frequency.setValueAtTime(180, now);
      gearOsc.frequency.linearRampToValueAtTime(380, now + 1.2);
      gearOsc.frequency.exponentialRampToValueAtTime(80, now + 2.7);

      gearGain.gain.setValueAtTime(0.15, now);
      gearGain.gain.exponentialRampToValueAtTime(0.001, now + 2.7);

      gearOsc.connect(gearGain);
      gearGain.connect(this.ctx.destination);
      gearOsc.start(now);
      gearOsc.stop(now + 2.7);

      // 3. Bottom drain suction gurgle (at t + 1.3s)
      const drainOsc = this.ctx.createOscillator();
      const drainGain = this.ctx.createGain();
      drainOsc.type = 'sine';
      drainOsc.frequency.setValueAtTime(220, now + 1.2);
      drainOsc.frequency.exponentialRampToValueAtTime(45, now + 2.8);

      drainGain.gain.setValueAtTime(0.001, now);
      drainGain.gain.setValueAtTime(0.28, now + 1.3);
      drainGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

      drainOsc.connect(drainGain);
      drainGain.connect(this.ctx.destination);
      drainOsc.start(now + 1.2);
      drainOsc.stop(now + 2.8);
    }
  }

  playGameOver() {
    if (!this.enabled) return;
    this.ensureContext();
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.55);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (this.audioPool['gameover']) {
      this.audioPool['gameover'].currentTime = 0;
      this.audioPool['gameover'].play().catch(() => { });
    }
  }
}

// --- 3. PARTICLE & POP EFFECT SYSTEM ---
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  spawnMergeEffect(x, y, color, count = 16, tierName = "", scoreGain = 0) {
    // Confetti / Starburst particles
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 2.5 + Math.random() * 5.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: color,
        alpha: 1,
        life: 0.9 + Math.random() * 0.3,
        decay: 0.025 + Math.random() * 0.02
      });
    }
  }

  spawnMixerGrindParticles(x, y) {
    const whiteColors = ["#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0"];
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3 + Math.random() * 4,
        color: whiteColors[Math.floor(Math.random() * whiteColors.length)],
        alpha: 0.9,
        life: 0.8,
        decay: 0.035
      });
    }
  }

  spawnDrainVortexParticles(bottomX, bottomY) {
    // Puree slurry droplets sucked downwards through the base
    const colors = ["#b91c1c", "#991b1b", "#7f1d1d", "#dc2626", "#ef4444"];
    for (let i = 0; i < 8; i++) {
      const offsetX = (Math.random() - 0.5) * 160;
      const startY = bottomY - 30 - Math.random() * 80;
      this.particles.push({
        x: bottomX + offsetX,
        y: startY,
        vx: -offsetX * 0.08 + (Math.random() - 0.5) * 2,
        vy: 4 + Math.random() * 6,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0.6,
        decay: 0.03
      });
    }
  }

  spawnExplosionParticles(x, y, radius = 50) {
    const fireColors = ["#ef4444", "#f97316", "#eab308", "#ffffff", "#4b5563"];
    const count = 32;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 8.5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 4 + Math.random() * 6,
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        alpha: 1,
        life: 0.8,
        decay: 0.03 + Math.random() * 0.02
      });
    }
  }

  update() {
    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // subtle gravity
      p.vx *= 0.96;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy;
      t.alpha -= t.decay;
      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();
    // Render Particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render Floating texts
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.font = "bold 15px 'Outfit', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 8;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}

// --- 4. COOKIE-PERSISTED "FELL FOR IT AGAIN" AWARD MANAGER ---
class AwardManager {
  constructor() {
    this.container = document.getElementById('pinned-awards-container');
    this.countEl = document.getElementById('award-count');
    this.cookieKey = 'soyka_fell_for_it_awards';
    this.highestZIndex = 100;
    this.awards = this.loadAwardsFromCookies();
    // Initialize highestZIndex based on any existing awards
    this.awards.forEach(a => {
      if (a.zIndex && a.zIndex > this.highestZIndex) {
        this.highestZIndex = a.zIndex;
      }
    });
    this.renderAllAwards();
  }

  // Load array of awards from document.cookie
  loadAwardsFromCookies() {
    try {
      const match = document.cookie.match(new RegExp('(^|;)\\s*' + this.cookieKey + '=([^;]+)'));
      if (match) {
        const decoded = decodeURIComponent(match[2]);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not read award cookies:', e);
    }
    // Fallback to localStorage if cookies disabled or empty
    try {
      const local = localStorage.getItem(this.cookieKey);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { }
    return [];
  }

  // Save awards list into cookies (valid for 1 year) & localStorage backup
  saveAwardsToCookies() {
    try {
      const json = JSON.stringify(this.awards);
      const encoded = encodeURIComponent(json);
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${this.cookieKey}=${encoded}; expires=${expires}; path=/; SameSite=Lax`;
      localStorage.setItem(this.cookieKey, json);
    } catch (e) {
      console.warn('Could not write award cookies:', e);
    }
    if (this.countEl) {
      this.countEl.textContent = this.awards.length;
    }
  }

  // Award 1 "Fell For It Again" award, pin at random point on screen, and save in cookies
  awardOne() {
    // Generate random coordinate on the viewport, with margins so it stays visible
    const padX = 60;
    const padY = 80;
    const maxW = Math.max(200, window.innerWidth - padX * 2);
    const maxH = Math.max(200, window.innerHeight - padY * 2);

    const randX = padX + Math.random() * maxW;
    const randY = padY + Math.random() * maxH;
    const randRot = (Math.random() - 0.5) * 44; // -22 to +22 degrees angle

    this.highestZIndex++;
    const awardObj = {
      id: 'award_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      x: Math.round(randX),
      y: Math.round(randY),
      rotation: Math.round(randRot),
      zIndex: this.highestZIndex,
      awardedAt: new Date().toISOString()
    };

    this.awards.push(awardObj);
    this.saveAwardsToCookies();
    this.renderAward(awardObj, true);
  }

  renderAllAwards() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.awards.forEach(a => this.renderAward(a, false));
    if (this.countEl) {
      this.countEl.textContent = this.awards.length;
    }
  }

  renderAward(awardObj, isNew = false) {
    if (!this.container) return;

    const el = document.createElement('div');
    el.className = 'pinned-award-sticker' + (isNew ? ' award-spawn-anim' : '');
    el.id = awardObj.id;
    el.style.left = `${awardObj.x}px`;
    el.style.top = `${awardObj.y}px`;
    el.style.zIndex = `${awardObj.zIndex || 100}`;
    el.style.setProperty('--rot', `${awardObj.rotation}deg`);
    el.style.transform = `rotate(${awardObj.rotation}deg)`;
    el.title = `Fell For It Again Award #${this.awards.indexOf(awardObj) + 1}\nEarned: ${new Date(awardObj.awardedAt).toLocaleTimeString()}`;

    el.innerHTML = `<img src="assets/fell_for_it_award.png" alt="Fell For It Again Award">`;

    // On localhost, right click deletes award
    el.addEventListener('contextmenu', (e) => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        e.preventDefault();
        e.stopPropagation();
        this.removeAward(awardObj.id);
      }
    });

    // Make stickers draggable around the page for fun!
    this.makeDraggable(el, awardObj);

    this.container.appendChild(el);
  }

  removeAward(awardId) {
    const idx = this.awards.findIndex(a => a.id === awardId);
    if (idx !== -1) {
      this.awards.splice(idx, 1);
    }
    const el = document.getElementById(awardId);
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    this.saveAwardsToCookies();
  }

  makeDraggable(element, awardObj) {
    let isDragging = false;

    // Physics simulation state for rotation around the cursor grab point
    let angle = (awardObj.rotation || 0) * (Math.PI / 180);
    let angularVelocity = 0;
    let animId = null;

    // Grab point in element local unrotated coordinates (0..68, 0..84)
    let localGrabX = 34;
    let localGrabY = 42;

    // Center of mass in element local coordinates (estimated slightly below medal center)
    const COM_LOCAL_X = 34;
    const COM_LOCAL_Y = 50;

    // Distance and vector from grab point to COM in unrotated body frame
    let armLength = 16;
    let rx_body = 0;
    let ry_body = 16;

    // Cursor position, velocity and acceleration tracking
    let lastTime = 0;
    let lastCursorX = 0, lastCursorY = 0;
    let cursorVx = 0, cursorVy = 0;
    let cursorAx = 0, cursorAy = 0;
    let currentCursorX = 0, currentCursorY = 0;

    // Natural physics constants for a small 68x84 handheld medal/sticker (~7cm):
    // In screen pixels (approx 1000px = 1m), natural gravity is ~9800 px/s^2.
    // Setting GRAVITY to 7200 px/s^2 produces an authentic ~0.4s pendulum period.
    const GRAVITY = 7200;
    const DAMPING = 0.992;  // subtle realistic air drag

    const updatePhysics = (time) => {
      if (!isDragging) return;
      if (!lastTime) lastTime = time;
      const elapsed = Math.min(0.04, Math.max(0.001, (time - lastTime) / 1000));
      lastTime = time;

      // 4 sub-steps per frame for smooth 360-degree rotation stability
      const subSteps = 4;
      const dt = elapsed / subSteps;

      for (let s = 0; s < subSteps; s++) {
        // Lever arm from grab point to COM
        const effArm = Math.max(12, armLength);

        // Vector from cursor (pivot) to COM in screen coordinates:
        const cosT = Math.cos(angle);
        const sinT = Math.sin(angle);
        const r_screen_x = cosT * rx_body - sinT * ry_body;
        const r_screen_y = sinT * rx_body + cosT * ry_body;

        // Effective force per unit mass on the COM in the pivot's accelerating frame:
        // Inertial acceleration from hand movement: F_inertial = -a_cursor
        const f_screen_x = -cursorAx * 0.85;
        const f_screen_y = GRAVITY - cursorAy * 0.85;

        // 2D torque: tau/m = r_x * F_y - r_y * F_x
        const torqueOverM = r_screen_x * f_screen_y - r_screen_y * f_screen_x;

        // Realistic moment of inertia for a flat rectangular medal (W=68, H=84):
        // k^2 = (W^2 + H^2)/12 = (4624 + 7056)/12 approx 970
        // I/m = effArm^2 + k^2
        const I_eff = effArm * effArm + 970;
        const angularAcc = torqueOverM / I_eff;

        angularVelocity += angularAcc * dt;
        angularVelocity *= Math.pow(DAMPING, subSteps);
        angle += angularVelocity * dt;
      }

      // Smooth decay of cursor acceleration
      cursorAx *= 0.82;
      cursorAy *= 0.82;

      // Update transform: translate grab point to current cursor position, then rotate around it
      const deg = angle * (180 / Math.PI);
      element.style.transform = `translate(${currentCursorX}px, ${currentCursorY}px) rotate(${deg}deg) translate(${-localGrabX}px, ${-localGrabY}px)`;

      animId = requestAnimationFrame(updatePhysics);
    };

    const onPointerDown = (e) => {
      isDragging = true;
      try {
        element.setPointerCapture(e.pointerId);
      } catch (_) { }

      this.highestZIndex++;
      element.style.cursor = 'grabbing';
      element.style.zIndex = `${this.highestZIndex}`;
      awardObj.zIndex = this.highestZIndex;

      const rect = element.getBoundingClientRect();
      const currentRotRad = (awardObj.rotation || 0) * (Math.PI / 180);

      // Compute click position relative to the element center in UNROTATED space
      const centerScreenX = rect.left + rect.width / 2;
      const centerScreenY = rect.top + rect.height / 2;
      const clickDx = e.clientX - centerScreenX;
      const clickDy = e.clientY - centerScreenY;

      // Unrotate by -currentRotRad:
      const cosA = Math.cos(-currentRotRad);
      const sinA = Math.sin(-currentRotRad);
      const unrotDx = clickDx * cosA - clickDy * sinA;
      const unrotDy = clickDx * sinA + clickDy * cosA;

      // Exact local coordinates of grab point inside the 68x84 element:
      localGrabX = Math.max(1, Math.min(67, 34 + unrotDx));
      localGrabY = Math.max(1, Math.min(83, 42 + unrotDy));

      // Calculate arm vector from this exact grab point to center of mass
      rx_body = COM_LOCAL_X - localGrabX;
      ry_body = COM_LOCAL_Y - localGrabY;
      armLength = Math.hypot(rx_body, ry_body);

      // Reset base left/top so transform handles position from origin (0,0)
      element.style.left = '0px';
      element.style.top = '0px';
      element.style.transformOrigin = '0 0';

      currentCursorX = e.clientX;
      currentCursorY = e.clientY;
      lastCursorX = e.clientX;
      lastCursorY = e.clientY;
      cursorVx = 0;
      cursorVy = 0;
      cursorAx = 0;
      cursorAy = 0;
      lastTime = performance.now();

      angle = currentRotRad;
      angularVelocity = 0;

      const deg = angle * (180 / Math.PI);
      element.style.transform = `translate(${currentCursorX}px, ${currentCursorY}px) rotate(${deg}deg) translate(${-localGrabX}px, ${-localGrabY}px)`;

      animId = requestAnimationFrame(updatePhysics);

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      currentCursorX = e.clientX;
      currentCursorY = e.clientY;

      const now = performance.now();
      const dt = Math.max(0.004, (now - (lastTime || now)) / 1000);

      const dx = e.clientX - lastCursorX;
      const dy = e.clientY - lastCursorY;
      const newVx = dx / dt;
      const newVy = dy / dt;

      // Instantaneous cursor acceleration
      cursorAx = (newVx - cursorVx) / dt;
      cursorAy = (newVy - cursorVy) / dt;

      const maxA = 16000;
      cursorAx = Math.max(-maxA, Math.min(maxA, cursorAx));
      cursorAy = Math.max(-maxA, Math.min(maxA, cursorAy));

      cursorVx = newVx;
      cursorVy = newVy;
      lastCursorX = e.clientX;
      lastCursorY = e.clientY;
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      if (animId) cancelAnimationFrame(animId);

      try {
        element.releasePointerCapture(e.pointerId);
      } catch (_) { }

      element.style.cursor = 'grab';
      element.style.zIndex = `${this.highestZIndex}`;
      awardObj.zIndex = this.highestZIndex;

      // Normalize final angle into [-180, 180] degrees
      const deg = Math.round((angle * (180 / Math.PI)) % 360);
      const normalizedDeg = ((deg + 180) % 360) - 180;
      awardObj.rotation = normalizedDeg;
      element.style.setProperty('--rot', `${normalizedDeg}deg`);

      // Calculate where the center of the element ended up in screen coordinates:
      const finalRotRad = normalizedDeg * (Math.PI / 180);
      const cosA = Math.cos(finalRotRad);
      const sinA = Math.sin(finalRotRad);

      // The unrotated center is at (34 - localGrabX, 42 - localGrabY) relative to grab point
      const toCenterX = 34 - localGrabX;
      const toCenterY = 42 - localGrabY;
      const centerScreenX = currentCursorX + (cosA * toCenterX - sinA * toCenterY);
      const centerScreenY = currentCursorY + (sinA * toCenterX + cosA * toCenterY);

      // Static position with transform-origin at center (50% 50%):
      awardObj.x = Math.round(centerScreenX - 34);
      awardObj.y = Math.round(centerScreenY - 42);

      element.style.transformOrigin = '50% 50%';
      element.style.left = `${awardObj.x}px`;
      element.style.top = `${awardObj.y}px`;
      element.style.transform = `rotate(${normalizedDeg}deg)`;

      this.saveAwardsToCookies();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    element.addEventListener('pointerdown', onPointerDown);
  }
}

// --- 4B. GEM & SHOP ITEM SYSTEM: Collectible gems and Merchant shop items with award-like drag physics & cookie persistence ---
class GemManager {
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('pinned-awards-container');
    this.gems = [];
    this.radius = 32; // Size of Smugjak (radius 32)
    this.highestZIndex = 500;
    this.cookieKey = 'soyka_saved_gems';
    this.externalWalls = null;
    this.lastSaveTime = 0;

    window.addEventListener('resize', () => {
      this.setupExternalBoundaries();
    });

    window.addEventListener('beforeunload', () => {
      this.saveGemsToCookies();
    });
  }

  // Ensure external screen walls prevent gems and items from falling into the void
  setupExternalBoundaries() {
    if (!this.game || !this.game.world) return;
    const { Bodies, World } = Matter;
    const thickness = 200;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    if (this.externalWalls) {
      World.remove(this.game.world, this.externalWalls);
    }

    // Setup screen floor and side walls for gems & shop items
    const gemBoundaryFilter = {
      category: 0x0002,
      mask: 0x0004
    };

    const screenFloor = Bodies.rectangle(
      winW / 2,
      winH + thickness / 2,
      winW + 1200,
      thickness,
      {
        isStatic: true,
        friction: 0.9,
        frictionStatic: 1.0,
        restitution: 0.2,
        collisionFilter: gemBoundaryFilter
      }
    );

    const screenLeftWall = Bodies.rectangle(
      -thickness / 2,
      winH / 2,
      thickness,
      winH * 3,
      {
        isStatic: true,
        friction: 0.4,
        frictionStatic: 0.8,
        restitution: 0.2,
        collisionFilter: gemBoundaryFilter
      }
    );

    const screenRightWall = Bodies.rectangle(
      winW + thickness / 2,
      winH / 2,
      thickness,
      winH * 3,
      {
        isStatic: true,
        friction: 0.4,
        frictionStatic: 0.8,
        restitution: 0.2,
        collisionFilter: gemBoundaryFilter
      }
    );

    this.externalWalls = [screenFloor, screenLeftWall, screenRightWall];

    // Merchant character collider in top left so gems collide with him
    const merchantEl = document.getElementById('merchant-character');
    if (merchantEl) {
      const rect = merchantEl.getBoundingClientRect();
      const merchantRadius = Math.max(rect.width, rect.height) / 2;
      const merchantBody = Bodies.circle(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        merchantRadius,
        {
          isStatic: true,
          restitution: 0.35,
          friction: 0.2,
          collisionFilter: gemBoundaryFilter
        }
      );
      merchantBody.isMerchant = true;
      this.externalWalls.push(merchantBody);
    }

    World.add(this.game.world, this.externalWalls);
  }

  getSavedGemsFromCookies() {
    // Check localStorage first as it is immediate and not subject to cookie size limits
    try {
      const local = localStorage.getItem(this.cookieKey);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read gem localStorage:', e);
    }
    try {
      const match = document.cookie.match(new RegExp('(^|;)\\s*' + this.cookieKey + '=([^;]+)'));
      if (match && match[2]) {
        const decoded = decodeURIComponent(match[2]);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read gem cookies:', e);
    }
    return [];
  }

  saveGemsToCookies() {
    try {
      const data = this.gems.map(g => {
        return {
          id: g.body.gemId,
          screenX: Math.round(g.body.position.x),
          screenY: Math.round(g.body.position.y),
          angle: g.body.angle || 0,
          itemType: g.itemType || 'gem',
          funkoIndex: g.funkoIndex !== undefined ? g.funkoIndex : null
        };
      });

      const json = JSON.stringify(data);
      localStorage.setItem(this.cookieKey, json);

      try {
        const encoded = encodeURIComponent(json);
        const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `${this.cookieKey}=${encoded}; expires=${expires}; path=/; SameSite=Lax`;
      } catch (cookieErr) {
        console.warn('Cookie write error (localStorage intact):', cookieErr);
      }
    } catch (e) {
      console.warn('Could not write gem storage:', e);
    }
  }

  loadGemsFromCookies() {
    const saved = this.getSavedGemsFromCookies();
    if (!saved || saved.length === 0) return;

    for (const item of saved) {
      const sx = item.screenX !== undefined ? item.screenX : (item.gameX || 100);
      const sy = item.screenY !== undefined ? item.screenY : (item.gameY || 100);
      const angle = item.angle !== undefined ? item.angle : 0;
      const type = item.itemType || 'gem';
      if (type === 'gem') {
        this.spawnGem(sx, sy, false, item.id, angle, false);
      } else {
        this.spawnShopItem(type, sx, sy, false, item.id, angle, item.funkoIndex, false);
      }
    }
    this.saveGemsToCookies();
  }

  // Spawn a physics gem in screen coordinates with diamond polygon hitbox
  spawnGem(x, y, giveImpulse = true, existingId = null, existingAngle = 0, shouldSave = true) {
    const { Bodies, World, Vertices } = Matter;

    // Diamond polygon vertices matching assets/gem.png (width: 64, height: 50.72)
    const diamondVerts = [
      { x: 0.48, y: 17.76 },
      { x: 3.20, y: 13.04 },
      { x: 13.84, y: 4.48 },
      { x: 23.52, y: 0.80 },
      { x: 39.36, y: 0.40 },
      { x: 48.00, y: 3.52 },
      { x: 51.12, y: 5.04 },
      { x: 61.36, y: 13.68 },
      { x: 63.36, y: 20.64 },
      { x: 60.80, y: 24.24 },
      { x: 31.84, y: 49.92 },
      { x: 2.96, y: 24.40 },
      { x: 0.72, y: 21.20 }
    ];

    const centroid = Vertices.centre(diamondVerts);

    const body = Bodies.fromVertices(x, y, [diamondVerts], {
      restitution: 0.18,
      friction: 0.75,
      frictionStatic: 1.0,
      frictionAir: 0.003,
      density: 0.002,
      collisionFilter: {
        category: 0x0004,
        mask: 0x0004 | 0x0002
      }
    });

    if (existingAngle) {
      Matter.Body.setAngle(body, existingAngle);
    }

    body.isGem = true;
    body.isShopItem = false;
    body.gemId = existingId || ('gem_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    body.isHeld = false;
    body.gemWidth = 64;
    body.gemHeight = 51;
    body.spriteOffset = { x: centroid.x, y: centroid.y };

    if (giveImpulse) {
      // Pop upwards and sideways slightly
      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 4,
        y: -3.5 - Math.random() * 2
      });
    }

    World.add(this.game.world, body);

    // Create DOM element for rich award-style physics rendering and interaction
    const el = document.createElement('div');
    el.className = 'pinned-award-sticker gem-sticker';
    el.id = body.gemId;
    el.style.width = '64px';
    el.style.height = '51px';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.zIndex = '500';
    el.title = 'Gem! Drag it around, toss it, or bring it to the Merchant!';
    el.innerHTML = `<img src="assets/gem.png" alt="Gem">`;

    // On localhost, right click deletes gem
    el.addEventListener('contextmenu', (e) => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        e.preventDefault();
        e.stopPropagation();
        this.removeGem(body.gemId);
      }
    });

    if (this.container) {
      this.container.appendChild(el);
    }

    const gemData = {
      body,
      el,
      rotation: existingAngle,
      isDragging: false,
      itemType: 'gem'
    };

    this.makeDraggable(gemData);
    this.gems.push(gemData);
    if (shouldSave) {
      this.saveGemsToCookies();
    }
  }

  // Spawn one of the 3 merchant shop items (fbi badge, pager, funko pop)
  spawnShopItem(itemType, x, y, giveImpulse = true, existingId = null, existingAngle = 0, existingFunkoIndex = null, shouldSave = true) {
    const { Bodies, World, Vertices } = Matter;

    let width = 60;
    let height = 60;
    let imgSrc = '';
    let title = '';
    let verts = null;
    let funkoIndex = null;

    if (itemType === 'cia_badge' || itemType === 'fbi_badge') {
      itemType = 'cia_badge';
      width = 56;
      height = 71;
      imgSrc = 'assets/merchant_shop/ciabadge.png';
      title = 'CIA Badge! Drag onto a Jak to make that tier glow & colorize!';
      verts = [
        { x: 10.2, y: 22.6 },
        { x: 24.8, y: 0.5 },
        { x: 29.2, y: 0.0 },
        { x: 46.0, y: 21.5 },
        { x: 45.9, y: 68.2 },
        { x: 45.0, y: 69.8 },
        { x: 12.2, y: 70.3 },
        { x: 10.5, y: 69.2 }
      ];
    } else if (itemType === 'pager') {
      // Shrunk pager size (originally 75x53, shrunk ~28% to 54x38)
      width = 54;
      height = 38;
      imgSrc = 'assets/merchant_shop/pager.png';
      title = 'Pager! Drag onto a Jak to detonate it and blow surrounding Jaks away!';
      verts = [
        { x: 1, y: 5 }, { x: 4, y: 2 }, { x: 6, y: 1 }, { x: 46, y: 1 }, { x: 48, y: 2 },
        { x: 50, y: 4 }, { x: 52, y: 6 }, { x: 52, y: 32 }, { x: 50, y: 35 }, { x: 46, y: 36 },
        { x: 6, y: 36 }, { x: 3, y: 35 }, { x: 1, y: 32 }
      ];
    } else {
      // Funko pop (21 varieties from funko_0.png to funko_20.png)
      itemType = 'funko_pop';
      if (existingFunkoIndex !== null && existingFunkoIndex !== undefined && !isNaN(existingFunkoIndex)) {
        funkoIndex = Math.max(0, Math.min(20, parseInt(existingFunkoIndex, 10)));
      } else {
        funkoIndex = Math.floor(Math.random() * 21);
      }
      width = 64;
      height = 88;
      imgSrc = `assets/merchant_shop/funkopops/funko_${funkoIndex}.png`;
      title = `Funko Pop #${funkoIndex + 1}! Collectible item.`;
      verts = [
        { x: 4, y: 4 }, { x: 60, y: 4 }, { x: 60, y: 84 }, { x: 4, y: 84 }
      ];
    }

    const centroid = Vertices.centre(verts);

    const body = Bodies.fromVertices(x, y, [verts], {
      restitution: 0.18,
      friction: 0.75,
      frictionStatic: 1.0,
      frictionAir: 0.003,
      density: 0.0025,
      collisionFilter: {
        category: 0x0004,
        mask: 0x0004 | 0x0002
      }
    });

    if (existingAngle) {
      Matter.Body.setAngle(body, existingAngle);
    }

    body.isGem = true;
    body.isShopItem = true;
    body.itemType = itemType;
    body.gemId = existingId || ('shop_item_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    body.isHeld = false;
    body.gemWidth = width;
    body.gemHeight = height;
    body.spriteOffset = { x: centroid.x, y: centroid.y };

    if (giveImpulse) {
      // Pop forward and downward in front of the merchant
      Matter.Body.setVelocity(body, {
        x: 1.5 + Math.random() * 2.5,
        y: 1.0 + Math.random() * 2.0
      });
    }

    World.add(this.game.world, body);

    const el = document.createElement('div');
    el.className = 'pinned-award-sticker gem-sticker';
    el.id = body.gemId;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.zIndex = '500';
    el.title = title;
    el.innerHTML = `<img src="${imgSrc}" alt="${itemType}">`;

    // On localhost, right click deletes item
    el.addEventListener('contextmenu', (e) => {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalhost) {
        e.preventDefault();
        e.stopPropagation();
        this.removeGem(body.gemId);
      }
    });

    if (this.container) {
      this.container.appendChild(el);
    }

    const gemData = {
      body,
      el,
      rotation: existingAngle,
      isDragging: false,
      itemType,
      funkoIndex
    };

    this.makeDraggable(gemData);
    this.gems.push(gemData);
    if (shouldSave) {
      this.saveGemsToCookies();
    }
  }

  // Handle item application when released over a soyjak
  applyItemOnJak(itemType, cursorX, cursorY) {
    if (!this.game || !this.game.world) return false;
    const canvasRect = this.game.canvas.getBoundingClientRect();

    // Check if cursor is inside vat canvas
    if (
      cursorX < canvasRect.left ||
      cursorX > canvasRect.right ||
      cursorY < canvasRect.top ||
      cursorY > canvasRect.bottom
    ) {
      return false;
    }

    // Convert screen coordinates to canvas internal game coordinates
    const scale = this.game.width / canvasRect.width;
    const gameX = (cursorX - canvasRect.left) * scale;
    const gameY = (cursorY - canvasRect.top) * scale;

    // Find soyjak body under or closest to cursor
    const bodies = Matter.Composite.allBodies(this.game.world);
    let targetJak = null;
    let minDist = Infinity;

    for (const b of bodies) {
      if (b.gameTier !== undefined) {
        const tier = TIERS[b.gameTier];
        const r = tier ? tier.radius : 30;
        const dist = Math.hypot(b.position.x - gameX, b.position.y - gameY);
        if (dist <= r + 15 && dist < minDist) {
          minDist = dist;
          targetJak = b;
        }
      }
    }

    if (!targetJak) return false;

    if (itemType === 'cia_badge' || itemType === 'fbi_badge') {
      // Colorize this tier with a random vibrant, rich glowing color
      const tierIndex = targetJak.gameTier;
      // Curated rich glowing color palette spanning neon, cyber, pastel, hot neon, and vivid tones
      const currentTierColor = (this.game.customColors && this.game.customColors[tierIndex]) || '';
      
      // Broad diverse palette of high-contrast vibrant glowing shades
      const colorPalettes = [
        // Cyber & Neons
        '#00ffea', '#ff0055', '#00ff66', '#ff00ff', '#ffe600', '#00e5ff',
        '#ff3300', '#76ff03', '#d500f9', '#00b0ff', '#ff1744', '#ff9100',
        // Electric Jewels
        '#69f0ae', '#b388ff', '#ff4081', '#18ffff', '#ffd740', '#ff5252',
        '#7c4dff', '#64ffda', '#eeff41', '#e040fb', '#40c4ff', '#ff6e40',
        // Toxic & Radioactive
        '#aeea00', '#00e676', '#ffab00', '#f50057', '#651fff', '#00b8d4',
        // Candy & Vaporwave
        '#ff70a6', '#ff9770', '#ffd670', '#e9ff70', '#70d6ff', '#b57bee',
        '#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0', '#06d6a0',
        // Hot Magmas & Golds
        '#ff3838', '#ff9f1a', '#fff200', '#17c0eb', '#c56cf0', '#7158e2',
        '#3ae374', '#67e6dc', '#ffb8b8', '#ff3838', '#fa8231', '#20bf6b'
      ];

      // Also allow full randomized HSL with diverse saturation and lightness to guarantee endless variety
      let randomColor;
      if (Math.random() < 0.6) {
        // Pick from curated striking glowing colors that isn't the same as current
        const candidates = colorPalettes.filter(c => c.toLowerCase() !== currentTierColor.toLowerCase());
        randomColor = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        // Generate random vibrant HSL with high glow impact
        const h = Math.floor(Math.random() * 360);
        const s = 80 + Math.floor(Math.random() * 20); // 80% - 100%
        const l = 50 + Math.floor(Math.random() * 25); // 50% - 75%
        randomColor = `hsl(${h}, ${s}%, ${l}%)`;
      }

      this.game.setTierCustomColor(tierIndex, randomColor);
      this.game.sound.playBadgeZap();

      // Spawn colorful zap particles around the target jak
      this.game.particles.spawnMergeEffect(
        targetJak.position.x,
        targetJak.position.y,
        randomColor,
        24,
        TIERS[tierIndex].name,
        0
      );
      return true;
    } else if (itemType === 'pager') {
      // Detonate and delete this jak, launching surrounding jaks away dramatically
      const blastX = targetJak.position.x;
      const blastY = targetJak.position.y;
      const blastRadius = 380;
      const blastForce = 0.22;

      this.game.sound.playExplosion();
      this.game.particles.spawnExplosionParticles(blastX, blastY, blastRadius);

      // Remove the detonated jak
      Matter.World.remove(this.game.world, targetJak);

      // Knock back all surrounding jaks forcefully
      for (const b of bodies) {
        if (b.gameTier !== undefined && b !== targetJak) {
          const dx = b.position.x - blastX;
          const dy = b.position.y - blastY;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < blastRadius) {
            const factor = (blastRadius - dist) / blastRadius;
            const forceMag = factor * blastForce;
            const normX = dx / dist;
            const normY = dy / dist;
            // Strong radial kick + extra upward launch lift
            Matter.Body.applyForce(b, b.position, {
              x: normX * forceMag,
              y: normY * forceMag - factor * 0.08
            });
            // Direct velocity kick for immediate dramatic flying motion
            Matter.Body.setVelocity(b, {
              x: b.velocity.x + normX * factor * 14,
              y: b.velocity.y + (normY * factor * 10) - (factor * 9)
            });
          }
        }
      }
      return true;
    }

    return false;
  }

  // Pure award-style dragging with torque physics and cursor inertia
  makeDraggable(gemData) {
    const { el, body, itemType } = gemData;
    let isDragging = false;

    let angle = body.angle || 0;
    let angularVelocity = 0;
    let animId = null;

    const w = body.gemWidth || 64;
    const h = body.gemHeight || 51;
    const COM_LOCAL_X = body.spriteOffset ? body.spriteOffset.x : (w / 2);
    const COM_LOCAL_Y = body.spriteOffset ? body.spriteOffset.y : (h / 2);
    let localGrabX = COM_LOCAL_X;
    let localGrabY = COM_LOCAL_Y;
    let armLength = 12;
    let rx_body = 0, ry_body = 0;

    let lastTime = 0;
    let lastCursorX = 0, lastCursorY = 0;
    let cursorVx = 0, cursorVy = 0;
    let cursorAx = 0, cursorAy = 0;
    let currentCursorX = 0, currentCursorY = 0;

    const GRAVITY = 7200;
    const DAMPING = 0.992;

    const updatePhysics = (time) => {
      if (!isDragging) return;
      if (!lastTime) lastTime = time;
      const elapsed = Math.min(0.04, Math.max(0.001, (time - lastTime) / 1000));
      lastTime = time;

      const subSteps = 4;
      const dt = elapsed / subSteps;

      for (let s = 0; s < subSteps; s++) {
        const effArm = Math.max(10, armLength);
        const cosT = Math.cos(angle);
        const sinT = Math.sin(angle);
        const r_screen_x = cosT * rx_body - sinT * ry_body;
        const r_screen_y = sinT * rx_body + cosT * ry_body;

        const f_screen_x = -cursorAx * 0.85;
        const f_screen_y = GRAVITY - cursorAy * 0.85;
        const torqueOverM = r_screen_x * f_screen_y - r_screen_y * f_screen_x;

        const I_eff = effArm * effArm + 600;
        const angularAcc = torqueOverM / I_eff;

        angularVelocity += angularAcc * dt;
        angularVelocity *= Math.pow(DAMPING, subSteps);
        angle += angularVelocity * dt;
      }

      cursorAx *= 0.82;
      cursorAy *= 0.82;

      // Update DOM transform exactly like PinnedAwardManager
      const deg = angle * (180 / Math.PI);
      el.style.transform = `translate(${currentCursorX}px, ${currentCursorY}px) rotate(${deg}deg) translate(${-localGrabX}px, ${-localGrabY}px)`;

      // Synchronize Matter.js body in screen coordinates so other items collide with it while held
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const toCenterX = COM_LOCAL_X - localGrabX;
      const toCenterY = COM_LOCAL_Y - localGrabY;
      const curCenterX = currentCursorX + (cosA * toCenterX - sinA * toCenterY);
      const curCenterY = currentCursorY + (sinA * toCenterX + cosA * toCenterY);
      Matter.Body.setPosition(body, { x: curCenterX, y: curCenterY });
      Matter.Body.setAngle(body, angle);
      Matter.Body.setVelocity(body, {
        x: Math.max(-25, Math.min(25, cursorVx * 0.02)),
        y: Math.max(-25, Math.min(25, cursorVy * 0.02))
      });
      Matter.Body.setAngularVelocity(body, Math.max(-1.5, Math.min(1.5, angularVelocity * 0.03)));

      animId = requestAnimationFrame(updatePhysics);
    };

    const onPointerDown = (e) => {
      isDragging = true;
      gemData.isDragging = true;
      body.isHeld = true;

      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) { }

      this.highestZIndex++;
      el.style.cursor = 'grabbing';
      el.style.zIndex = `${this.highestZIndex}`;

      const rect = el.getBoundingClientRect();
      const currentRotRad = body.angle || 0;

      const centerScreenX = rect.left + rect.width / 2;
      const centerScreenY = rect.top + rect.height / 2;
      const clickDx = e.clientX - centerScreenX;
      const clickDy = e.clientY - centerScreenY;

      const cosA = Math.cos(-currentRotRad);
      const sinA = Math.sin(-currentRotRad);
      const unrotDx = clickDx * cosA - clickDy * sinA;
      const unrotDy = clickDx * sinA + clickDy * cosA;

      localGrabX = Math.max(1, Math.min(w - 1, w / 2 + unrotDx));
      localGrabY = Math.max(1, Math.min(h - 1, h / 2 + unrotDy));

      rx_body = COM_LOCAL_X - localGrabX;
      ry_body = COM_LOCAL_Y - localGrabY;
      armLength = Math.hypot(rx_body, ry_body);

      // Set base left/top so transform handles position from origin (0,0) during drag
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.transformOrigin = '0 0';

      currentCursorX = e.clientX;
      currentCursorY = e.clientY;
      lastCursorX = e.clientX;
      lastCursorY = e.clientY;
      cursorVx = 0;
      cursorVy = 0;
      cursorAx = 0;
      cursorAy = 0;
      lastTime = performance.now();

      angle = currentRotRad;
      angularVelocity = 0;

      const deg = angle * (180 / Math.PI);
      el.style.transform = `translate(${currentCursorX}px, ${currentCursorY}px) rotate(${deg}deg) translate(${-localGrabX}px, ${-localGrabY}px)`;

      animId = requestAnimationFrame(updatePhysics);

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      currentCursorX = e.clientX;
      currentCursorY = e.clientY;

      const now = performance.now();
      const dt = Math.max(0.004, (now - (lastTime || now)) / 1000);

      const dx = e.clientX - lastCursorX;
      const dy = e.clientY - lastCursorY;
      const newVx = dx / dt;
      const newVy = dy / dt;

      cursorAx = (newVx - cursorVx) / dt;
      cursorAy = (newVy - cursorVy) / dt;

      const maxA = 16000;
      cursorAx = Math.max(-maxA, Math.min(maxA, cursorAx));
      cursorAy = Math.max(-maxA, Math.min(maxA, cursorAy));

      cursorVx = newVx;
      cursorVy = newVy;
      lastCursorX = e.clientX;
      lastCursorY = e.clientY;
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      gemData.isDragging = false;
      body.isHeld = false;
      if (animId) cancelAnimationFrame(animId);

      try {
        el.releasePointerCapture(e.pointerId);
      } catch (_) { }

      el.style.cursor = 'grab';

      // Check if dropped onto a Jak for CIA badge, FBI badge, or Pager items
      if (itemType === 'cia_badge' || itemType === 'fbi_badge' || itemType === 'pager') {
        const consumed = this.applyItemOnJak(itemType, currentCursorX, currentCursorY);
        if (consumed) {
          // Item used and deleted
          this.removeGem(body.gemId);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
          return;
        }
      }

      // Calculate where the center of mass ended up in screen coordinates
      const finalAngle = angle;
      const cosA = Math.cos(finalAngle);
      const sinA = Math.sin(finalAngle);
      const toCenterX = COM_LOCAL_X - localGrabX;
      const toCenterY = COM_LOCAL_Y - localGrabY;
      const centerScreenX = currentCursorX + (cosA * toCenterX - sinA * toCenterY);
      const centerScreenY = currentCursorY + (sinA * toCenterX + cosA * toCenterY);

      // Transfer position and rotation directly to Matter.js physics body
      Matter.Body.setPosition(body, { x: centerScreenX, y: centerScreenY });
      Matter.Body.setAngle(body, finalAngle);

      // Transfer release throw velocity and angular velocity smoothly
      const throwSpeedX = Math.max(-25, Math.min(25, cursorVx * 0.02));
      const throwSpeedY = Math.max(-25, Math.min(25, cursorVy * 0.02));
      Matter.Body.setVelocity(body, {
        x: throwSpeedX,
        y: throwSpeedY
      });

      const releaseAngular = Math.max(-1.5, Math.min(1.5, angularVelocity * 0.03));
      Matter.Body.setAngularVelocity(body, releaseAngular);

      // Re-align DOM styles for physics simulation update loop
      const ox = COM_LOCAL_X;
      const oy = COM_LOCAL_Y;
      const deg = finalAngle * (180 / Math.PI);
      el.style.transformOrigin = `${ox}px ${oy}px`;
      el.style.left = `${centerScreenX - ox}px`;
      el.style.top = `${centerScreenY - oy}px`;
      el.style.transform = `rotate(${deg}deg)`;

      this.saveGemsToCookies();

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    el.addEventListener('pointerdown', onPointerDown);
  }

  // Update visual DOM positions from Matter.js simulation each frame
  update() {
    if (!this.game) return;

    // Filter out destroyed or removed gems
    const activeWorldBodies = Matter.Composite.allBodies(this.game.world);
    this.gems = this.gems.filter(g => {
      if (!activeWorldBodies.includes(g.body)) {
        if (g.el && g.el.parentNode) {
          g.el.parentNode.removeChild(g.el);
        }
        return false;
      }
      return true;
    });

    for (const g of this.gems) {
      if (g.isDragging) continue; // Drag handler animates while held

      // DOM position directly reflects Matter.js physical body in screen coordinates
      const screenX = g.body.position.x;
      const screenY = g.body.position.y;
      const ox = (g.body.spriteOffset ? g.body.spriteOffset.x : (g.body.gemWidth / 2));
      const oy = (g.body.spriteOffset ? g.body.spriteOffset.y : (g.body.gemHeight / 2));
      const deg = g.body.angle * (180 / Math.PI);

      g.el.style.width = `${g.body.gemWidth || 64}px`;
      g.el.style.height = `${g.body.gemHeight || 51}px`;
      g.el.style.transformOrigin = `${ox}px ${oy}px`;
      g.el.style.left = `${screenX - ox}px`;
      g.el.style.top = `${screenY - oy}px`;
      g.el.style.transform = `rotate(${deg}deg)`;
    }

    // Auto-save settled positions and rotations periodically (every 2 seconds)
    const now = performance.now();
    if (this.gems.length > 0 && now - this.lastSaveTime > 2000) {
      this.lastSaveTime = now;
      this.saveGemsToCookies();
    }
  }

  removeGem(gemId) {
    const idx = this.gems.findIndex(g => g.body.gemId === gemId);
    if (idx !== -1) {
      const g = this.gems[idx];
      if (g.el && g.el.parentNode) {
        g.el.parentNode.removeChild(g.el);
      }
      if (this.game.world) {
        Matter.World.remove(this.game.world, g.body);
      }
      this.gems.splice(idx, 1);
    }
    this.saveGemsToCookies();
  }

  // Clean up all gems on game restart
  clear() {
    for (const g of this.gems) {
      if (g.el && g.el.parentNode) {
        g.el.parentNode.removeChild(g.el);
      }
      if (this.game.world) {
        Matter.World.remove(this.game.world, g.body);
      }
    }
    this.gems = [];
    this.saveGemsToCookies();
  }
}

// --- 5. HEAD HITBOX VERTICES (Normalized coordinates traced directly to non-transparent alpha mask) ---
const HEAD_VERTICES = {
  0: [{ "x": -0.5784, "y": -0.3802 }, { "x": -0.4775, "y": -0.7694 }, { "x": -0.391, "y": -0.8703 }, { "x": -0.0883, "y": -1.0 }, { "x": 0.3441, "y": -0.9568 }, { "x": 0.5604, "y": -0.8126 }, { "x": 0.7189, "y": -0.6108 }, { "x": 0.8342, "y": -0.2216 }, { "x": 0.8198, "y": 0.1532 }, { "x": 0.6613, "y": 0.5279 }, { "x": 0.4162, "y": 0.7441 }, { "x": 0.0991, "y": 0.7153 }, { "x": -0.4054, "y": 0.2108 }, { "x": -0.5207, "y": -0.0198 }],
  1: [{ "x": -0.6968, "y": -0.4189 }, { "x": -0.52, "y": -0.7221 }, { "x": -0.3432, "y": -0.9242 }, { "x": 0.0358, "y": -1.0 }, { "x": 0.3642, "y": -0.8611 }, { "x": 0.7053, "y": -0.0653 }, { "x": 0.7179, "y": 0.0737 }, { "x": 0.5284, "y": 0.7432 }, { "x": 0.3516, "y": 0.9453 }, { "x": 0.1116, "y": 0.9958 }, { "x": -0.1537, "y": 0.9326 }, { "x": -0.4063, "y": 0.7558 }, { "x": -0.6716, "y": 0.4021 }, { "x": -0.7095, "y": 0.2379 }],
  2: [{ "x": -0.6061, "y": -0.3868 }, { "x": -0.4764, "y": -0.8231 }, { "x": -0.3113, "y": -0.9764 }, { "x": 0.0425, "y": -1.0 }, { "x": 0.2547, "y": -0.9057 }, { "x": 0.3844, "y": -0.7052 }, { "x": 0.5259, "y": -0.2217 }, { "x": 0.5967, "y": 0.2028 }, { "x": 0.3844, "y": 0.7925 }, { "x": 0.2547, "y": 0.9458 }, { "x": 0.066, "y": 0.9929 }, { "x": -0.217, "y": 0.8868 }, { "x": -0.4646, "y": 0.4387 }, { "x": -0.559, "y": 0.1321 }],
  3: [{ "x": -0.659, "y": -0.558 }, { "x": -0.3356, "y": -0.903 }, { "x": -0.1523, "y": -1.0 }, { "x": 0.2358, "y": -0.9353 }, { "x": 0.5054, "y": -0.6334 }, { "x": 0.5593, "y": -0.4933 }, { "x": 0.6456, "y": 0.1752 }, { "x": 0.5377, "y": 0.628 }, { "x": 0.2682, "y": 0.9084 }, { "x": -0.0337, "y": 0.9946 }, { "x": -0.217, "y": 0.973 }, { "x": -0.4434, "y": 0.8113 }, { "x": -0.5404, "y": 0.6065 }, { "x": -0.6159, "y": 0.283 }],
  4: [{ "x": -0.6461, "y": -0.5059 }, { "x": -0.4343, "y": -0.8235 }, { "x": -0.2461, "y": -0.9529 }, { "x": 0.1186, "y": -0.9882 }, { "x": 0.2716, "y": -0.9529 }, { "x": 0.401, "y": -0.8588 }, { "x": 0.648, "y": -0.5176 }, { "x": 0.6363, "y": 0.1176 }, { "x": 0.3539, "y": 0.7529 }, { "x": 0.201, "y": 0.9059 }, { "x": -0.1167, "y": 0.9882 }, { "x": -0.2578, "y": 0.8941 }, { "x": -0.5284, "y": 0.5059 }, { "x": -0.6461, "y": 0.1059 }],
  5: [{ "x": -0.6261, "y": -0.5796 }, { "x": -0.4219, "y": -0.8919 }, { "x": -0.1697, "y": -0.988 }, { "x": 0.2628, "y": -0.9399 }, { "x": 0.527, "y": -0.7838 }, { "x": 0.7192, "y": -0.3754 }, { "x": 0.7192, "y": 0.3333 }, { "x": 0.5751, "y": 0.7898 }, { "x": 0.3949, "y": 0.9459 }, { "x": 0.1306, "y": 0.982 }, { "x": -0.0976, "y": 0.9339 }, { "x": -0.2297, "y": 0.8498 }, { "x": -0.3979, "y": 0.5976 }, { "x": -0.7222, "y": -0.1592 }],
  6: [{ "x": -0.6295, "y": 0.1907 }, { "x": -0.493, "y": -0.6279 }, { "x": -0.3938, "y": -0.8016 }, { "x": -0.2574, "y": -0.9256 }, { "x": -0.1209, "y": -0.9752 }, { "x": 0.2636, "y": -0.9752 }, { "x": 0.4992, "y": -0.7395 }, { "x": 0.5612, "y": -0.4791 }, { "x": 0.6233, "y": -0.0078 }, { "x": 0.5984, "y": 0.1907 }, { "x": 0.338, "y": 0.8853 }, { "x": 0.2388, "y": 0.9969 }, { "x": -0.1953, "y": 0.9969 }, { "x": -0.307, "y": 0.8605 }],
  7: [{ "x": -0.9247, "y": 0.2366 }, { "x": -0.828, "y": -0.3548 }, { "x": -0.2366, "y": -0.9247 }, { "x": -0.0645, "y": -1.0 }, { "x": 0.1935, "y": -0.9677 }, { "x": 0.7312, "y": -0.5269 }, { "x": 0.8495, "y": -0.3871 }, { "x": 0.914, "y": 0.1398 }, { "x": 0.8925, "y": 0.2796 }, { "x": 0.7742, "y": 0.4301 }, { "x": 0.0323, "y": 0.9785 }, { "x": -0.2043, "y": 0.9785 }, { "x": -0.6667, "y": 0.7419 }, { "x": -0.8495, "y": 0.5699 }],
  8: [{ "x": -0.914, "y": -0.3344 }, { "x": -0.7516, "y": -0.8214 }, { "x": -0.6218, "y": -0.9188 }, { "x": -0.086, "y": -1.0 }, { "x": 0.7744, "y": -0.9188 }, { "x": 0.9205, "y": -0.7078 }, { "x": 0.9205, "y": -0.3182 }, { "x": 0.8555, "y": -0.0097 }, { "x": 0.5308, "y": 0.5422 }, { "x": 0.0601, "y": 0.9805 }, { "x": -0.2484, "y": 0.9318 }, { "x": -0.4919, "y": 0.7532 }, { "x": -0.638, "y": 0.4773 }, { "x": -0.8815, "y": -0.1558 }],
  9: [{ "x": -0.6961, "y": 0.7941 }, { "x": -0.6176, "y": -0.7059 }, { "x": -0.4608, "y": -0.8725 }, { "x": -0.2353, "y": -0.9902 }, { "x": 0.0686, "y": -1.0 }, { "x": 0.3725, "y": -0.9412 }, { "x": 0.5294, "y": -0.8725 }, { "x": 0.6667, "y": -0.4804 }, { "x": 0.6863, "y": 0.0098 }, { "x": 0.6471, "y": 0.2549 }, { "x": 0.3824, "y": 0.7255 }, { "x": 0.0784, "y": 0.9118 }, { "x": -0.1176, "y": 0.9706 }, { "x": -0.5686, "y": 0.8922 }]
};

// --- 6. MAIN GAME STATE & ENGINE ---
class SoykaGame {
  constructor() {
    // DOM Elements
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById('canvas-container');
    this.scoreEl = document.getElementById('score');
    this.bestScoreEl = document.getElementById('best-score');
    this.comboEl = document.getElementById('combo-display');
    this.mergesEl = document.getElementById('merges-count');
    this.highestImgEl = document.getElementById('highest-unlocked-img');
    this.highestNameEl = document.getElementById('highest-unlocked-name');
    this.nextImgEl = document.getElementById('next-img');
    this.dropperImgEl = document.getElementById('dropper-img');
    this.dropGuideEl = document.getElementById('drop-guide');
    this.gameOverOverlay = document.getElementById('game-over-overlay');
    this.helpOverlay = document.getElementById('help-overlay');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalTierEl = document.getElementById('final-tier');

    // UI Buttons (optional elements from simplified layout)
    this.btnSound = document.getElementById('btn-sound');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnHelp = document.getElementById('btn-help');
    this.btnPlayAgain = document.getElementById('btn-play-again');
    this.btnCloseHelp = document.getElementById('btn-close-help');

    // Game Audio & Particles
    this.sound = new SoundController();
    this.particles = new ParticleSystem();
    this.awardManager = new AwardManager();

    // Canvas & World sizing
    this.width = 460;
    this.height = 700;
    this.dangerY = 160; // Lowered danger line height
    this.dropY = 90;    // Drop line adjusted below the lowered vat rim

    // State
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('soyka_best_score') || '0', 10);
    this.merges = 0;
    this.combo = 0;
    this.lastMergeTime = 0;
    this.highestTier = 0;
    this.isGameOver = false;
    this.canDrop = true;
    this.dropCooldown = 500; // ms

    // Custom tier colors (persisted in cookies & localStorage)
    this.customColorsCookieKey = 'soyka_tier_colors';
    this.customColors = this.loadCustomColorsFromCookies();
    this.recoloredCanvases = {};

    // Active & Next Droppers
    this.currentTier = this.getRandomSpawnTier();
    this.nextTier = this.getRandomSpawnTier();
    this.dropperX = this.width / 2;

    // Matter.js Setup
    this.initPhysics();
    this.gemManager = new GemManager(this);
    this.gemManager.setupExternalBoundaries();
    this.gemManager.loadGemsFromCookies();

    this.resizeCanvas();
    this.renderEvolutionPanels();
    this.bindEvents();

    if (this.bestScoreEl) this.bestScoreEl.textContent = this.bestScore;
    this.updateDropperVisuals();

    // Danger line tracking timer
    this.dangerTimer = 0;

    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  getRandomSpawnTier() {
    // Standard drop weights for early tiers (Soyak, Smugjak, Cobson, Gapejak, Bernd)
    const weights = [0.45, 0.30, 0.15, 0.08, 0.02];
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (r <= acc) return i;
    }
    return 0;
  }

  initPhysics() {
    const { Engine, World, Bodies, Events } = Matter;

    this.engine = Engine.create({
      enableSleeping: false,
      positionIterations: 8,
      velocityIterations: 8
    });
    this.world = this.engine.world;
    this.world.gravity.y = 1.15; // Snappy bouncy physics

    this.setupWalls();

    // Listen for collisions to handle merges
    Events.on(this.engine, 'collisionStart', (event) => {
      this.handleCollisions(event.pairs);
    });
  }

  setupWalls() {
    const { Bodies, World } = Matter;
    const thickness = 60;
    const w = this.width;
    const h = this.height;

    // Remove existing walls if resizing
    if (this.walls) {
      World.remove(this.world, this.walls);
    }

    // Ground positioned exactly at the visible inner bottom of the vat.
    // The canvas represents the vat interior (height: h).
    // Setting top of ground at h ensures jaks and gems rest right at the bottom edge.
    const ground = Bodies.rectangle(w / 2, h + thickness / 2, w + 200, thickness, {
      isStatic: true,
      friction: 0.95,
      frictionStatic: 1.0,
      restitution: 0.15
    });

    // Left and right vat walls: exactly aligned with inner edge of vat borders (x=0 and x=w).
    // Starts at y=0 down to the floor at y=h.
    const wallHeight = h + 100;
    const wallCenterY = wallHeight / 2;

    const leftWall = Bodies.rectangle(-thickness / 2, wallCenterY, thickness, wallHeight, {
      isStatic: true,
      friction: 0.4,
      frictionStatic: 0.8,
      restitution: 0.15
    });

    const rightWall = Bodies.rectangle(w + thickness / 2, wallCenterY, thickness, wallHeight, {
      isStatic: true,
      friction: 0.4,
      frictionStatic: 0.8,
      restitution: 0.15
    });

    this.walls = [ground, leftWall, rightWall];
    World.add(this.world, this.walls);
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    // Maintain responsive aspect ratio around 460 x 700
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  handleCollisions(pairs) {
    if (this.isGameOver) return;

    for (const pair of pairs) {
      const { bodyA, bodyB } = pair;

      // Wall bounce sound
      if ((bodyA.isStatic && !bodyB.isStatic) || (bodyB.isStatic && !bodyA.isStatic)) {
        const dynamicBody = bodyA.isStatic ? bodyB : bodyA;
        const staticBody = bodyA.isStatic ? bodyA : bodyB;

        // Check if a regular gem collided with the merchant!
        if (staticBody.isMerchant && dynamicBody.isGem && !dynamicBody.isShopItem) {
          // Exchange gem: remove colliding gem and drop random item in front of merchant
          if (this.gemManager) {
            this.gemManager.removeGem(dynamicBody.gemId);
            this.sound.playClick();

            const items = ['cia_badge', 'pager', 'funko_pop'];
            const chosenItem = items[Math.floor(Math.random() * items.length)];

            // Spawn directly in front of the merchant character
            const merchantEl = document.getElementById('merchant-character');
            let spawnX = 140;
            let spawnY = 120;
            if (merchantEl) {
              const rect = merchantEl.getBoundingClientRect();
              spawnX = rect.right + 10;
              spawnY = rect.bottom - 20;
            }
            this.gemManager.spawnShopItem(chosenItem, spawnX, spawnY, true);
          }
        }

        const speed = Matter.Vector.magnitude(dynamicBody.velocity);
        if (speed > 1.8) {
          this.sound.playBounce(Math.min(3, speed / 3));
        }
      }

      // Check if both are Soyjaks
      if (bodyA.gameTier !== undefined && bodyB.gameTier !== undefined) {
        // Must match tier & not already merged & not during end animation (isBlending)
        if (!this.isBlending && bodyA.gameTier === bodyB.gameTier && !bodyA.isMerging && !bodyB.isMerging) {
          this.mergeBodies(bodyA, bodyB);
        } else {
          // Play soft thud on collision between soyjaks
          const relSpeed = Matter.Vector.magnitude(Matter.Vector.sub(bodyA.velocity, bodyB.velocity));
          if (relSpeed > 2.0) {
            this.sound.playBounce(Math.min(2.5, relSpeed / 3));
          }
        }
      }
    }
  }

  mergeBodies(bodyA, bodyB) {
    bodyA.isMerging = true;
    bodyB.isMerging = true;

    const currentLevel = bodyA.gameTier;
    const nextLevel = currentLevel + 1;

    // Midpoint between both bodies
    const newX = (bodyA.position.x + bodyB.position.x) / 2;
    const newY = (bodyA.position.y + bodyB.position.y) / 2;

    // Remove old bodies from world
    Matter.World.remove(this.world, [bodyA, bodyB]);

    // Handle combo calculation
    const now = performance.now();
    if (now - this.lastMergeTime < 1800) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.lastMergeTime = now;
    if (this.comboEl) this.comboEl.textContent = `${this.combo}x`;
    this.merges++;
    if (this.mergesEl) this.mergesEl.textContent = this.merges;

    // Score calculation with combo multiplier
    const tierDef = TIERS[currentLevel];
    const scoreAdd = tierDef.score * (1 + (this.combo - 1) * 0.2);
    this.addScore(Math.round(scoreAdd));

    // Sound effect
    this.sound.playMerge(nextLevel);

    // Particle FX
    this.particles.spawnMergeEffect(
      newX,
      newY,
      TIERS[Math.min(nextLevel, TIERS.length - 1)].color,
      18,
      nextLevel < TIERS.length ? TIERS[nextLevel].name : "MAX TIER!",
      Math.round(scoreAdd)
    );

    // Spawn Gem probability:
    // No chance when combining Chudjaks (tier 9).
    // For other tiers (0-8), chance graduated at 2.5x rarer per tier: 1.5 / Math.pow(2.5, 9 - currentLevel)
    if (currentLevel < 9 && this.gemManager) {
      const gemProb = 1.5 / Math.pow(2.5, 9 - currentLevel);
      if (Math.random() < gemProb) {
        // Spawn at top of screen outside the left quarter (25% to 100% of screen width)
        const minX = window.innerWidth * 0.25;
        const maxX = Math.max(minX + 40, window.innerWidth - 40);
        const gemScreenX = minX + Math.random() * (maxX - minX);
        const gemScreenY = 40 + Math.random() * 20;
        this.gemManager.spawnGem(gemScreenX, gemScreenY);
      }
    }

    // Create next tier body if within limit
    if (nextLevel < TIERS.length) {
      const newBody = this.createSoyjakBody(newX, newY, nextLevel);
      Matter.World.add(this.world, newBody);

      // Give slight pop velocity
      Matter.Body.setVelocity(newBody, {
        x: (Math.random() - 0.5) * 1.5,
        y: -2.0
      });

      // Update highest unlocked
      if (nextLevel > this.highestTier) {
        this.highestTier = nextLevel;
        if (this.highestImgEl) {
          const recolored = this.customColors && this.customColors[nextLevel] ? this.getRecoloredTierImage(nextLevel) : null;
          if (recolored && recolored.toDataURL) {
            this.highestImgEl.src = recolored.toDataURL();
          } else {
            this.highestImgEl.src = TIERS[nextLevel].imageSrc;
          }
        }
        if (this.highestNameEl) this.highestNameEl.textContent = TIERS[nextLevel].name;
        this.highlightEvoTree(nextLevel);
      }
    } else {
      // Reached apex / highest tier merge (2 Chudjaks combined!):
      // Play chudmerge.mp3 and give an award directly without clearing the screen
      this.sound.playChudMerge();
      if (this.awardManager) {
        this.awardManager.awardOne();
      }
    }
  }

  triggerBlender(awardBadge = false) {
    if (this.isBlending) return;
    this.sound.playBlender();
    this.sound.playBounce(3);

    // If apex Chudjak merge, award 1 "Fell for it again" badge to pop onto screen
    if (awardBadge && this.awardManager) {
      this.awardManager.awardOne();
    }

    // Start industrial mixer animation sequence (Total duration 3.0s)
    this.isBlending = true;
    this.blendStartTime = performance.now();
    this.canDrop = false;
    this.drainValveOpen = false;
    if (this.dropGuideEl) this.dropGuideEl.style.opacity = '0';

    // Complete industrial mixing & draining sequence after 3.0 seconds
    setTimeout(() => {
      this.isBlending = false;
      this.drainValveOpen = false;
      this.restart();
    }, 3000);
  }

  createSoyjakBody(x, y, tierIndex) {
    const tier = TIERS[tierIndex];
    const r = tier.radius;
    const normVerts = HEAD_VERTICES[tierIndex];

    let body;
    let spriteOffset = { x: 0, y: 0 };

    if (normVerts && Matter.Bodies.fromVertices) {
      // Scale normalized vertices by the tier's radius:
      const scaledVerts = normVerts.map(p => ({
        x: p.x * r,
        y: p.y * r
      }));

      // Matter.Vertices.centre computes the centroid that Matter.Bodies.fromVertices offsets to
      const centre = Matter.Vertices.centre(scaledVerts);
      spriteOffset = { x: -centre.x, y: -centre.y };

      body = Matter.Bodies.fromVertices(x, y, [scaledVerts], {
        restitution: 0.2,
        friction: 0.85,
        frictionStatic: 1.0,
        frictionAir: 0.008,
        density: 0.0015 * (1 + tierIndex * 0.1)
      });
    }

    // Fallback if fromVertices not supported
    if (!body) {
      body = Matter.Bodies.circle(x, y, r, {
        restitution: 0.2,
        friction: 0.85,
        frictionStatic: 1.0,
        frictionAir: 0.008,
        density: 0.0015 * (1 + tierIndex * 0.1)
      });
      spriteOffset = { x: 0, y: 0 };
    }

    body.gameTier = tierIndex;
    body.spriteOffset = spriteOffset;
    body.isMerging = false;
    body.spawnTime = performance.now();
    return body;
  }

  addScore(points) {
    this.score += points;
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      if (this.bestScoreEl) this.bestScoreEl.textContent = this.bestScore;
      localStorage.setItem('soyka_best_score', this.bestScore.toString());
    }
  }

  dropCurrentSoyjak() {
    if (!this.canDrop || this.isGameOver || this.isBlending) return;
    this.canDrop = false;

    // Clamp X so body spawns fully inside walls
    const tier = TIERS[this.currentTier];
    const minX = tier.radius + 10;
    const maxX = this.width - tier.radius - 10;
    this.dropperX = Math.max(minX, Math.min(maxX, this.dropperX));
    const spawnX = this.dropperX;

    // Create physics body
    const body = this.createSoyjakBody(spawnX, this.dropY, this.currentTier);
    Matter.World.add(this.world, body);

    this.sound.playDrop();

    // Hide drop guide briefly for cooldown
    if (this.dropGuideEl) this.dropGuideEl.style.opacity = '0.3';

    // Cycle to next
    this.currentTier = this.nextTier;
    this.nextTier = this.getRandomSpawnTier();
    this.updateDropperPosition();
    this.updateDropperVisuals();

    // Re-enable drop after cooldown
    setTimeout(() => {
      if (!this.isBlending) {
        this.canDrop = true;
        if (this.dropGuideEl) this.dropGuideEl.style.opacity = '0.9';
      }
    }, this.dropCooldown);
  }

  updateDropperVisuals() {
    const cur = TIERS[this.currentTier];
    const next = TIERS[this.nextTier];

    const rect = this.container.getBoundingClientRect();
    const ratio = rect.width / this.width;
    const pixelRadius = cur.radius * ratio;

    const sx = cur.sx || 1.0;
    const sy = cur.sy || 1.0;

    const screenDropY = this.dropY * ratio;

    if (this.dropperImgEl) {
      const recolored = this.customColors && this.customColors[this.currentTier] ? this.getRecoloredTierImage(this.currentTier) : null;
      if (recolored && (recolored._cachedDataURL || recolored.toDataURL)) {
        this.dropperImgEl.src = recolored._cachedDataURL || recolored.toDataURL();
      } else {
        this.dropperImgEl.src = cur.imageSrc;
      }
      this.dropperImgEl.style.width = `${pixelRadius * 2 * sx}px`;
      this.dropperImgEl.style.height = `${pixelRadius * 2 * sy}px`;
    }

    const dropperBox = document.querySelector('.drop-dropper');
    if (dropperBox) {
      const boxW = pixelRadius * 2 * sx;
      const boxH = pixelRadius * 2 * sy;
      
      let ox = 0;
      let oy = 0;
      const normVerts = HEAD_VERTICES[this.currentTier];
      if (normVerts && typeof Matter !== 'undefined' && Matter.Vertices && Matter.Vertices.centre) {
        const scaledVerts = normVerts.map(p => ({ x: p.x * cur.radius, y: p.y * cur.radius }));
        const centre = Matter.Vertices.centre(scaledVerts);
        ox = -centre.x;
        oy = -centre.y;
      }

      dropperBox.style.width = `${boxW}px`;
      dropperBox.style.height = `${boxH}px`;
      dropperBox.style.left = `${ox * ratio}px`;
      dropperBox.style.top = `${screenDropY + oy * ratio}px`;
      dropperBox.style.transform = 'translate(-50%, -50%)';
      if (this.customColors && this.customColors[this.currentTier]) {
        dropperBox.style.filter = `drop-shadow(0 0 10px ${this.customColors[this.currentTier]})`;
      } else {
        dropperBox.style.filter = 'none';
      }
    }

    if (this.nextImgEl) {
      const nextRecolored = this.customColors && this.customColors[this.nextTier] ? this.getRecoloredTierImage(this.nextTier) : null;
      if (nextRecolored && (nextRecolored._cachedDataURL || nextRecolored.toDataURL)) {
        this.nextImgEl.src = nextRecolored._cachedDataURL || nextRecolored.toDataURL();
      } else {
        this.nextImgEl.src = next.imageSrc;
      }
      if (this.customColors && this.customColors[this.nextTier]) {
        this.nextImgEl.style.filter = `drop-shadow(0 0 10px ${this.customColors[this.nextTier]}) drop-shadow(0 0 4px ${this.customColors[this.nextTier]})`;
      } else {
        this.nextImgEl.style.filter = 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.7))';
      }
    }
    this.updateDropperPosition();
  }

  updateDropperPosition() {
    if (!this.dropGuideEl) return;
    const rect = this.container.getBoundingClientRect();
    const ratio = rect.width / this.width;
    const screenX = this.dropperX * ratio;
    this.dropGuideEl.style.left = `${screenX}px`;
  }

  setDropperXFromClient(clientX) {
    const rect = this.container.getBoundingClientRect();
    const relX = clientX - rect.left;
    const scale = this.width / rect.width;
    const gameX = relX * scale;

    const tier = TIERS[this.currentTier];
    const minX = tier.radius + 10;
    const maxX = this.width - tier.radius - 10;
    this.dropperX = Math.max(minX, Math.min(maxX, gameX));
    this.updateDropperPosition();
  }

  checkGameOver(dt) {
    if (this.isGameOver) return;

    let bodiesOverLine = 0;
    const now = performance.now();
    const allBodies = Matter.Composite.allBodies(this.world);

    for (const body of allBodies) {
      if (body.gameTier !== undefined) {
        // Grace period of 1.2s after dropping so it can settle below line
        if (now - body.spawnTime > 1200) {
          const topEdge = body.position.y - TIERS[body.gameTier].radius;
          if (topEdge < this.dangerY) {
            // Check if speed is relatively low (meaning it is resting or piled up)
            const speed = Matter.Vector.magnitude(body.velocity);
            if (speed < 1.0) {
              bodiesOverLine++;
            }
          }
        }
      }
    }

    if (bodiesOverLine > 0) {
      this.dangerTimer += dt;
      // If bodies stay above the line for 2.0 continuous seconds: Blend and reset vat!
      if (this.dangerTimer > 2000) {
        this.dangerTimer = 0;
        this.triggerBlender(false);
      }
    } else {
      this.dangerTimer = Math.max(0, this.dangerTimer - dt * 1.5);
    }
  }

  triggerGameOver() {
    // Kept as fallback, but vat overfill now triggers blender directly
    this.triggerBlender(false);
  }

  restart() {
    // Clear all bodies from physics world except walls and gems
    const allBodies = Matter.Composite.allBodies(this.world);
    const toRemove = allBodies.filter(b => b.gameTier !== undefined && !b.isGem);
    Matter.World.remove(this.world, toRemove);

    // Note: Gems persist across vat clears as requested by user

    // Reset state
    this.score = 0;
    this.merges = 0;
    this.combo = 0;
    this.dangerTimer = 0;
    this.highestTier = 0;
    this.isGameOver = false;
    this.canDrop = true;

    if (this.scoreEl) this.scoreEl.textContent = "0";
    if (this.mergesEl) this.mergesEl.textContent = "0";
    if (this.comboEl) this.comboEl.textContent = "0x";
    if (this.highestImgEl) {
      const recolored = this.customColors && this.customColors[0] ? this.getRecoloredTierImage(0) : null;
      if (recolored && recolored.toDataURL) {
        this.highestImgEl.src = recolored.toDataURL();
      } else {
        this.highestImgEl.src = TIERS[0].imageSrc;
      }
    }
    if (this.highestNameEl) this.highestNameEl.textContent = TIERS[0].name;

    this.currentTier = this.getRandomSpawnTier();
    this.nextTier = this.getRandomSpawnTier();
    this.updateDropperVisuals();
    if (this.dropGuideEl) this.dropGuideEl.style.opacity = '0.9';
    this.highlightEvoTree(0);

    if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden');
  }

  renderEvolutionPanels() {
    const tree = document.getElementById('evolution-tree');
    const mobileStrip = document.getElementById('mobile-evo-strip');
    if (!tree && !mobileStrip) return;

    if (tree) tree.innerHTML = '';
    if (mobileStrip) mobileStrip.innerHTML = '';

    TIERS.forEach((t, i) => {
      const customCol = this.customColors && this.customColors[i];
      let imgSrc = t.imageSrc;
      if (customCol) {
        const recolored = this.getRecoloredTierImage(i);
        if (recolored && recolored.toDataURL) {
          imgSrc = recolored.toDataURL();
        }
      }

      // Desktop Sidebar Item
      if (tree) {
        const item = document.createElement('div');
        item.className = `evo-item ${i === 0 ? 'active' : ''}`;
        item.id = `evo-item-${i}`;
        if (customCol) {
          item.style.borderColor = customCol;
          item.style.boxShadow = `0 0 10px ${customCol}`;
        }
        item.innerHTML = `
          <div class="evo-img-wrap">
            <img class="evo-img" src="${imgSrc}" alt="${t.name}">
          </div>
          <div class="evo-info">
            <span class="evo-tier">TIER ${i + 1} (${t.score} PTS)</span>
            <span class="evo-name" style="${customCol ? `color: ${customCol};` : ''}">${t.name}</span>
          </div>
        `;
        tree.appendChild(item);
      }

      // Mobile Bottom Strip Item
      if (mobileStrip) {
        const badge = document.createElement('div');
        badge.className = 'mobile-evo-badge';
        badge.id = `mobile-evo-${i}`;
        if (customCol) {
          badge.style.borderColor = customCol;
        }
        badge.innerHTML = `
          <img src="${imgSrc}" alt="${t.name}">
          <span>${i + 1}</span>
        `;
        mobileStrip.appendChild(badge);
      }
    });
  }

  highlightEvoTree(tierIndex) {
    document.querySelectorAll('.evo-item').forEach((el, i) => {
      if (i <= tierIndex) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  bindEvents() {
    // Mouse Events on Container
    this.container.addEventListener('mousemove', (e) => {
      this.setDropperXFromClient(e.clientX);
    });

    this.container.addEventListener('click', (e) => {
      // Don't drop if clicked overlay button
      if (e.target.closest('.overlay') || e.target.closest('.icon-btn')) return;
      this.setDropperXFromClient(e.clientX);
      this.dropCurrentSoyjak();
    });

    // Touch Events for Mobile
    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        this.setDropperXFromClient(e.touches[0].clientX);
      }
    }, { passive: false });

    this.container.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        this.setDropperXFromClient(e.changedTouches[0].clientX);
        this.dropCurrentSoyjak();
      }
    });

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      const step = 20;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.dropperX = Math.max(30, this.dropperX - step);
        this.updateDropperPosition();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.dropperX = Math.min(this.width - 30, this.dropperX + step);
        this.updateDropperPosition();
      } else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.dropCurrentSoyjak();
      } else if (e.key === 'r' || e.key === 'R') {
        this.restart();
      } else if (e.key === 'm' || e.key === 'M') {
        this.toggleSoundUI();
      } else if (e.key === 'g' || e.key === 'G') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost && this.gemManager) {
          const minX = window.innerWidth * 0.25;
          const maxX = Math.max(minX + 40, window.innerWidth - 40);
          const spawnScreenX = minX + Math.random() * (maxX - minX);
          const spawnScreenY = 40 + Math.random() * 20;
          this.gemManager.spawnGem(spawnScreenX, spawnScreenY, true);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        // On localhost: C key drops a Chudjak (tier 9) into the vat!
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost && !this.isGameOver && !this.isBlending) {
          const chudjakTier = 9;
          const tier = TIERS[chudjakTier];
          const minX = tier.radius + 10;
          const maxX = this.width - tier.radius - 10;
          const spawnX = Math.max(minX, Math.min(maxX, this.dropperX || this.width / 2));
          const body = this.createSoyjakBody(spawnX, this.dropY, chudjakTier);
          Matter.World.add(this.world, body);
          this.sound.playDrop();
        }
      }
    });

    // Buttons (safe for removed elements)
    if (this.btnSound) this.btnSound.addEventListener('click', () => this.toggleSoundUI());
    if (this.btnRestart) this.btnRestart.addEventListener('click', () => this.restart());
    if (this.btnPlayAgain) this.btnPlayAgain.addEventListener('click', () => this.restart());
    if (this.btnHelp && this.helpOverlay) {
      this.btnHelp.addEventListener('click', () => this.helpOverlay.classList.remove('hidden'));
    }
    if (this.btnCloseHelp && this.helpOverlay) {
      this.btnCloseHelp.addEventListener('click', () => this.helpOverlay.classList.add('hidden'));
    }

    // Resize handling
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.updateDropperVisuals();
    });

    // Button that does nothing: Play click sound on press (purely does nothing)
    const btnNothing = document.getElementById('btn-does-nothing');
    if (btnNothing) {
      this.randomizeBtnNothingPosition(btnNothing);

      btnNothing.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sound.playClick();
      });
    }
  }

  randomizeBtnNothingPosition(btn = document.getElementById('btn-does-nothing')) {
    if (!btn) return;
    const btnW = btn.offsetWidth || 90;
    const btnH = btn.offsetHeight || 90;
    const pad = 24;
    const margin = 20;

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Collect bounding boxes of static UI elements to avoid
    const obstacles = [];

    // Vat canvas container
    if (this.container) {
      const r = this.container.getBoundingClientRect();
      obstacles.push({
        left: r.left - margin,
        top: r.top - margin,
        right: r.right + margin,
        bottom: r.bottom + margin
      });
    }

    // Merchant character
    const merchantEl = document.getElementById('merchant-character');
    if (merchantEl) {
      const r = merchantEl.getBoundingClientRect();
      obstacles.push({
        left: r.left - margin,
        top: r.top - margin,
        right: r.right + margin,
        bottom: r.bottom + margin
      });
    }

    // Phone / Soyjak score character
    const phoneWrapper = document.getElementById('phone-score-wrapper');
    if (phoneWrapper) {
      const r = phoneWrapper.getBoundingClientRect();
      obstacles.push({
        left: r.left - margin,
        top: r.top - margin,
        right: r.right + margin,
        bottom: r.bottom + margin
      });
    }

    // Header / brand bar or scoreboard if present
    const topBar = document.querySelector('.top-bar, .scoreboard-bar, .app-header');
    if (topBar) {
      const r = topBar.getBoundingClientRect();
      obstacles.push({
        left: r.left - margin,
        top: r.top - margin,
        right: r.right + margin,
        bottom: r.bottom + margin
      });
    }

    // Any side panels or cards (evolution tree, controls box)
    document.querySelectorAll('.left-panel, .right-panel, .controls-box').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        obstacles.push({
          left: r.left - margin,
          top: r.top - margin,
          right: r.right + margin,
          bottom: r.bottom + margin
        });
      }
    });

    const minX = pad;
    const maxX = Math.max(pad, winW - btnW - pad);
    const minY = pad;
    const maxY = Math.max(pad, winH - btnH - pad);

    let bestX = pad;
    let bestY = maxY;
    let found = false;

    // Try multiple random attempts to find clear spot
    for (let attempts = 0; attempts < 150; attempts++) {
      const candX = minX + Math.random() * (maxX - minX);
      const candY = minY + Math.random() * (maxY - minY);
      const candR = candX + btnW;
      const candB = candY + btnH;

      const collides = obstacles.some(obs => {
        return !(candR < obs.left || candX > obs.right || candB < obs.top || candY > obs.bottom);
      });

      if (!collides) {
        bestX = candX;
        bestY = candY;
        found = true;
        break;
      }
    }

    // Fallback: If no clear position found in attempts, pick bottom-left or top-right safe zone
    if (!found) {
      bestX = pad;
      bestY = maxY;
    }

    btn.style.left = `${Math.round(bestX)}px`;
    btn.style.top = `${Math.round(bestY)}px`;
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  }

  toggleSoundUI() {
    const isEnabled = this.sound.toggle();
    if (this.btnSound) {
      const icon = this.btnSound.querySelector('.icon');
      if (icon) icon.textContent = isEnabled ? '🔊' : '🔇';
      this.btnSound.classList.toggle('muted', !isEnabled);
    }
  }

  loop(currentTime) {
    const elapsed = Math.min(100, Math.max(0, currentTime - this.lastTime));
    this.lastTime = currentTime;

    // Matter.js update with fixed stable timestep (16.666ms) to prevent solver shudder
    const fixedDt = 1000 / 60;
    this.accumulator = (this.accumulator || 0) + elapsed;
    while (this.accumulator >= fixedDt) {
      Matter.Engine.update(this.engine, fixedDt);
      this.accumulator -= fixedDt;
    }

    // Particle update
    this.particles.update();

    // Gem stickers update
    if (this.gemManager) {
      this.gemManager.update();
    }

    // Check game over
    this.checkGameOver(elapsed);

    // Render Canvas
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Container Boundary & Danger Line
    this.drawContainerAndDangerLine(ctx);

    // 2. Render all Soyjak Bodies
    const bodies = Matter.Composite.allBodies(this.world);
    for (const body of bodies) {
      if (body.gameTier !== undefined) {
        this.drawSoyjak(ctx, body);
      }
    }

    // 3. Render Industrial Mixer and Bottom Drain overlay if active
    if (this.isBlending) {
      this.drawIndustrialMixerEffect(ctx);
    }

    // 4. Render Particles & Floating texts
    this.particles.render(ctx);
  }

  drawIndustrialMixerEffect(ctx) {
    const now = performance.now();
    const elapsed = now - (this.blendStartTime || now);
    const progress = Math.min(1, elapsed / 3000); // 0.0 to 1.0 over 3.0 seconds

    const centerX = this.width / 2;
    const bottomY = this.height - 25;

    // Physics mixing & sucking force on remaining bodies
    const bodies = Matter.Composite.allBodies(this.world).filter(b => b.gameTier !== undefined);

    if (progress < 0.45) {
      // Phase 1: Heavy churning, vortex agitation & grind particles
      for (const b of bodies) {
        const dx = centerX - b.position.x;
        const dy = (this.height * 0.65) - b.position.y;
        Matter.Body.setVelocity(b, {
          x: -dy * 0.05 + dx * 0.03 + (Math.random() - 0.5) * 4,
          y: dx * 0.05 + dy * 0.03 + 1.2
        });
        Matter.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.3);
      }

      if (Math.random() < 0.45) {
        this.particles.spawnMixerGrindParticles(centerX + (Math.random() - 0.5) * 120, Math.min(this.height * 0.75, 80 + progress * 3 * (this.height * 0.62)));
      }
    } else {
      // Phase 2: Apex reached! The red stuff is at apex, delete faces completely under the opaque mix
      this.drainValveOpen = true;
      if (bodies.length > 0) {
        Matter.World.remove(this.world, bodies);
      }

      // Spawn drain suction slurry particles
      this.particles.spawnDrainVortexParticles(centerX, bottomY);
    }

    ctx.save();

    // 1. Calculate Liquid Slurry Height
    let slurryHeight = 0;
    if (progress > 0.08 && progress < 0.45) {
      // Churn phase: liquid rises and sloshes as faces are pureed to apex
      const churnProg = (progress - 0.08) / 0.37;
      const slosh = Math.sin(now * 0.015) * 8;
      slurryHeight = churnProg * 360 + slosh;
    } else if (progress >= 0.45) {
      // Drain phase: liquid drains out through the bottom drain
      const drainProgress = (progress - 0.45) / 0.55; // 0 to 1
      slurryHeight = Math.max(0, 360 * (1 - Math.min(1, drainProgress)));
    }

    // 2. Render Heavy Industrial Dual Mixer Shaft & Churning Blades (BEHIND the red mix)
    // Mixer shaft descends into the vat during churn, then slowly raises/retracts as liquid drains
    let mixerDepth = 0;
    if (progress < 0.45) {
      const churnIn = Math.min(1, progress * 3);
      mixerDepth = 80 + churnIn * (this.height * 0.62);
    } else {
      // As liquid falls (progress 0.45 -> 1.0), mixer slowly raises back up
      const raiseProg = Math.min(1, (progress - 0.45) / 0.55);
      const maxMixer = 80 + (this.height * 0.62);
      mixerDepth = maxMixer * (1 - raiseProg);
    }
    const mixerY = Math.min(this.height * 0.75, Math.max(0, mixerDepth));

    if (mixerY > 5) {
      // Central Heavy Steel Drive Shaft
      const shaftGrad = ctx.createLinearGradient(centerX - 12, 0, centerX + 12, 0);
      shaftGrad.addColorStop(0, '#2d3342');
      shaftGrad.addColorStop(0.3, '#6b7280');
      shaftGrad.addColorStop(0.7, '#9ca3af');
      shaftGrad.addColorStop(1, '#1f242e');

      ctx.fillStyle = shaftGrad;
      ctx.fillRect(centerX - 8, 0, 16, mixerY);

      // Motor Hub / Planetary Gearbox housing
      ctx.fillStyle = '#1e2330';
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, mixerY - 10, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center Gear Bolt
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(centerX, mixerY - 10, 7, 0, Math.PI * 2);
      ctx.fill();

      // Dual Churning Blades rotating in 3D perspective
      const spinRate = now * 0.025;
      const bladeSpan = 150;
      const bladeThickness = 14;

      // Draw Upper Impeller Blade
      ctx.save();
      ctx.translate(centerX, mixerY - 80);
      const scaleX1 = Math.cos(spinRate);
      ctx.scale(scaleX1, 1);
      ctx.fillStyle = scaleX1 >= 0 ? '#4b5563' : '#374151';
      ctx.fillRect(-bladeSpan / 2, -bladeThickness / 2, bladeSpan, bladeThickness);
      // Beveled edge
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(-bladeSpan / 2, -bladeThickness / 2, bladeSpan, 3);
      ctx.restore();

      // Draw Lower Impeller Blade (counter-rotating for authentic industrial mixing)
      ctx.save();
      ctx.translate(centerX, mixerY);
      const scaleX2 = Math.cos(-spinRate * 1.3);
      ctx.scale(scaleX2, 1);
      ctx.fillStyle = scaleX2 >= 0 ? '#374151' : '#1f2937';
      ctx.fillRect(-bladeSpan / 2, -bladeThickness / 2, bladeSpan, bladeThickness + 4);
      // Blade tooth notches
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-bladeSpan / 2 + 10, -bladeThickness / 2, 8, bladeThickness + 4);
      ctx.fillRect(bladeSpan / 2 - 18, -bladeThickness / 2, 8, bladeThickness + 4);
      ctx.restore();
    }

    // 3. Render Puree Slurry Liquid ON TOP of the mixer (so mixer is behind the red mix)
    if (slurryHeight > 2) {
      const liquidTop = this.height - slurryHeight;
      const liquidGrad = ctx.createLinearGradient(0, liquidTop, 0, this.height + 25);
      liquidGrad.addColorStop(0, '#c92a2a');
      liquidGrad.addColorStop(0.35, '#b02525');
      liquidGrad.addColorStop(0.8, '#821818');
      liquidGrad.addColorStop(1, '#520c0c');

      ctx.fillStyle = liquidGrad;
      ctx.beginPath();
      ctx.moveTo(0, this.height + 30);
      ctx.lineTo(0, liquidTop + Math.sin(now * 0.02) * 6);
      ctx.bezierCurveTo(
        this.width * 0.35, liquidTop - Math.cos(now * 0.02) * 8,
        this.width * 0.65, liquidTop + Math.sin(now * 0.02) * 8,
        this.width, liquidTop - Math.cos(now * 0.02) * 6
      );
      ctx.lineTo(this.width, this.height + 30);
      ctx.closePath();
      ctx.fill();

      // Slurry foam & bubbles on surface
      ctx.fillStyle = 'rgba(255, 220, 190, 0.7)';
      for (let bx = 20; bx < this.width - 20; bx += 30) {
        const bRad = 3 + Math.sin(bx + now * 0.01) * 2;
        ctx.beginPath();
        ctx.arc(bx, liquidTop + 4, Math.max(1, bRad), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawContainerAndDangerLine(ctx) {
    ctx.save();

    const centerX = this.width / 2;
    const bottomY = this.height - 24;

    // Side Flanges & Guideway Rails

    // Steel Wall Side Guideway Rails
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, 10);
    ctx.lineTo(12, this.height - 10);
    ctx.moveTo(this.width - 12, 10);
    ctx.lineTo(this.width - 12, this.height - 10);
    ctx.stroke();

    // Rivet Dots along Side Flanges
    for (let y = 30; y < this.height - 20; y += 45) {
      // Left rivet
      ctx.fillStyle = '#202430';
      ctx.beginPath();
      ctx.arc(6, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a4254';
      ctx.beginPath();
      ctx.arc(5.5, y - 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Right rivet
      ctx.fillStyle = '#202430';
      ctx.beginPath();
      ctx.arc(this.width - 6, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a4254';
      ctx.beginPath();
      ctx.arc(this.width - 6.5, y - 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Industrial Fill Line (Solid)
    const isWarning = this.dangerTimer > 0;
    const pulse = isWarning ? Math.sin(performance.now() * 0.01) * 0.3 + 0.7 : 0.6;

    ctx.strokeStyle = isWarning ? `rgba(239, 68, 68, ${pulse})` : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = isWarning ? 2.5 : 2;

    ctx.beginPath();
    ctx.moveTo(14, this.dangerY);
    ctx.lineTo(this.width - 14, this.dangerY);
    ctx.stroke();

    // Subtle Industrial "FILL LINE" label on the line
    ctx.font = "700 10px 'Outfit', sans-serif";
    ctx.fillStyle = isWarning ? `rgba(239, 68, 68, ${pulse})` : 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = "right";
    ctx.fillText("FILL LINE", this.width - 20, this.dangerY - 5);
    ctx.restore();
  }

  loadCustomColorsFromCookies() {
    try {
      const match = document.cookie.match(new RegExp('(^|;\\s*)' + this.customColorsCookieKey + '=([^;]*)'));
      if (match && match[2]) {
        const decoded = decodeURIComponent(match[2]);
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Could not read custom colors from cookies:', e);
    }
    try {
      const local = localStorage.getItem(this.customColorsCookieKey);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) { }
    return {};
  }

  saveCustomColorsToCookies() {
    try {
      const json = JSON.stringify(this.customColors);
      const encoded = encodeURIComponent(json);
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${this.customColorsCookieKey}=${encoded}; expires=${expires}; path=/; SameSite=Lax`;
      localStorage.setItem(this.customColorsCookieKey, json);
    } catch (e) {
      console.warn('Could not write custom colors to cookies:', e);
    }
  }

  setTierCustomColor(tierIndex, color) {
    this.customColors[tierIndex] = color;
    // Invalidate cached recolored canvas so it regenerates
    delete this.recoloredCanvases[tierIndex];
    this.saveCustomColorsToCookies();
    this.updateDropperVisuals();
    this.renderEvolutionPanels();
  }

  // Generates an offscreen canvas replacing white/whitish pixels with the custom color
  getRecoloredTierImage(tierIndex) {
    if (this.recoloredCanvases[tierIndex]) {
      return this.recoloredCanvases[tierIndex];
    }

    const baseImg = loadedImages[tierIndex];
    if (!baseImg || !baseImg.complete || baseImg.naturalWidth === 0) {
      return baseImg;
    }

    const color = this.customColors[tierIndex];
    if (!color) {
      return baseImg;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = baseImg.naturalWidth;
    offscreen.height = baseImg.naturalHeight;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(baseImg, 0, 0);

    const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imgData.data;

    // Parse target color by drawing to temporary 1x1 canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = color;
    tCtx.fillRect(0, 0, 1, 1);
    const cData = tCtx.getImageData(0, 0, 1, 1).data;
    const tr = cData[0], tg = cData[1], tb = cData[2];

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 30) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Detect white and whitish face pixels (skin/fill)
        if (r > 195 && g > 195 && b > 195) {
          const brightness = (r + g + b) / (3 * 255);
          data[i] = Math.round(tr * brightness);
          data[i + 1] = Math.round(tg * brightness);
          data[i + 2] = Math.round(tb * brightness);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    offscreen._cachedDataURL = offscreen.toDataURL();
    this.recoloredCanvases[tierIndex] = offscreen;
    return offscreen;
  }

  drawSoyjak(ctx, body) {
    const tier = TIERS[body.gameTier];
    const r = tier.radius;
    const pos = body.position;
    const angle = body.angle;
    const customColor = this.customColors[body.gameTier];

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    if (customColor) {
      // Custom FBI badge zap glow in the assigned color
      ctx.shadowColor = customColor;
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 0;
    } else {
      // Subtle ambient shadow under the head
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
    }

    // Center offset to align sprite with body center of mass
    const ox = (body.spriteOffset && body.spriteOffset.x) || 0;
    const oy = (body.spriteOffset && body.spriteOffset.y) || 0;

    // Draw the head image (recolored if custom color active)
    const img = customColor ? this.getRecoloredTierImage(body.gameTier) : loadedImages[body.gameTier];
    if (img && (img.complete || img instanceof HTMLCanvasElement)) {
      const sx = tier.sx || 1.0;
      const sy = tier.sy || 1.0;
      ctx.drawImage(img, -r * sx + ox, -r * sy + oy, r * 2 * sx, r * 2 * sy);
    } else {
      // Clean fallback circle
      ctx.fillStyle = customColor || tier.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new SoykaGame();
});
