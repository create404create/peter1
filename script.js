// Main Validation Script
let fileContent = null;
let phoneNumbers = [];
let validationResults = [];
let currentStep = 1;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupDragAndDrop();
    setupFileInput();
    updateStepIcons();
});

// Drag and Drop Setup
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// File Input Setup
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });
}

// Handle File Selection
function handleFile(file) {
    if (!file.name.endsWith('.txt')) {
        showNotification('Please select a .txt file', 'danger');
        return;
    }
    
    // Update file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    
    // Enable validate button
    document.getElementById('validateBtn').disabled = false;
    
    // Read file content
    const reader = new FileReader();
    reader.onload = function(e) {
        fileContent = e.target.result;
        
        // Count lines in file
        const lines = e.target.result.split('\n');
        const numberCount = lines.filter(line => line.trim().length > 0).length;
        document.getElementById('fileCount').textContent = numberCount + ' numbers';
        
        // Show file info
        document.getElementById('fileInfo').classList.remove('d-none');
        
        showNotification(`File loaded: ${numberCount.toLocaleString()} numbers found`, 'success');
    };
    reader.readAsText(file);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Start Basic Validation
function startBasicValidation() {
    if (!fileContent) {
        showNotification('Please select a file first', 'warning');
        return;
    }
    
    // Reset results
    validationResults = [];
    phoneNumbers = [];
    
    // Disable button and show loading
    const validateBtn = document.getElementById('validateBtn');
    validateBtn.disabled = true;
    validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Validating...';
    
    // Parse file content
    const lines = fileContent.split('\n');
    let totalNumbers = 0;
    let validNumbers = 0;
    
    // Process in batches to prevent UI freeze
    const batchSize = 5000;
    const totalBatches = Math.ceil(lines.length / batchSize);
    let currentBatch = 0;
    
    function processBatch() {
        const startIdx = currentBatch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, lines.length);
        
        for (let i = startIdx; i < endIdx; i++) {
            const line = lines[i].trim();
            if (line) {
                const cleaned = cleanPhoneNumber(line);
                const isValid = isValidUSNumber(cleaned);
                const areaCode = cleaned.substring(0, 3);
                const state = getStateFromAreaCode(areaCode);
                
                const result = {
                    original: line,
                    cleaned: cleaned,
                    areaCode: areaCode,
                    state: state,
                    isValid: isValid,
                    dncStatus: 'pending',
                    dncData: null,
                    personData: null,
                    carrier: null,
                    lineType: null
                };
                
                validationResults.push(result);
                phoneNumbers.push(result);
                totalNumbers++;
                
                if (isValid) validNumbers++;
            }
        }
        
        currentBatch++;
        
        // Update progress
        const progress = (currentBatch / totalBatches) * 100;
        updateValidationProgress(progress);
        
        // Continue with next batch or finish
        if (currentBatch < totalBatches) {
            setTimeout(processBatch, 10);
        } else {
            finishValidation(totalNumbers, validNumbers);
        }
    }
    
    // Start batch processing
    processBatch();
}

// Clean phone number
function cleanPhoneNumber(number) {
    // Remove all non-digit characters
    let cleaned = number.replace(/\D/g, '');
    
    // Remove US country code if present
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = cleaned.substring(1);
    }
    
    // If still longer than 10 digits, take last 10
    if (cleaned.length > 10) {
        cleaned = cleaned.substring(cleaned.length - 10);
    }
    
    return cleaned;
}

// Validate US phone number
function isValidUSNumber(number) {
    // Must be exactly 10 digits
    if (number.length !== 10) return false;
    
    // First digit cannot be 0 or 1
    if (number[0] === '0' || number[0] === '1') return false;
    
    // Area code validation
    const areaCode = number.substring(0, 3);
    if (!isValidAreaCode(areaCode)) return false;
    
    // Exchange code validation
    const exchangeCode = number.substring(3, 6);
    if (exchangeCode[0] === '0' || exchangeCode[0] === '1') return false;
    
    return true;
}

// Finish validation
function finishValidation(totalNumbers, validNumbers) {
    // Update UI
    document.getElementById('totalCount').textContent = totalNumbers.toLocaleString();
    document.getElementById('validCount').textContent = validNumbers.toLocaleString();
    
    // Reset button
    const validateBtn = document.getElementById('validateBtn');
    validateBtn.disabled = false;
    validateBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Validation Complete';
    
    // Update step icons
    document.getElementById('step1Icon').classList.remove('active');
    document.getElementById('step1Icon').classList.add('completed');
    document.getElementById('step2Icon').classList.add('active');
    
    // Move to step 2
    showStep(2);
    
    // Show notification
    showNotification(`Validation complete: ${validNumbers.toLocaleString()} valid numbers out of ${totalNumbers.toLocaleString()}`, 'success');
}

// Update validation progress
function updateValidationProgress(percent) {
    const progressBar = document.getElementById('validationProgress');
    const percentText = document.getElementById('validationPercent');
    
    progressBar.style.width = percent + '%';
    progressBar.textContent = Math.round(percent) + '%';
    percentText.textContent = Math.round(percent) + '%';
}

// Update DNC progress
function updateDNCProgress(percent) {
    const progressBar = document.getElementById('dncProgress');
    const percentText = document.getElementById('dncPercent');
    
    progressBar.style.width = percent + '%';
    progressBar.textContent = Math.round(percent) + '%';
    percentText.textContent = Math.round(percent) + '%';
}

// Show specific step
function showStep(stepNumber) {
    currentStep = stepNumber;
    
    // Hide all steps
    document.getElementById('step1').classList.add('d-none');
    document.getElementById('step2').classList.add('d-none');
    document.getElementById('step3').classList.add('d-none');
    
    // Show current step
    document.getElementById('step' + stepNumber).classList.remove('d-none');
    
    // Update step icons
    updateStepIcons();
}

// Update step icons
function updateStepIcons() {
    const step1Icon = document.getElementById('step1Icon');
    const step2Icon = document.getElementById('step2Icon');
    const step3Icon = document.getElementById('step3Icon');
    
    // Reset all
    step1Icon.classList.remove('active', 'completed');
    step2Icon.classList.remove('active', 'completed');
    step3Icon.classList.remove('active', 'completed');
    
    // Set based on current step
    if (currentStep >= 1) {
        step1Icon.classList.add('completed');
    }
    if (currentStep >= 2) {
        step2Icon.classList.add('active');
    }
    if (currentStep >= 3) {
        step2Icon.classList.remove('active');
        step2Icon.classList.add('completed');
        step3Icon.classList.add('active');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification alert alert-${type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'danger' ? 'times-circle' : 'info-circle'} me-2"></i>
            <span>${message}</span>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Get state from area code
function getStateFromAreaCode(areaCode) {
    for (const [state, codes] of Object.entries(USA_STATES_AREA_CODES)) {
        if (codes.includes(areaCode)) {
            return state;
        }
    }
    return "Unknown";
}

// Check if area code is valid
function isValidAreaCode(areaCode) {
    return ALL_AREA_CODES.has(areaCode);
}
