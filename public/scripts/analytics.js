// This script is loaded lazily to improve initial page load performance
console.log('Analytics script loaded');

// Function to track page views
function trackPageView() {
  // Placeholder for actual analytics implementation
  console.log('Page view tracked:', window.location.pathname);
}

// Function to track events
function trackEvent(category, action, label, value) {
  // Placeholder for actual analytics implementation
  console.log('Event tracked:', { category, action, label, value });
}

// Initialize analytics after page has fully loaded
window.addEventListener('load', function() {
  // Delay analytics initialization to prioritize user interaction
  setTimeout(function() {
    trackPageView();
    console.log('Analytics initialized');
  }, 2000);
});

// Export functions for use in components
window.GHAnalytics = {
  trackPageView,
  trackEvent
}; 