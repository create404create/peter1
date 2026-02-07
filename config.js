// Configuration File
const CONFIG = {
    // Use proxy server to avoid CORS issues
    USE_PROXY: true,
    
    // Proxy server URL (upload this to your hosting)
    PROXY_URL: 'https://your-domain.com/proxy-server.php',
    
    // Direct API URLs (will only work if CORS is enabled)
    DIRECT_APIS: {
        TCPA_V1: 'https://api.uspeoplesearch.site/tcpa/v1?x=',
        PERSON_V1: 'https://api.uspeoplesearch.site/v1/?x='
    },
    
    // Processing settings
    BATCH_SIZE: 50, // Numbers to process at once
    DELAY_BETWEEN_REQUESTS: 1000, // 1 second delay
    MAX_RETRIES: 3,
    
    // Cache settings
    ENABLE_CACHE: true,
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    
    // Performance settings
    CONCURRENT_REQUESTS: 3, // Number of parallel requests
    TIMEOUT: 10000, // 10 seconds timeout
};

// Performance monitoring
let performanceStats = {
    startTime: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0
};

// Initialize config
function initConfig() {
    console.log('Configuration loaded:', CONFIG);
    
    // Check if localStorage is available
    if (typeof localStorage !== 'undefined') {
        // Load saved settings
        const savedBatchSize = localStorage.getItem('batchSize');
        if (savedBatchSize) {
            CONFIG.BATCH_SIZE = parseInt(savedBatchSize);
        }
        
        const savedDelay = localStorage.getItem('requestDelay');
        if (savedDelay) {
            CONFIG.DELAY_BETWEEN_REQUESTS = parseInt(savedDelay);
        }
    }
}

// Save settings to localStorage
function saveSettings() {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('batchSize', CONFIG.BATCH_SIZE.toString());
        localStorage.setItem('requestDelay', CONFIG.DELAY_BETWEEN_REQUESTS.toString());
        showNotification('Settings saved successfully', 'success');
    }
}

// Update performance stats
function updatePerformanceStats(success, responseTime) {
    performanceStats.totalRequests++;
    
    if (success) {
        performanceStats.successfulRequests++;
    } else {
        performanceStats.failedRequests++;
    }
    
    // Update average response time
    if (responseTime) {
        const oldAverage = performanceStats.averageResponseTime;
        const newCount = performanceStats.successfulRequests + performanceStats.failedRequests;
        performanceStats.averageResponseTime = 
            ((oldAverage * (newCount - 1)) + responseTime) / newCount;
    }
    
    // Update UI if available
    updatePerformanceUI();
}

// Update performance UI
function updatePerformanceUI() {
    const performanceEl = document.getElementById('performanceStats');
    if (performanceEl) {
        const successRate = performanceStats.totalRequests > 0 
            ? ((performanceStats.successfulRequests / performanceStats.totalRequests) * 100).toFixed(1)
            : 0;
        
        performanceEl.innerHTML = `
            <div class="performance-stats">
                <div class="stat-item">
                    <span class="stat-label">Success Rate:</span>
                    <span class="stat-value ${successRate >= 90 ? 'text-success' : successRate >= 70 ? 'text-warning' : 'text-danger'}">
                        ${successRate}%
                    </span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Requests:</span>
                    <span class="stat-value">${performanceStats.totalRequests}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Avg Response Time:</span>
                    <span class="stat-value">${performanceStats.averageResponseTime.toFixed(0)}ms</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Cache Hits:</span>
                    <span class="stat-value">${performanceStats.cacheHits}</span>
                </div>
            </div>
        `;
    }
}

// Start performance monitoring
function startPerformanceMonitoring() {
    performanceStats.startTime = Date.now();
    performanceStats.totalRequests = 0;
    performanceStats.successfulRequests = 0;
    performanceStats.failedRequests = 0;
    performanceStats.averageResponseTime = 0;
    performanceStats.cacheHits = 0;
    
    console.log('Performance monitoring started');
}

// Get performance report
function getPerformanceReport() {
    const endTime = Date.now();
    const totalTime = endTime - (performanceStats.startTime || endTime);
    const requestsPerSecond = totalTime > 0 
        ? (performanceStats.totalRequests / (totalTime / 1000)).toFixed(2)
        : 0;
    
    return {
        totalTime: Math.round(totalTime / 1000),
        totalRequests: performanceStats.totalRequests,
        successfulRequests: performanceStats.successfulRequests,
        failedRequests: performanceStats.failedRequests,
        successRate: performanceStats.totalRequests > 0 
            ? ((performanceStats.successfulRequests / performanceStats.totalRequests) * 100).toFixed(1)
            : 0,
        averageResponseTime: performanceStats.averageResponseTime.toFixed(0),
        requestsPerSecond: requestsPerSecond,
        cacheHits: performanceStats.cacheHits,
        cacheHitRate: performanceStats.totalRequests > 0 
            ? ((performanceStats.cacheHits / performanceStats.totalRequests) * 100).toFixed(1)
            : 0
    };
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.performanceStats = performanceStats;
    window.initConfig = initConfig;
    window.saveSettings = saveSettings;
    window.updatePerformanceStats = updatePerformanceStats;
    window.startPerformanceMonitoring = startPerformanceMonitoring;
    window.getPerformanceReport = getPerformanceReport;
}
