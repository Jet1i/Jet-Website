// Performance-Optimized Signature Widget
class PerformanceOptimizedSignature {
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
        
        // Optimized configuration
        this.pixelSize = 4; // Increased for fewer particles
        this.spacing = 3; // Increased spacing
        this.repulsionRadius = 60; // Reduced radius
        this.repulsionStrength = 20; // Reduced strength
        this.returnSpeed = 0.12; // Faster return
        this.glowIntensity = 0;
        
        // Performance tracking
        this.particleUpdateBatch = 5; // Update particles in batches
        this.currentBatch = 0;
        
        this.init();
    }
    
    init() {
        this.createCanvas();
        this.createParticles();
        this.attachEventListeners();
        this.startAnimation();
    }
    
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'signature-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limit DPR for performance
        const rect = this.container.getBoundingClientRect();
        const containerWidth = rect.width || window.innerWidth * 0.9;
        
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = 200 * dpr; // Reduced height
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = '200px';
        
        this.ctx.scale(dpr, dpr);
        
        // Enable canvas optimizations
        this.ctx.imageSmoothingEnabled = false;
        
        this.container.appendChild(this.canvas);
    }
    
    createParticles() {
        const containerWidth = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
        const fontSize = Math.min(containerWidth / 10, 60); // Smaller font
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        canvas.width = containerWidth * 0.8;
        canvas.height = fontSize * 1.2;
        
        // Re-apply styles
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(this.text, canvas.width / 2, canvas.height / 2);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const centerX = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2)) / 2;
        const centerY = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2)) / 2;
        const offsetX = canvas.width / 2;
        const offsetY = canvas.height / 2;
        
        // Create fewer particles with larger spacing
        for (let y = 0; y < canvas.height; y += 4) { // Increased step
            for (let x = 0; x < canvas.width; x += 4) { // Increased step
                const index = (y * canvas.width + x) * 4;
                const alpha = data[index + 3];
                
                if (alpha > 100) { // Higher threshold for fewer particles
                    const particle = {
                        originalX: centerX + (x - offsetX),
                        originalY: centerY + (y - offsetY),
                        x: centerX + (x - offsetX),
                        y: centerY + (y - offsetY),
                        vx: 0,
                        vy: 0,
                        size: 2.5,
                        opacity: Math.min(alpha / 255, 0.9),
                        hue: 180 + Math.random() * 30,
                        isTextParticle: true,
                        needsUpdate: false
                    };
                    this.particles.push(particle);
                }
            }
        }
        
        console.log(`Created ${this.particles.length} particles`); // For debugging
    }
    
    attachEventListeners() {
        // Throttled mouse movement
        let mouseMoveTimeout;
        const updateMouse = (e) => {
            if (mouseMoveTimeout) return;
            
            mouseMoveTimeout = setTimeout(() => {
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = e.clientX - rect.left;
                this.mouseY = e.clientY - rect.top;
                mouseMoveTimeout = null;
            }, 16); // ~60fps throttling
        };
        
        this.canvas.addEventListener('mousemove', updateMouse, { passive: true });
        
        // Touch events with throttling
        let touchMoveTimeout;
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (touchMoveTimeout) return;
            
            touchMoveTimeout = setTimeout(() => {
                if (e.touches.length > 0) {
                    const rect = this.canvas.getBoundingClientRect();
                    this.mouseX = e.touches[0].clientX - rect.left;
                    this.mouseY = e.touches[0].clientY - rect.top;
                }
                touchMoveTimeout = null;
            }, 16);
        }, { passive: false });
        
        this.canvas.addEventListener('mouseenter', () => {
            this.isAnimating = true;
        }, { passive: true });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isAnimating = false;
            this.mouseX = -1000;
            this.mouseY = -1000;
        }, { passive: true });
        
        // Debounced resize handler
        let resizeTimeout;
        window.addEventListener('resize', () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 300);
        }, { passive: true });
    }
    
    handleResize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = this.container.getBoundingClientRect();
        const containerWidth = rect.width || window.innerWidth * 0.9;
        
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = 200 * dpr;
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = '200px';
        
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = false;
        
        this.particles = [];
        this.createParticles();
    }
    
    updateParticles() {
        // Update particles in batches for better performance
        const batchSize = Math.ceil(this.particles.length / this.particleUpdateBatch);
        const startIndex = this.currentBatch * batchSize;
        const endIndex = Math.min(startIndex + batchSize, this.particles.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const particle = this.particles[i];
            let needsUpdate = false;
            
            const dx = this.mouseX - particle.x;
            const dy = this.mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.repulsionRadius && this.isAnimating) {
                const force = (this.repulsionRadius - distance) / this.repulsionRadius;
                const repulsionX = -(dx / distance) * force * this.repulsionStrength;
                const repulsionY = -(dy / distance) * force * this.repulsionStrength;
                
                particle.vx += repulsionX;
                particle.vy += repulsionY;
                needsUpdate = true;
            }
            
            // Return to original position
            const returnX = (particle.originalX - particle.x) * this.returnSpeed;
            const returnY = (particle.originalY - particle.y) * this.returnSpeed;
            
            particle.vx += returnX;
            particle.vy += returnY;
            
            // Apply velocity with damping
            particle.vx *= 0.85; // Increased damping
            particle.vy *= 0.85;
            
            if (Math.abs(particle.vx) > 0.01 || Math.abs(particle.vy) > 0.01) {
                particle.x += particle.vx;
                particle.y += particle.vy;
                needsUpdate = true;
            }
            
            particle.needsUpdate = needsUpdate;
        }
        
        this.currentBatch = (this.currentBatch + 1) % this.particleUpdateBatch;
    }
    
    render(currentTime) {
        // Frame rate limiting
        if (currentTime - this.lastRenderTime < this.frameInterval) {
            return false;
        }
        this.lastRenderTime = currentTime;
        
        // Clear canvas efficiently
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update glow effect smoothly
        if (this.isAnimating) {
            this.glowIntensity = Math.min(this.glowIntensity + 0.08, 1);
        } else {
            this.glowIntensity = Math.max(this.glowIntensity - 0.04, 0);
        }
        
        // Simplified rendering without complex gradients
        this.ctx.globalCompositeOperation = 'source-over';
        
        this.particles.forEach(particle => {
            const baseOpacity = particle.opacity;
            const size = particle.size + (this.glowIntensity * 0.5);
            
            // Simplified glow effect
            if (this.glowIntensity > 0.1) {
                this.ctx.beginPath();
                this.ctx.fillStyle = `hsla(${particle.hue}, 80%, 60%, ${this.glowIntensity * baseOpacity * 0.3})`;
                this.ctx.arc(particle.x, particle.y, size * 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Main particle
            this.ctx.beginPath();
            this.ctx.fillStyle = `hsla(${particle.hue}, 90%, 75%, ${baseOpacity})`;
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        return true;
    }
    
    startAnimation() {
        const animate = (currentTime) => {
            this.updateParticles();
            
            // Only render if necessary
            if (this.isAnimating || this.glowIntensity > 0) {
                this.render(currentTime);
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.signature-container');
    if (container) {
        new PerformanceOptimizedSignature(container, 'YIMING LI');
    }
});