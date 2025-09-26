// Pixel Text Widget - Interactive Name Display
class PixelTextWidget {
    constructor(container, text) {
        this.container = container;
        this.text = text.toUpperCase();
        this.canvas = null;
        this.pixels = [];
        this.originalPositions = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.isTouching = false;
        this.repulsionRadius = 60;
        this.repulsionStrength = 25;
        this.maxRepulsionStrength = 45;
        this.touchRadius = 80; // Larger radius for touch devices
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        this.createCanvas();
        this.createPixelText();
        this.attachEventListeners();
    }
    
    createCanvas() {
        this.canvas = document.createElement('div');
        this.canvas.className = 'pixel-canvas';
        this.container.appendChild(this.canvas);
    }
    
    // Define pixel patterns for each letter (8x12 grid)
    getLetterPattern(letter) {
        const patterns = {
            'Y': [
                [1,0,0,0,0,0,1],
                [0,1,0,0,0,1,0],
                [0,0,1,0,1,0,0],
                [0,0,0,1,0,0,0],
                [0,0,0,1,0,0,0],
                [0,0,0,1,0,0,0],
                [0,0,0,1,0,0,0],
                [0,0,0,1,0,0,0],
                [0,0,0,1,0,0,0],
                [0,0,0,1,0,0,0],
                [0,0,0,1,0,0,0],
                [0,0,0,0,0,0,0]
            ],
            'I': [
                [1,1,1,1,1],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [1,1,1,1,1],
                [0,0,0,0,0]
            ],
            'M': [
                [1,0,0,0,0,0,1],
                [1,1,0,0,0,1,1],
                [1,0,1,0,1,0,1],
                [1,0,0,1,0,0,1],
                [1,0,0,0,0,0,1],
                [1,0,0,0,0,0,1],
                [1,0,0,0,0,0,1],
                [1,0,0,0,0,0,1],
                [1,0,0,0,0,0,1],
                [1,0,0,0,0,0,1],
                [1,0,0,0,0,0,1],
                [0,0,0,0,0,0,0]
            ],
            'N': [
                [1,0,0,0,0,1],
                [1,1,0,0,0,1],
                [1,0,1,0,0,1],
                [1,0,0,1,0,1],
                [1,0,0,0,1,1],
                [1,0,0,0,0,1],
                [1,0,0,0,0,1],
                [1,0,0,0,0,1],
                [1,0,0,0,0,1],
                [1,0,0,0,0,1],
                [1,0,0,0,0,1],
                [0,0,0,0,0,0]
            ],
            'G': [
                [0,1,1,1,1,0],
                [1,0,0,0,0,1],
                [1,0,0,0,0,0],
                [1,0,0,0,0,0],
                [1,0,0,0,0,0],
                [1,0,0,1,1,1],
                [1,0,0,0,0,1],
                [1,0,0,0,0,1],
                [1,0,0,0,0,1],
                [1,0,0,0,0,1],
                [0,1,1,1,1,0],
                [0,0,0,0,0,0]
            ],
            'L': [
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,1],
                [0,0,0,0,0]
            ],
            ' ': [
                [0,0],
                [0,0],
                [0,0],
                [0,0],
                [0,0],
                [0,0],
                [0,0],
                [0,0],
                [0,0],
                [0,0],
                [0,0],
                [0,0]
            ]
        };
        
        return patterns[letter] || patterns[' '];
    }
    
    createPixelText() {
        this.pixels = [];
        this.originalPositions = [];
        
        const letters = this.text.split('');
        const letterPatterns = letters.map(letter => this.getLetterPattern(letter));
        
        // Create a 2D grid for the entire text
        const maxHeight = Math.max(...letterPatterns.map(pattern => pattern.length));
        let totalWidth = 0;
        
        // Calculate total width
        letterPatterns.forEach(pattern => {
            totalWidth += pattern[0].length + 1; // +1 for spacing between letters
        });
        
        // Create the complete grid
        for (let y = 0; y < maxHeight; y++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'pixel-row';
            
            let currentX = 0;
            
            letterPatterns.forEach((pattern, letterIndex) => {
                const row = pattern[y] || [];
                
                // Add pixels for this letter
                for (let x = 0; x < pattern[0].length; x++) {
                    const isActive = row[x] === 1;
                    const pixel = document.createElement('div');
                    pixel.className = isActive ? 'pixel active' : 'pixel inactive';
                    
                    if (isActive) {
                        const pixelData = {
                            element: pixel,
                            originalX: currentX + x,
                            originalY: y,
                            currentX: currentX + x,
                            currentY: y,
                            velocityX: 0,
                            velocityY: 0
                        };
                        
                        this.pixels.push(pixelData);
                        this.originalPositions.push({
                            x: currentX + x,
                            y: y
                        });
                    }
                    
                    rowDiv.appendChild(pixel);
                }
                
                currentX += pattern[0].length;
                
                // Add spacing between letters (except after the last letter)
                if (letterIndex < letterPatterns.length - 1) {
                    const spacingPixel = document.createElement('div');
                    spacingPixel.className = 'pixel inactive';
                    rowDiv.appendChild(spacingPixel);
                    currentX += 1;
                }
            });
            
            this.canvas.appendChild(rowDiv);
        }
    }
    
    attachEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isTouching) return; // Ignore mouse events during touch
            this.updatePointerPosition(e.clientX, e.clientY);
            this.updatePixelPositions();
        });
        
        this.canvas.addEventListener('mouseenter', () => {
            if (!this.isTouching) {
                this.isMouseOver = true;
                this.startAnimation();
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            if (!this.isTouching) {
                this.isMouseOver = false;
                this.returnPixelsToPosition();
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.isTouching) return;
            this.isMouseDown = true;
            this.repulsionStrength = this.maxRepulsionStrength;
            this.updatePointerPosition(e.clientX, e.clientY);
        });
        
        this.canvas.addEventListener('mouseup', () => {
            if (this.isTouching) return;
            this.isMouseDown = false;
            this.repulsionStrength = 25;
        });
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isTouching = true;
            this.isMouseDown = true;
            this.repulsionStrength = this.maxRepulsionStrength;
            
            const touch = e.touches[0];
            this.updatePointerPosition(touch.clientX, touch.clientY);
            this.startAnimation();
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                this.updatePointerPosition(touch.clientX, touch.clientY);
                this.updatePixelPositions();
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isTouching = false;
            this.isMouseDown = false;
            this.repulsionStrength = 25;
            this.returnPixelsToPosition();
        }, { passive: false });
        
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.isTouching = false;
            this.isMouseDown = false;
            this.repulsionStrength = 25;
            this.returnPixelsToPosition();
        }, { passive: false });
        
        // Global mouse up to handle cases where mouse is released outside canvas
        document.addEventListener('mouseup', () => {
            if (this.isMouseDown && !this.isTouching) {
                this.isMouseDown = false;
                this.repulsionStrength = 25;
            }
        });
    }
    
    updatePointerPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = clientX - rect.left;
        this.mouseY = clientY - rect.top;
    }
    
    startAnimation() {
        if (this.animationId) return;
        
        const animate = () => {
            if (this.isMouseOver || this.isTouching) {
                this.updatePixelPositions();
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.animationId = null;
            }
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    updatePixelPositions() {
        this.pixels.forEach(pixelData => {
            const pixel = pixelData.element;
            const rect = pixel.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            const pixelCenterX = rect.left - canvasRect.left + rect.width / 2;
            const pixelCenterY = rect.top - canvasRect.top + rect.height / 2;
            
            const deltaX = this.mouseX - pixelCenterX;
            const deltaY = this.mouseY - pixelCenterY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Use larger radius for touch devices
            const effectiveRadius = this.isTouching ? this.touchRadius : this.repulsionRadius;
            
            if (distance < effectiveRadius && distance > 0) {
                const force = Math.pow((effectiveRadius - distance) / effectiveRadius, 1.5); // Smoother force curve
                const currentStrength = this.isMouseDown || this.isTouching ? 
                    this.repulsionStrength * 1.8 : this.repulsionStrength;
                
                const repulsionX = (deltaX / distance) * force * currentStrength * -1;
                const repulsionY = (deltaY / distance) * force * currentStrength * -1;
                
                // Smoother velocity application
                pixelData.velocityX += repulsionX * 0.15;
                pixelData.velocityY += repulsionY * 0.15;
                
                // Apply velocity with adaptive damping
                const dampingFactor = this.isTouching ? 0.85 : 0.88;
                pixelData.velocityX *= dampingFactor;
                pixelData.velocityY *= dampingFactor;
                
                // Limit maximum displacement
                const maxDisplacement = this.isTouching ? 40 : 30;
                pixelData.velocityX = Math.max(-maxDisplacement, Math.min(maxDisplacement, pixelData.velocityX));
                pixelData.velocityY = Math.max(-maxDisplacement, Math.min(maxDisplacement, pixelData.velocityY));
                
                pixel.classList.add('displaced');
                const scaleEffect = this.isTouching ? 1 + force * 0.4 : 1 + force * 0.25;
                pixel.style.transform = `translate(${pixelData.velocityX}px, ${pixelData.velocityY}px) scale(${scaleEffect})`;
            } else if (!pixel.classList.contains('returning')) {
                // Gradual return to position for pixels outside influence
                pixelData.velocityX *= 0.95;
                pixelData.velocityY *= 0.95;
                
                if (Math.abs(pixelData.velocityX) < 0.1 && Math.abs(pixelData.velocityY) < 0.1) {
                    pixelData.velocityX = 0;
                    pixelData.velocityY = 0;
                    pixel.classList.remove('displaced');
                    pixel.style.transform = 'translate(0px, 0px) scale(1)';
                } else {
                    pixel.style.transform = `translate(${pixelData.velocityX}px, ${pixelData.velocityY}px) scale(1)`;
                }
            }
        });
    }
    
    returnPixelsToPosition() {
        this.pixels.forEach(pixelData => {
            const pixel = pixelData.element;
            pixel.classList.remove('displaced');
            pixel.classList.add('returning');
            pixel.style.transform = 'translate(0px, 0px) scale(1)';
            
            pixelData.velocityX = 0;
            pixelData.velocityY = 0;
            
            setTimeout(() => {
                pixel.classList.remove('returning');
            }, 800);
        });
    }
}

// Initialize the widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const widgetContainer = document.querySelector('.pixel-text-widget .pixel-container');
    if (widgetContainer) {
        new PixelTextWidget(widgetContainer, 'YIMING LI');
    }
});