/**
 * Mobile Optimizations for Memorial App
 * Handles touch gestures, viewport management, and performance
 */

// ============ Viewport Management ============

// Prevent zoom on orientation change
let viewport = document.querySelector("meta[name=viewport]");
if (viewport) {
    viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
}

// ============ Touch Gesture Improvements ============

// Better active states for touch
document.addEventListener('touchstart', function() {}, { passive: true });

// Prevent double-tap zoom on buttons
const buttons = document.querySelectorAll('button, .btn-action, .professional-btn');
buttons.forEach(button => {
    button.addEventListener('touchend', function(e) {
        e.preventDefault();
        this.click();
    }, { passive: false });
});

// ============ Image Lazy Loading Enhancement ============

// Progressive image loading with intersection observer
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.01
    });
    
    // Observe all lazy images
    document.addEventListener('DOMContentLoaded', () => {
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');
        lazyImages.forEach(img => imageObserver.observe(img));
    });
}

// ============ Network Status Detection ============

// Show offline indicator
function updateOnlineStatus() {
    if (!navigator.onLine) {
        document.body.classList.add('offline');
        showOfflineNotification();
    } else {
        document.body.classList.remove('offline');
        hideOfflineNotification();
    }
}

function showOfflineNotification() {
    let indicator = document.querySelector('.offline-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'offline-indicator';
        indicator.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span>لا يوجد اتصال بالإنترنت</span>
            </div>
        `;
        document.body.prepend(indicator);
    }
    indicator.style.display = 'block';
}

function hideOfflineNotification() {
    const indicator = document.querySelector('.offline-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Check on load
if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
    updateOnlineStatus();
}

// ============ Scroll Performance ============

// Passive event listeners for better scroll performance
let supportsPassive = false;
try {
    const opts = Object.defineProperty({}, 'passive', {
        get: function() {
            supportsPassive = true;
        }
    });
    window.addEventListener('testPassive', null, opts);
    window.removeEventListener('testPassive', null, opts);
} catch (e) {}

const passiveIfSupported = supportsPassive ? { passive: true } : false;

// Add passive listeners to scroll events
['scroll', 'touchstart', 'touchmove', 'touchend'].forEach(event => {
    document.addEventListener(event, function() {}, passiveIfSupported);
});

// ============ Orientation Change Handler ============

let previousOrientation = window.orientation || screen.orientation?.angle || 0;

function handleOrientationChange() {
    const currentOrientation = window.orientation || screen.orientation?.angle || 0;
    
    if (currentOrientation !== previousOrientation) {
        // Recalculate viewport
        setTimeout(() => {
            window.scrollTo(0, 1);
            window.scrollTo(0, 0);
        }, 100);
        
        previousOrientation = currentOrientation;
    }
}

window.addEventListener('orientationchange', handleOrientationChange);
if (screen.orientation) {
    screen.orientation.addEventListener('change', handleOrientationChange);
}

// ============ Virtual Keyboard Detection ============

// Detect when virtual keyboard appears
let initialHeight = window.innerHeight;

function handleResize() {
    const currentHeight = window.innerHeight;
    const keyboardVisible = currentHeight < initialHeight - 100;
    
    if (keyboardVisible) {
        document.body.classList.add('keyboard-visible');
    } else {
        document.body.classList.remove('keyboard-visible');
    }
}

window.addEventListener('resize', handleResize, passiveIfSupported);

// ============ Touch Feedback ============

// Add ripple effect to buttons on touch
function createRipple(event) {
    const button = event.currentTarget;
    
    // Only for touch events
    if (!event.touches && event.type !== 'click') return;
    
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    const rect = button.getBoundingClientRect();
    const x = (event.touches ? event.touches[0].clientX : event.clientX) - rect.left - radius;
    const y = (event.touches ? event.touches[0].clientY : event.clientY) - rect.top - radius;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.classList.add('ripple');
    
    const ripple = button.getElementsByClassName('ripple')[0];
    if (ripple) {
        ripple.remove();
    }
    
    button.appendChild(circle);
    
    setTimeout(() => circle.remove(), 600);
}

// Apply to buttons (optional - can be enabled if desired)
// document.querySelectorAll('button, .btn-action').forEach(button => {
//     button.addEventListener('touchstart', createRipple, passiveIfSupported);
// });

// ============ Performance Monitoring ============

// Log performance metrics
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            const connectTime = perfData.responseEnd - perfData.requestStart;
            const renderTime = perfData.domComplete - perfData.domLoading;
            
            console.log('📊 Performance Metrics:');
            console.log(`  Page Load Time: ${pageLoadTime}ms`);
            console.log(`  Connection Time: ${connectTime}ms`);
            console.log(`  Render Time: ${renderTime}ms`);
            
            // Send to analytics if needed
            // analytics.track('page_performance', { pageLoadTime, connectTime, renderTime });
        }, 0);
    });
}

// ============ Pull-to-Refresh Handler ============

let startY = 0;
let pulling = false;

document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        pulling = true;
    }
}, passiveIfSupported);

document.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    
    const currentY = e.touches[0].pageY;
    const pullDistance = currentY - startY;
    
    // Prevent pull-to-refresh on modals and important elements
    const target = e.target;
    if (target.closest('.search-modal, .modal, header')) {
        pulling = false;
        return;
    }
    
    // Visual feedback for pull distance
    if (pullDistance > 80 && window.scrollY === 0) {
        // Could add refresh indicator here
    }
}, passiveIfSupported);

document.addEventListener('touchend', () => {
    pulling = false;
    startY = 0;
}, passiveIfSupported);

// ============ Memory Management ============

// Clear cache if memory is low (experimental)
if ('memory' in performance) {
    setInterval(() => {
        const memoryInfo = performance.memory;
        const usedMemoryPercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
        
        if (usedMemoryPercent > 90) {
            console.warn('⚠️ High memory usage detected. Consider clearing cache.');
            // Could trigger cache cleanup here
        }
    }, 30000); // Check every 30 seconds
}

// ============ Connection Quality Detection ============

// Detect slow network and adjust accordingly
if ('connection' in navigator) {
    const connection = navigator.connection;
    
    function handleConnectionChange() {
        const effectiveType = connection.effectiveType;
        
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            document.body.classList.add('slow-connection');
            console.log('🐢 Slow connection detected. Reducing data usage.');
        } else {
            document.body.classList.remove('slow-connection');
        }
    }
    
    connection.addEventListener('change', handleConnectionChange);
    handleConnectionChange(); // Check on load
}

// ============ iOS Standalone Mode Detection ============

// Detect if running as PWA
const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || window.navigator.standalone 
    || document.referrer.includes('android-app://');

if (isStandalone) {
    document.body.classList.add('pwa-standalone');
    console.log('📱 Running in PWA mode');
}

// ============ Safe Area Insets Helper ============

// Add CSS custom properties for safe areas
function updateSafeAreaInsets() {
    const root = document.documentElement;
    
    if (CSS.supports('padding-top: env(safe-area-inset-top)')) {
        root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)');
        root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
        root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left)');
        root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right)');
    }
}

updateSafeAreaInsets();

// ============ Utility Functions ============

// Debounce function for resize/scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for frequent events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export utilities for use in other scripts
window.mobileUtils = {
    debounce,
    throttle,
    isStandalone,
    updateOnlineStatus
};

console.log('📱 Mobile optimizations loaded successfully');
