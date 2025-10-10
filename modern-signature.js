// Modern Interactive Signature Widget
class ModernInteractiveSignature {
    constructor(container, text) {
        this.container = container;
        this.text = text.toUpperCase();
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.isAnimating = false;
        this.animationId = null;
        this.lastRenderTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Enhanced configuration
        this.pixelSize = 3;
        this.spacing = 2.5;
        this.repulsionRadius = 80;
        this.repulsionStrength = 25;
        this.returnSpeed = 0.08;
        this.glowIntensity = 0;
        this.maxGlow = 1;
        
        // Color scheme
        this.colors = {
            primary: '#00d4ff',
            secondary: '#0099cc',
            accent: '#64c8ff',
            glow: 'rgba(0, 212, 255, 0.8)',
            trail: 'rgba(100, 200, 255, 0.6)'
        };
        
        // Interactive effects
        this.mouseTrail = [];
        this.maxTrailLength = 10;
        this.ripples = [];
        this.clickEffects = [];
        
        // Performance optimization
        this.particleUpdateBatch = 8;
        this.currentBatch = 0;
        this.isVisible = true;
        
        this.init();
    }
    
    init() {
        this.createCanvas();
        this.createParticles();
        this.attachEventListeners();
        this.setupIntersectionObserver();
        this.startAnimation();
    }
    
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'signature-canvas';
        this.canvas.setAttribute('role', 'img');
        this.canvas.setAttribute('aria-label', `Interactive signature: ${this.text}`);
        this.canvas.tabIndex = 0;
        
        // High DPI support
        const dpr = window.devicePixelRatio || 1;
        const rect = this.container.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = 120 * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = '120px';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
        
        // Canvas styling
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.container.appendChild(this.canvas);
    }
    
    createParticles() {
        this.particles = [];
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Create temporary canvas for text measurement
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvasRect.width;
        tempCanvas.height = 120;
        
        // Enhanced font styling
        tempCtx.font = 'bold 28px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
        tempCtx.fillStyle = '#ffffff';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.letterSpacing = '2px';
        
        // Add text with shadow for better definition
        tempCtx.shadowColor = this.colors.primary;
        tempCtx.shadowBlur = 10;
        tempCtx.fillText(this.text, canvasRect.width / 2, 60);
        
        const imageData = tempCtx.getImageData(0, 0, canvasRect.width, 120);
        const data = imageData.data;
        
        // Create particles with enhanced properties
        for (let y = 0; y < 120; y += this.spacing) {
            for (let x = 0; x < canvasRect.width; x += this.spacing) {
                const index = (y * canvasRect.width + x) * 4;
                const alpha = data[index + 3];
                
                if (alpha > 128) {
                    this.particles.push({
                        x: x,
                        y: y,
                        originalX: x,
                        originalY: y,
                        vx: 0,
                        vy: 0,
                        size: this.pixelSize + Math.random() * 1,
                        baseSize: this.pixelSize,
                        alpha: 1,
                        color: this.getRandomColor(),
                        glowIntensity: 0,
                        life: 1,
                        delay: Math.random() * 200,
                        phase: Math.random() * Math.PI * 2
                    });
                }
            }
        }
    }
    
    getRandomColor() {
        const colors = [this.colors.primary, this.colors.secondary, this.colors.accent];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    attachEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.handleMouseLeave());
        
        // Keyboard accessibility
        this.canvas.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.createClickEffect(this.canvas.width / 2, 60);
            }
        });
        
        // Window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 150);
        });
    }
    
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.isVisible = entry.isIntersecting;
                if (!this.isVisible && this.isAnimating) {
                    this.pauseAnimation();
                } else if (this.isVisible && !this.isAnimating) {
                    this.startAnimation();
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(this.canvas);
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.mouseX = x;
        this.mouseY = y;
        
        // Add to mouse trail
        this.mouseTrail.push({ x, y, life: 1 });
        if (this.mouseTrail.length > this.maxTrailLength) {
            this.mouseTrail.shift();
        }
        
        // Start animation if not already running
        if (!this.isAnimating) {
            this.startAnimation();
        }
    }
    
    handleTouch(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        if (touch) {
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            this.mouseX = x;
            this.mouseY = y;
            
            this.mouseTrail.push({ x, y, life: 1 });
            if (this.mouseTrail.length > this.maxTrailLength) {
                this.mouseTrail.shift();
            }
        }
    }
    
    handleMouseLeave() {
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.mouseTrail = [];
    }
    
    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.createClickEffect(x, y);
        this.createRipple(x, y);
    }
    
    createClickEffect(x, y) {
        this.clickEffects.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 50,
            life: 1,
            intensity: 1
        });
    }
    
    createRipple(x, y) {
        this.ripples.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 100,
            life: 1,
            alpha: 0.5
        });
    }
    
    handleResize() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.style.width = rect.width + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.createParticles();
    }
    
    updateParticles(currentTime) {
        const batchSize = Math.ceil(this.particles.length / this.particleUpdateBatch);
        const start = this.currentBatch * batchSize;
        const end = Math.min(start + batchSize, this.particles.length);
        
        for (let i = start; i < end; i++) {
            const particle = this.particles[i];
            
            // Calculate distance to mouse
            const dx = this.mouseX - particle.x;
            const dy = this.mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.repulsionRadius) {
                // Repulsion effect
                const force = (this.repulsionRadius - distance) / this.repulsionRadius;
                const repulsionForce = force * this.repulsionStrength;
                
                particle.vx -= (dx / distance) * repulsionForce * 0.1;
                particle.vy -= (dy / distance) * repulsionForce * 0.1;
                
                // Enhanced glow effect
                particle.glowIntensity = Math.min(this.maxGlow, force * 2);
                particle.size = particle.baseSize + force * 2;
            } else {
                particle.glowIntensity *= 0.95;
                particle.size = particle.baseSize;
            }
            
            // Return to original position
            const returnDx = particle.originalX - particle.x;
            const returnDy = particle.originalY - particle.y;
            
            particle.vx += returnDx * this.returnSpeed;
            particle.vy += returnDy * this.returnSpeed;
            
            // Apply friction
            particle.vx *= 0.9;
            particle.vy *= 0.9;
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Floating animation
            particle.phase += 0.02;
            const float = Math.sin(particle.phase) * 0.5;
            particle.y += float;
        }
        
        this.currentBatch = (this.currentBatch + 1) % this.particleUpdateBatch;
        
        // Update mouse trail
        this.mouseTrail = this.mouseTrail.filter(point => {
            point.life -= 0.05;
            return point.life > 0;
        });
        
        // Update click effects
        this.clickEffects = this.clickEffects.filter(effect => {
            effect.radius += 2;
            effect.life -= 0.02;
            effect.intensity = effect.life;
            return effect.life > 0;
        });
        
        // Update ripples
        this.ripples = this.ripples.filter(ripple => {
            ripple.radius += 3;
            ripple.life -= 0.015;
            ripple.alpha = ripple.life * 0.5;
            return ripple.life > 0;
        });
    }
    
    render() {
        // Clear canvas with subtle background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render mouse trail
        this.renderMouseTrail();
        
        // Render ripples
        this.renderRipples();
        
        // Render particles
        this.renderParticles();
        
        // Render click effects
        this.renderClickEffects();
    }
    
    renderMouseTrail() {
        if (this.mouseTrail.length < 2) return;
        
        this.ctx.strokeStyle = this.colors.trail;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = 0.6;
        
        this.ctx.beginPath();
        for (let i = 0; i < this.mouseTrail.length - 1; i++) {
            const current = this.mouseTrail[i];
            const next = this.mouseTrail[i + 1];
            
            this.ctx.globalAlpha = current.life * 0.6;
            this.ctx.moveTo(current.x, current.y);
            this.ctx.lineTo(next.x, next.y);
        }
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }
    
    renderRipples() {
        this.ripples.forEach(ripple => {
            this.ctx.strokeStyle = this.colors.primary;
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = ripple.alpha;
            
            this.ctx.beginPath();
            this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
    }
    
    renderParticles() {
        this.particles.forEach(particle => {
            // Enhanced glow effect
            if (particle.glowIntensity > 0) {
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = particle.glowIntensity * 10;
            } else {
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.alpha;
            
            // Render particle with enhanced visual effects
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add sparkle effect for highly glowing particles
            if (particle.glowIntensity > 0.7) {
                this.renderSparkle(particle);
            }
        });
        
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1;
    }
    
    renderSparkle(particle) {
        const sparkleSize = particle.size * 0.3;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.globalAlpha = particle.glowIntensity * 0.8;
        
        // Cross sparkle
        this.ctx.fillRect(particle.x - sparkleSize, particle.y - 0.5, sparkleSize * 2, 1);
        this.ctx.fillRect(particle.x - 0.5, particle.y - sparkleSize, 1, sparkleSize * 2);
    }
    
    renderClickEffects() {
        this.clickEffects.forEach(effect => {
            this.ctx.strokeStyle = this.colors.primary;
            this.ctx.lineWidth = 3;
            this.ctx.globalAlpha = effect.intensity;
            
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        this.ctx.globalAlpha = 1;
    }
    
    animate(currentTime) {
        if (!this.isVisible) return;
        
        if (currentTime - this.lastRenderTime >= this.frameInterval) {
            this.updateParticles(currentTime);
            this.render();
            this.lastRenderTime = currentTime;
        }
        
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }
    
    startAnimation() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.animate(performance.now());
        }
    }
    
    pauseAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            this.isAnimating = false;
        }
    }
    
    destroy() {
        this.pauseAnimation();
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.signature-container');
    if (container) {
        // Add loading state
        container.parentElement.classList.add('loading');
        
        // Initialize with a slight delay for better UX
        setTimeout(() => {
            container.parentElement.classList.remove('loading');
            new ModernInteractiveSignature(container, 'YIMING LI');
        }, 500);
    }
});