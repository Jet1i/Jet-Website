// Glitch Signature - Full-width interactive bold geometric text with RGB split and slice displacement
class GlitchSignature {
  constructor(container, text = 'YIMING LI') {
    this.container = container;
    this.text = (text || 'YIMING LI').toUpperCase();

    // Canvases
    this.canvas = null; // main output
    this.ctx = null;
    this.baseCanvas = document.createElement('canvas'); // pristine text
    this.baseCtx = this.baseCanvas.getContext('2d');
    this.displacedCanvas = document.createElement('canvas'); // column-displaced text
    this.displacedCtx = this.displacedCanvas.getContext('2d');
    this.tempCanvas = document.createElement('canvas'); // tint helper
    this.tempCtx = this.tempCanvas.getContext('2d');

    // Dimensions
    this.width = 0;
    this.height = 0;
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    // Columns displacement
    this.colWidth = 2; // px per column
    this.columns = []; // {offset, velocity, target}
    this.sigma = 160; // influence spread
    this.pushStrength = 0.9; // how much mouse drag influences
    this.returnFactor = 0.08; // spring back
    this.damping = 0.86; // friction
    this.maxOffset = 60; // clamp per column

    // Glitch slices
    this.glitchIntensity = 0.0; // base intensity (dynamic)
    this.glitchTimer = 0;
    this.glitchPeriod = 1800; // ms
    this.glitchAmp = 22; // max px shift for slices

    // RGB split
    this.rgbOffset = 2.5;

    // Interaction
    this.mouseX = -1e6;
    this.mouseY = -1e6;
    this.isPointerDown = false;
    this.lastMouseX = 0;
    this.mouseVX = 0;

    // RAF
    this.isAnimating = false;
    this.lastFrame = 0;
    this.fps = 60;
    this.frameInterval = 1000 / this.fps;

    // Visibility optimization
    this.isVisible = true;

    this.init();
  }

  init() {
    // Create main canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'signature-canvas';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', `Glitch signature: ${this.text}`);
    this.canvas.tabIndex = 0;

    this.container.appendChild(this.canvas);

    // Initial sizing and render
    this.resize();

    // Events
    this.attachEvents();
    this.setupIntersectionObserver();

    // Wait for fonts, then render base
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        this.renderBaseText();
      });
    } else {
      this.renderBaseText();
    }

    // Start
    this.start();
  }

  getCssPixelHeight() {
    // Use the computed CSS height of the canvas element as target drawing height
    const h = this.canvas.clientHeight || 220;
    return Math.max(120, Math.min(320, h));
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(600, Math.floor(rect.width));
    this.height = Math.floor(this.getCssPixelHeight());

    const dpr = this.dpr;

    // Main canvas
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;

    // Offscreens
    [this.baseCanvas, this.displacedCanvas, this.tempCanvas].forEach((c) => {
      c.width = this.width * dpr;
      c.height = this.height * dpr;
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });

    // Re-init columns based on new width
    const numCols = Math.ceil(this.width / this.colWidth);
    this.columns = new Array(numCols).fill(0).map(() => ({ offset: 0, velocity: 0, target: 0 }));

    // Re-render base text when size changes
    this.renderBaseText();
  }

  attachEvents() {
    // Pointer
    this.canvas.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
      this.lastMouseX = this.mouseX;
      this.mouseVX = 0;
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      const nx = e.clientX - r.left;
      const ny = e.clientY - r.top;
      if (this.isPointerDown) {
        this.mouseVX = nx - this.lastMouseX;
      }
      this.mouseX = nx;
      this.mouseY = ny;
      this.lastMouseX = nx;
    });
    this.canvas.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });
    this.canvas.addEventListener('pointerleave', () => {
      this.isPointerDown = false;
      this.mouseX = -1e6;
      this.mouseY = -1e6;
      this.mouseVX = 0;
    });

    // Keyboard
    this.canvas.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.mouseVX = -12;
        this.mouseX = Math.max(0, (isFinite(this.mouseX) ? this.mouseX : this.width / 2) - 40);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.mouseVX = 12;
        this.mouseX = Math.min(this.width, (isFinite(this.mouseX) ? this.mouseX : this.width / 2) + 40);
      }
    });

    // Resize
    let t;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => this.resize(), 160);
    });
  }

  setupIntersectionObserver() {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          this.isVisible = en.isIntersecting;
          if (this.isVisible && !this.isAnimating) this.start();
        });
      },
      { threshold: 0.1 }
    );
    obs.observe(this.canvas);
  }

  renderBaseText() {
    const ctx = this.baseCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background transparent; draw bold geometric text in white
    const paddingX = Math.max(24, this.width * 0.04);
    const maxTextWidth = this.width - paddingX * 2;

    // Compute font size to fit width
    let fontSize = Math.min(this.height * 0.7, 220);
    ctx.font = `900 ${Math.floor(fontSize)}px Montserrat, Poppins, Inter, system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Adjust font size to fit width by measureText
    const metrics = ctx.measureText(this.text);
    const textWidth = metrics.width;
    if (textWidth > maxTextWidth) {
      const scale = maxTextWidth / textWidth;
      fontSize = Math.max(32, Math.floor(fontSize * scale));
      ctx.font = `900 ${Math.floor(fontSize)}px Montserrat, Poppins, Inter, system-ui, -apple-system, sans-serif`;
    }

    // Optional faux letter-spacing by drawing letter by letter
    // For simplicity, rely on built-in kerning but uppercased and heavy weight for geometric look

    const x = this.width / 2;
    const y = this.height / 2 + 2; // slight optical adjustment

    // Draw white base with slight stroke to increase geometry feel
    ctx.lineWidth = Math.max(2, Math.floor(fontSize * 0.04));
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.fillStyle = '#ffffff';

    ctx.strokeText(this.text, x, y);
    ctx.fillText(this.text, x, y);
  }

  updateColumns(dt) {
    if (!this.columns.length) return;
    // Target displacement per column based on mouseX with Gaussian falloff
    const dir = Math.sign(this.mouseVX || 0);
    const baseInfluence = Math.max(-18, Math.min(18, this.mouseVX * this.pushStrength));

    for (let i = 0; i < this.columns.length; i++) {
      const colCenter = i * this.colWidth + this.colWidth * 0.5;
      const dx = colCenter - this.mouseX;
      const g = Math.exp(-(dx * dx) / (2 * this.sigma * this.sigma)); // 0..1
      const target = baseInfluence * g * (dir || 1);

      const c = this.columns[i];
      c.target = target;

      // Spring towards target and home (0)
      const toTarget = c.target - c.offset;
      const toHome = -c.offset;
      c.velocity += toTarget * 0.20 + toHome * this.returnFactor;
      c.velocity *= this.damping;

      // Integrate
      c.offset += c.velocity;

      // Clamp
      if (c.offset > this.maxOffset) c.offset = this.maxOffset;
      if (c.offset < -this.maxOffset) c.offset = -this.maxOffset;
    }

    // Decay mouse velocity
    this.mouseVX *= 0.9;
  }

  buildDisplacedCanvas() {
    const w = this.width;
    const h = this.height;

    // Clear
    this.displacedCtx.clearRect(0, 0, w, h);

    // Column-wise copy from base to displaced with offsets
    for (let i = 0; i < this.columns.length; i++) {
      const sx = i * this.colWidth;
      const sw = Math.min(this.colWidth, w - sx);
      if (sw <= 0) continue;
      const dx = Math.round(sx + this.columns[i].offset);
      this.displacedCtx.drawImage(this.baseCanvas, sx, 0, sw, h, dx, 0, sw, h);
    }

    // Glitch slices overlay (horizontal and a few vertical)
    const now = performance.now();
    const t = (now % this.glitchPeriod) / this.glitchPeriod; // 0..1
    // Pulse intensity: low most of the time, spikes sometimes
    const spike = (t > 0.12 && t < 0.18) || (t > 0.56 && t < 0.62) || (t > 0.86);
    const baseIntensity = spike ? 1 : 0.25;
    this.glitchIntensity = baseIntensity * (0.4 + Math.random() * 0.6);

    const bands = Math.floor(3 + this.glitchIntensity * 8);
    for (let b = 0; b < bands; b++) {
      const bandH = Math.floor(4 + Math.random() * 18);
      const y = Math.floor(Math.random() * (h - bandH));
      const shift = Math.floor((Math.random() * 2 - 1) * this.glitchAmp * this.glitchIntensity);
      this.displacedCtx.drawImage(this.displacedCanvas, 0, y, w, bandH, shift, y, w, bandH);

      // occasional duplicate ghost
      if (Math.random() < 0.2) {
        const ghostShift = Math.floor((Math.random() * 2 - 1) * (this.glitchAmp * 0.5));
        this.displacedCtx.globalAlpha = 0.5;
        this.displacedCtx.drawImage(this.displacedCanvas, 0, y, w, bandH, ghostShift, y, w, bandH);
        this.displacedCtx.globalAlpha = 1;
      }
    }

    // A couple vertical slices
    const vSlices = Math.floor(this.glitchIntensity * 3);
    for (let s = 0; s < vSlices; s++) {
      const vw = Math.floor(3 + Math.random() * 12);
      const x = Math.floor(Math.random() * (w - vw));
      const vshift = Math.floor((Math.random() * 2 - 1) * this.glitchAmp * 0.6);
      this.displacedCtx.drawImage(this.displacedCanvas, x, 0, vw, h, x + vshift, 0, vw, h);
    }
  }

  drawRGBSplit() {
    const w = this.width;
    const h = this.height;

    // Clear main
    this.ctx.clearRect(0, 0, w, h);

    // Draw base (white)
    this.ctx.globalAlpha = 0.95;
    this.ctx.drawImage(this.displacedCanvas, 0, 0);

    // Prepare tinted overlays in temp canvas
    const tintAndDraw = (color, offsetX) => {
      this.tempCtx.clearRect(0, 0, w, h);
      this.tempCtx.drawImage(this.displacedCanvas, 0, 0);
      this.tempCtx.globalCompositeOperation = 'source-in';
      this.tempCtx.fillStyle = color; // e.g., 'rgba(255,0,64,0.6)'
      this.tempCtx.fillRect(0, 0, w, h);
      this.tempCtx.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(this.tempCanvas, Math.round(offsetX), 0);
    };

    // Red and Blue channel offsets
    tintAndDraw('rgba(255, 20, 60, 0.55)', -this.rgbOffset);
    tintAndDraw('rgba(40, 140, 255, 0.55)', this.rgbOffset);

    // Occasional green micro flicker for richer glitch
    if (Math.random() < 0.07) {
      tintAndDraw('rgba(60, 255, 120, 0.25)', (Math.random() * 2 - 1) * (this.rgbOffset * 0.6));
    }
  }

  frame(ts) {
    if (!this.isVisible) {
      this.isAnimating = false;
      return;
    }

    if (ts - this.lastFrame >= this.frameInterval) {
      const dt = Math.min(66, ts - this.lastFrame);
      this.lastFrame = ts;

      this.updateColumns(dt);
      this.buildDisplacedCanvas();
      this.drawRGBSplit();
    }

    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.isAnimating = false;
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.signature-container');
  if (!container) return;

  container.parentElement.classList.add('loading');
  setTimeout(() => {
    container.parentElement.classList.remove('loading');
    new GlitchSignature(container, 'YIMING LI');
  }, 250);
});
