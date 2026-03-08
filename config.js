// Configuration for the slideshow application
window.SlideshowConfig = {
  // Backend URL - auto-detects environment
  backendUrl: (() => {
    // Auto-detect environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Development environment - use Node.js backend
      return 'http://localhost:3000';
    } else {
      // Production environment - backend required
      return null; // Will use relative paths like /api/data.json
    }
  })(),
  
  // NO fallback behavior - backend must be operational
  useFallback: false,
  
  // Production mode detection
  productionMode: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
  
  // Authentication session duration (in milliseconds)
  sessionDuration: 4 * 60 * 60 * 1000, // 4 hours
  
  // Data refresh interval for the slideshow (in milliseconds)
  dataRefreshInterval: 30 * 1000, // 30 seconds
  
  // Connection timeout for backend requests (in milliseconds)
  requestTimeout: 5000 // 5 seconds
};
