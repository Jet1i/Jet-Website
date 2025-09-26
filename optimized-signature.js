// Optimized Signature Widget - Canvas-based for better performance
class OptimizedSignature {
    constructor(container, text) {
        this.container = container;
        this.text = text.toUpperCase();
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.isAnimating = false;
        this.animationId = null;
        
        // Configuration
        this.pixelSize = 3;
        this.spacing = 1;
        this.repulsionRadius = 80;
        this.repulsionStrength = 30;
        this.returnSpeed = 0.08;
        this.glowIntensity = 0;
        
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
        
        // Set canvas size to full container width
        const dpr = window.devicePixelRatio || 1;
        const rect = this.container.getBoundingClientRect();
        const containerWidth = rect.width || window.innerWidth * 0.9;
        
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = 250 * dpr; // Increased height for larger text
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = '250px';
        
        this.ctx.scale(dpr, dpr);
        this.container.appendChild(this.canvas);
    }
    
    createParticles() {
        // Calculate responsive font size based on container width
        const containerWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const fontSize = Math.min(containerWidth / 8, 80); // Responsive size, max 80px
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set up text rendering
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Make canvas width match container width for full-width text
        canvas.width = containerWidth * 0.9; // 90% of container width for some padding
        canvas.height = fontSize * 1.5;
        
        // Re-apply styles after canvas resize
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw text
        ctx.fillText(this.text, canvas.width / 2, canvas.height / 2);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Create particles from text pixels
        const centerX = this.canvas.width / (window.devicePixelRatio || 1) / 2;
        const centerY = this.canvas.height / (window.devicePixelRatio || 1) / 2;
        const offsetX = canvas.width / 2;
        const offsetY = canvas.height / 2;
        
        // Create denser particles for better text visibility
        for (let y = 0; y < canvas.height; y += 2) {
            for (let x = 0; x < canvas.width; x += 2) {
                const index = (y * canvas.width + x) * 4;
                const alpha = data[index + 3];
                
                if (alpha > 50) { // Lower threshold for more particles
                    const particle = {
                        originalX: centerX + (x - offsetX),
                        originalY: centerY + (y - offsetY),
                        x: centerX + (x - offsetX),
                        y: centerY + (y - offsetY),
                        vx: 0,
                        vy: 0,
                        size: 2,
                        opacity: alpha / 255,
                        hue: 180 + Math.random() * 40, // Cyan to blue range
                        isTextParticle: true
                    };
                    this.particles.push(particle);
                }
            }
        }
    }
    
    attachEventListeners() {
        const updateMouse = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        };
        
        this.canvas.addEventListener('mousemove', updateMouse);
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = e.touches[0].clientX - rect.left;
                this.mouseY = e.touches[0].clientY - rect.top;
            }
        });
        
        this.canvas.addEventListener('mouseenter', () => {
            this.isAnimating = true;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isAnimating = false;
            this.mouseX = -1000;
            this.mouseY = -1000;
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    handleResize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.container.getBoundingClientRect();
        const containerWidth = rect.width || window.innerWidth * 0.9;
        
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = 250 * dpr; // Increased height for larger text
        this.canvas.style.width = containerWidth + 'px';
        this.canvas.style.height = '250px';
        
        this.ctx.scale(dpr, dpr);
        
        // Recreate particles with new positioning
        this.particles = [];
        this.createParticles();
    }
    
    updateParticles() {
        this.particles.forEach(particle => {
            const dx = this.mouseX - particle.x;
            const dy = this.mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.repulsionRadius && this.isAnimating) {
                // Repulsion force
                const force = (this.repulsionRadius - distance) / this.repulsionRadius;
                const repulsionX = -(dx / distance) * force * this.repulsionStrength;
                const repulsionY = -(dy / distance) * force * this.repulsionStrength;
                
                particle.vx += repulsionX;
                particle.vy += repulsionY;
            }
            
            // Return to original position
            const returnX = (particle.originalX - particle.x) * this.returnSpeed;
            const returnY = (particle.originalY - particle.y) * this.returnSpeed;
            
            particle.vx += returnX;
            particle.vy += returnY;
            
            // Apply velocity with damping
            particle.vx *= 0.9;
            particle.vy *= 0.9;
            
            particle.x += particle.vx;
            particle.y += particle.vy;
        });
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update glow effect
        if (this.isAnimating) {
            this.glowIntensity = Math.min(this.glowIntensity + 0.05, 1);
        } else {
            this.glowIntensity = Math.max(this.glowIntensity - 0.02, 0);
        }
        
        // Render particles
        this.particles.forEach(particle => {
            const baseOpacity = particle.opacity || 1;
            const glowSize = 1 + this.glowIntensity * 1.5;
            const finalSize = particle.size * glowSize;
            
            // Enhanced glow effect for better visibility
            if (this.glowIntensity > 0) {
                this.ctx.beginPath();
                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, finalSize * 3
                );
                gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, ${this.glowIntensity * baseOpacity * 0.9})`);
                gradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 60%, ${this.glowIntensity * baseOpacity * 0.5})`);
                gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`);
                
                this.ctx.fillStyle = gradient;
                this.ctx.arc(particle.x, particle.y, finalSize * 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Main particle with enhanced visibility
            this.ctx.beginPath();
            this.ctx.fillStyle = `hsla(${particle.hue}, 100%, 70%, ${baseOpacity})`;
            this.ctx.arc(particle.x, particle.y, Math.max(finalSize, 1.5), 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add bright core for text particles
            if (particle.isTextParticle) {
                this.ctx.beginPath();
                this.ctx.fillStyle = `hsla(${particle.hue}, 80%, 90%, ${baseOpacity * 0.8})`;
                this.ctx.arc(particle.x, particle.y, Math.max(finalSize * 0.6, 1), 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    startAnimation() {
        const animate = () => {
            this.updateParticles();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
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
        new OptimizedSignature(container, 'YIMING LI');
    }
});