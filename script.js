// Mobile Navigation Toggle - Full Screen Menu
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navClose = document.querySelector('.nav-close');
    
    console.log('DOM loaded, hamburger:', !!hamburger, 'navMenu:', !!navMenu, 'navClose:', !!navClose);

    // Initialize ARIA attributes and id for accessibility
    if (hamburger && navMenu) {
        if (!navMenu.id) {
            navMenu.id = 'primary-navigation';
        }
        hamburger.setAttribute('aria-controls', navMenu.id);
        hamburger.setAttribute('aria-expanded', 'false');
        navMenu.setAttribute('aria-hidden', 'true');
    }

    function openMenu() {
        // Portal nav menu to body so it overlays the whole page (avoid clipping by navbar/backdrop)
        try {
            if (!window.__navMenuPlaceholder && navMenu) {
                window.__navMenuPlaceholder = document.createElement('div');
                window.__navMenuPlaceholder.id = 'nav-menu-placeholder';
                window.__navMenuPlaceholder.style.display = 'none';
                navMenu.parentElement.insertBefore(window.__navMenuPlaceholder, navMenu);
            }
            if (navMenu && navMenu.parentElement !== document.body) {
                document.body.appendChild(navMenu);
            }
        } catch (e) {
            console.warn('Portal nav-menu failed:', e);
        }
        hamburger.classList.add('active');
        navMenu.classList.add('active');
        hamburger.setAttribute('aria-expanded','true');
        navMenu.setAttribute('aria-hidden','false');
        // document.body.classList.add('menu-open'); // optional for drawer/backdrop if needed later
        // document.body.style.overflow = 'hidden'; // keep background scroll for side drawer
        console.log('Menu opened');
    }
    
    function closeMenu() {
        // Restore nav menu back into navbar structure
        try {
            if (window.__navMenuPlaceholder && window.__navMenuPlaceholder.parentElement && navMenu && navMenu.parentElement === document.body) {
                window.__navMenuPlaceholder.parentElement.insertBefore(navMenu, window.__navMenuPlaceholder);
            }
        } catch (e) {
            console.warn('Restore nav-menu failed:', e);
        }
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        hamburger.setAttribute('aria-expanded','false');
        navMenu.setAttribute('aria-hidden','true');
        document.body.classList.remove('menu-open');
        // document.body.style.overflow = ''; // no-op for side drawer
        console.log('Menu closed');
    }

    if (hamburger && navMenu) {
        // Open menu when hamburger is clicked
        hamburger.addEventListener('click', function(e) {
            console.log('Hamburger button clicked!');
            if (navMenu.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
        
        // Close menu when close button is clicked
        if (navClose) {
            navClose.addEventListener('click', function(e) {
                console.log('Close button clicked!');
                closeMenu();
            });
        }

        // Close mobile menu when clicking on a navigation link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });
        
        // Close when clicking outside the floating panel
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !hamburger.contains(e.target) && navMenu.classList.contains('active')) {
                closeMenu();
            }
        });

        // Close menu on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                closeMenu();
            }
        });
    } else {
        console.error('Elements not found - hamburger:', !!hamburger, 'navMenu:', !!navMenu);
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        // Close mobile menu first
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        if (hamburger && navMenu) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            hamburger.setAttribute('aria-expanded','false');
            navMenu.setAttribute('aria-hidden','true');
            document.body.classList.remove('menu-open');
            document.body.style.overflow = '';
        }
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            // Add small delay to allow menu to close
            setTimeout(() => {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }
    });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
    }
});

// Simple fade-in animation for elements when they come into view
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Apply fade-in animation to cards and sections
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.project-card, .experience-item, .award-item, .skill-item');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Add active state to navigation links based on scroll position
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Add CSS for active navigation link
const style = document.createElement('style');
style.textContent = `
    .nav-link.active {
        color: #2563eb;
        font-weight: 600;
    }
    
    .nav-link.active::after {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 0;
        width: 100%;
        height: 2px;
        background: #2563eb;
    }
`;
document.head.appendChild(style);