// Mosaic Signature Widget - Pushable Effect
class MosaicSignature {
    constructor(container, text) {
        this.container = container;
        this.text = text.toUpperCase();
        this.canvas = null;
        this.ctx = null;
        this.mosaicTiles = [];
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.isAnimating = false;
        this.animationId = null;
        this.lastRenderTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Mosaic configuration
        this.tileSize = 8;
        this.spacing = 1;
        this.pushRadius = 100;
        this.pushStrength = 30;
        this.returnSpeed = 0.12;
        this.maxPushDistance = 50;
        
        // Colors for mosaic effect
        this.colors = [
            '#00d4ff',
            '#0099cc',
            '#64c8ff',
            '#4db8e8',
            '#33a3d6',
            '#1a8ec4',
            '#0078b2'
        ];
        
        // Mouse interaction
        this.isDragging = false;
        this.lastMouseX = 0;
        this.mouseVelocity = 0;
        
        // Performance optimization
        this.isVisible = true;
        this.tileUpdateBatch = 10;
        this.currentBatch = 0;
        
        this.init();
    }
    
    init() {
        this.createCanvas();
        this.createMosaicTiles();
        this.attachEventListeners();
        this.setupIntersectionObserver();
        this.startAnimation();
    }
    
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'signature-canvas';
        this.canvas.setAttribute('role', 'img');
        this.canvas.setAttribute('aria-label', `Mosaic signature: ${this.text}`);
        this.canvas.tabIndex = 0;
        
        // Set canvas to full container width
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Make canvas responsive to container width
        this.canvas.width = rect.width * dpr;
        this.canvas.height = 120 * dpr;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '120px';
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
        
        // Canvas styling
        this.ctx.imageSmoothingEnabled = false; // Crisp mosaic effect
        
        this.container.appendChild(this.canvas);
    }
    
    createMosaicTiles() {
        this.mosaicTiles = [];
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Create temporary canvas for text measurement
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvasRect.width;
        tempCanvas.height = 120;
        
        // Font styling for text measurement
        const fontSize = Math.min(48, canvasRect.width * 0.08);
        tempCtx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
        tempCtx.fillStyle = '#ffffff';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        
        // Draw text
        tempCtx.fillText(this.text, canvasRect.width / 2, 60);
        
        const imageData = tempCtx.getImageData(0, 0, canvasRect.width, 120);
        const data = imageData.data;
        
        // Create mosaic tiles
        for (let y = 0; y < 120; y += this.tileSize + this.spacing) {
            for (let x = 0; x < canvasRect.width; x += this.tileSize + this.spacing) {
                // Sample the center of each tile area
                const centerX = x + this.tileSize / 2;
                const centerY = y + this.tileSize / 2;
                
                if (centerX < canvasRect.width && centerY < 120) {
                    const index = (Math.floor(centerY) * canvasRect.width + Math.floor(centerX)) * 4;
                    const alpha = data[index + 3];
                    
                    if (alpha > 100) {
                        // Calculate tile density based on surrounding pixels
                        let density = 0;
                        let pixelCount = 0;
                        
                        for (let dy = -2; dy <= 2; dy++) {
                            for (let dx = -2; dx <= 2; dx++) {
                                const sampleX = Math.floor(centerX + dx);
                                const sampleY = Math.floor(centerY + dy);
                                
                                if (sampleX >= 0 && sampleX < canvasRect.width && 
                                    sampleY >= 0 && sampleY < 120) {
                                    const sampleIndex = (sampleY * canvasRect.width + sampleX) * 4;
                                    if (data[sampleIndex + 3] > 100) {
                                        density++;
                                    }
                                    pixelCount++;
                                }
                            }
                        }
                        
                        const densityRatio = density / pixelCount;
                        
                        this.mosaicTiles.push({
                            x: x,
                            y: y,
                            originalX: x,
                            originalY: y,
                            size: this.tileSize,
                            color: this.colors[Math.floor(Math.random() * this.colors.length)],
                            density: densityRatio,
                            pushOffset: 0,
                            velocity: 0,
                            alpha: Math.min(1, densityRatio + 0.3),
                            life: 1,
                            phase: Math.random() * Math.PI * 2
                        });
                    }
                }
            }
        }
    }
    
    attachEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Keyboard accessibility
        this.canvas.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.simulateMouseMove(-50, 0);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.simulateMouseMove(50, 0);
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
    
    handleMouseDown(e) {
        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        this.lastMouseX = this.mouseX;
        this.mouseVelocity = 0;
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const newMouseX = e.clientX - rect.left;
        const newMouseY = e.clientY - rect.top;
        
        if (this.isDragging) {
            this.mouseVelocity = newMouseX - this.lastMouseX;
        }
        
        this.mouseX = newMouseX;
        this.mouseY = newMouseY;
        this.lastMouseX = newMouseX;
        
        if (!this.isAnimating) {
            this.startAnimation();
        }
    }
    
    handleMouseUp() {
        this.isDragging = false;
    }
    
    handleMouseLeave() {
        this.isDragging = false;
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.mouseVelocity = 0;
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.isDragging = true;
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
        this.lastMouseX = this.mouseX;
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const newMouseX = touch.clientX - rect.left;
        
        if (this.isDragging) {
            this.mouseVelocity = newMouseX - this.lastMouseX;
        }
        
        this.mouseX = newMouseX;
        this.mouseY = touch.clientY - rect.top;
        this.lastMouseX = newMouseX;
    }
    
    handleTouchEnd() {
        this.isDragging = false;
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.mouseVelocity = 0;
    }
    
    simulateMouseMove(deltaX, deltaY) {
        this.mouseX += deltaX;
        this.mouseY += deltaY;
        this.mouseVelocity = deltaX;
        
        if (!this.isAnimating) {
            this.startAnimation();
        }
    }
    
    handleResize() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.style.width = '100%';
        
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = false;
        this.createMosaicTiles();
    }
    
    updateTiles(currentTime) {
        const batchSize = Math.ceil(this.mosaicTiles.length / this.tileUpdateBatch);
        const start = this.currentBatch * batchSize;
        const end = Math.min(start + batchSize, this.mosaicTiles.length);
        
        for (let i = start; i < end; i++) {
            const tile = this.mosaicTiles[i];
            
            // Calculate distance to mouse
            const dx = this.mouseX - (tile.x + tile.size / 2);
            const dy = this.mouseY - (tile.y + tile.size / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.pushRadius) {
                // Push effect - horizontal movement based on mouse velocity
                const force = (this.pushRadius - distance) / this.pushRadius;
                const pushDirection = this.mouseVelocity > 0 ? 1 : -1;
                
                if (this.isDragging || Math.abs(this.mouseVelocity) > 0.1) {
                    const pushAmount = force * this.pushStrength * (this.mouseVelocity / 10);
                    tile.velocity += pushAmount * 0.1;
                    
                    // Limit maximum push distance
                    const maxPush = this.maxPushDistance * tile.density;
                    tile.velocity = Math.max(-maxPush, Math.min(maxPush, tile.velocity));
                }
            }
            
            // Return to original position
            const returnForce = (tile.originalX - tile.x) * this.returnSpeed;
            tile.velocity += returnForce;
            
            // Apply friction
            tile.velocity *= 0.85;
            
            // Update position
            tile.x += tile.velocity;
            
            // Subtle floating animation
            tile.phase += 0.01;
            const float = Math.sin(tile.phase) * 0.3;
            tile.y = tile.originalY + float;
        }
        
        this.currentBatch = (this.currentBatch + 1) % this.tileUpdateBatch;
        
        // Decay mouse velocity
        this.mouseVelocity *= 0.9;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render mosaic tiles
        this.mosaicTiles.forEach(tile => {
            this.ctx.fillStyle = tile.color;
            this.ctx.globalAlpha = tile.alpha;
            
            // Draw square tile
            this.ctx.fillRect(
                Math.round(tile.x), 
                Math.round(tile.y), 
                tile.size, 
                tile.size
            );
            
            // Add subtle highlight for 3D effect
            if (tile.density > 0.7) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.fillRect(
                    Math.round(tile.x), 
                    Math.round(tile.y), 
                    tile.size, 
                    1
                );
                this.ctx.fillRect(
                    Math.round(tile.x), 
                    Math.round(tile.y), 
                    1, 
                    tile.size
                );
            }
        });
        
        this.ctx.globalAlpha = 1;
    }
    
    animate(currentTime) {
        if (!this.isVisible) return;
        
        if (currentTime - this.lastRenderTime >= this.frameInterval) {
            this.updateTiles(currentTime);
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
        
        // Initialize with a slight delay
        setTimeout(() => {
            container.parentElement.classList.remove('loading');
            new MosaicSignature(container, 'Yiming Li');
        }, 300);
    }
});