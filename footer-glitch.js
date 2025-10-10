// Glitch footer interactions with visibility gating via IntersectionObserver
// - Only activates when footer is in view (footer-observer.js dispatches events)
// - Provides whole-text translation and block push grid
(function () {
  const footer = document.querySelector('.glitch-footer');
  const textEl = document.querySelector('.glitch-text');
  if (!footer || !textEl) return;

  const dataText = textEl.getAttribute('data-text') || textEl.textContent || 'YIMING LI';

  // Respect reduced motion
  let reducedMotion = false;
  try {
    reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {}

  // Config
  const maxShift = 20;        // whole text translate range (px)
  const gridRows = 10;        // grid density rows
  const gridCols = 24;        // grid density cols
  const maxBlockShift = 28;   // per-block push range (px)
  const falloffRadius = 320;  // cursor influence radius (px)

  // State
  let activated = false;
  let blocksLayer = null;
  let blocks = [];

  // Helpers
  const onMoveTranslate = (clientX, clientY) => {
    const r = footer.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;
    const nx = Math.max(-1, Math.min(1, dx / (r.width / 2)));
    const ny = Math.max(-1, Math.min(1, dy / (r.height / 2)));

    const tx = (nx * maxShift).toFixed(2) + 'px';
    const ty = (ny * maxShift).toFixed(2) + 'px';
    textEl.style.setProperty('--tx', tx);
    textEl.style.setProperty('--ty', ty);
  };

  const applyBlockPush = (clientX, clientY) => {
    if (!blocks.length) return;
    const rect = footer.getBoundingClientRect();
    blocks.forEach(({ el }) => {
      const t = parseFloat(el.style.getPropertyValue('--t')) / 100;
      const b = parseFloat(el.style.getPropertyValue('--b')) / 100;
      const l = parseFloat(el.style.getPropertyValue('--l')) / 100;
      const r = parseFloat(el.style.getPropertyValue('--r')) / 100;

      const topPx = rect.top + rect.height * t;
      const bottomPx = rect.bottom - rect.height * b;
      const leftPx = rect.left + rect.width * l;
      const rightPx = rect.right - rect.width * r;

      const cx = (leftPx + rightPx) / 2;
      const cy = (topPx + bottomPx) / 2;

      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist > falloffRadius) {
        el.style.transform = 'translate(0px, 0px)';
        return;
      }
      const dirX = dx / (dist || 1);
      const dirY = dy / (dist || 1);
      const strength = 1 - dist / falloffRadius;
      const shiftX = (dirX * strength * maxBlockShift).toFixed(2);
      const shiftY = (dirY * strength * maxBlockShift).toFixed(2);
      el.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
    });
  };

  const resetAll = () => {
    textEl.style.setProperty('--tx', '0px');
    textEl.style.setProperty('--ty', '0px');
    blocks.forEach(({ el }) => (el.style.transform = 'translate(0px, 0px)'));
  };

  // Build/destroy blocks grid
  const buildBlocks = () => {
    if (blocksLayer) return;
    blocksLayer = document.createElement('div');
    blocksLayer.className = 'glitch-blocks';
    footer.appendChild(blocksLayer);

    const total = gridRows * gridCols;
    blocks = [];
    for (let i = 0; i < total; i++) {
      const block = document.createElement('div');
      block.className = 'glitch-block';
      if (Math.random() < 0.22) block.classList.add('jitter');
      block.setAttribute('data-text', dataText);

      const row = Math.floor(i / gridCols);
      const col = i % gridCols;
      const t = (row / gridRows) * 100;
      const b = (1 - (row + 1) / gridRows) * 100;
      const l = (col / gridCols) * 100;
      const r = (1 - (col + 1) / gridCols) * 100;

      block.style.setProperty('--t', t + '%');
      block.style.setProperty('--b', b + '%');
      block.style.setProperty('--l', l + '%');
      block.style.setProperty('--r', r + '%');

      blocksLayer.appendChild(block);
      blocks.push({ el: block });
    }
  };

  const destroyBlocks = () => {
    if (blocksLayer && blocksLayer.parentNode) {
      blocksLayer.parentNode.removeChild(blocksLayer);
    }
    blocksLayer = null;
    blocks = [];
  };

  // Event handlers (kept as refs for removeEventListener)
  const onMouseMove = (e) => {
    onMoveTranslate(e.clientX, e.clientY);
    applyBlockPush(e.clientX, e.clientY);
    // also move blocksLayer together for consistency with whole text
    if (blocksLayer) {
      const tx = getComputedStyle(textEl).getPropertyValue('--tx') || '0px';
      const ty = getComputedStyle(textEl).getPropertyValue('--ty') || '0px';
      blocksLayer.style.transform = `translate(${tx}, ${ty})`;
    }
  };
  const onTouchMove = (e) => {
    if (!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    onMoveTranslate(t.clientX, t.clientY);
    applyBlockPush(t.clientX, t.clientY);
  };
  const onLeave = () => { resetAll(); if (blocksLayer) blocksLayer.style.transform = 'translate(0px,0px)'; };

  const addListeners = () => {
    footer.addEventListener('mousemove', onMouseMove);
    footer.addEventListener('mouseleave', onLeave);
    footer.addEventListener('touchstart', onTouchMove, { passive: true });
    footer.addEventListener('touchmove', onTouchMove, { passive: true });
    footer.addEventListener('touchend', onLeave, { passive: true });
  };
  const removeListeners = () => {
    footer.removeEventListener('mousemove', onMouseMove);
    footer.removeEventListener('mouseleave', onLeave);
    footer.removeEventListener('touchstart', onTouchMove);
    footer.removeEventListener('touchmove', onTouchMove);
    footer.removeEventListener('touchend', onLeave);
  };

  // Activation gating via custom events from footer-observer.js
  const activate = () => {
    if (activated || reducedMotion) return;
    activated = true;
    footer.classList.add('glitch-active');
    buildBlocks();
    addListeners();
  };
  const deactivate = () => {
    if (!activated) return;
    activated = false;
    footer.classList.remove('glitch-active');
    resetAll();
    removeListeners();
    destroyBlocks();
  };

  window.addEventListener('glitch:activate', activate);
  window.addEventListener('glitch:deactivate', deactivate);

  // If observer not included, we can fallback: activate when first in view
  // Minimal fallback: if footer is initially visible, activate.
  const rect = footer.getBoundingClientRect();
  const inView = rect.top < window.innerHeight && rect.bottom > 0;
  if (inView) activate();
})();
