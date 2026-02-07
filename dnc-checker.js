// DNC Checker with API Integration
let isCheckingDNC = false;
let currentCheckIndex = 0;
let cleanCount = 0;
let dncCount = 0;
let checkStartTime = null;

// APIs Configuration
const DNC_APIS = {
    TCPA_V1: 'https://api.uspeoplesearch.site/tcpa/v1?x=',
    PERSON_V1: 'https://api.uspeoplesearch.site/v1/?x='
};

// Start DNC Check
function startDNCCheck() {
    if (validationResults.length === 0) {
        showNotification('Please complete basic validation first', 'warning');
        return;
    }
    
    if (isCheckingDNC) {
        showNotification('DNC check is already in progress', 'warning');
        return;
    }
    
    // Reset counters
    isCheckingDNC = true;
    currentCheckIndex = 0;
    cleanCount = 0;
    dncCount = 0;
    checkStartTime = Date.now();
    
    // Update UI
    document.getElementById('dncCheckBtn').classList.add('d-none');
    document.getElementById('cancelCheckBtn').classList.remove('d-none');
    
    // Show step 3 with progress
    showStep(3);
    document.getElementById('liveCheckDisplay').classList.remove('d-none');
    document.getElementById('resultsSummary').classList.remove('d-none');
    
    // Start checking
    checkNextNumber();
}

// Check next number in queue
async function checkNextNumber() {
    if (!isCheckingDNC || currentCheckIndex >= validationResults.length) {
        finishDNCCheck();
        return;
    }
    
    const result = validationResults[currentCheckIndex];
    
    // Skip invalid numbers
    if (!result.isValid) {
        result.dncStatus = 'invalid';
        result.dncData = { error: 'Invalid number' };
        moveToNextNumber();
        return;
    }
    
    // Update UI for current number
    updateCurrentNumberDisplay(result.cleaned);
    
    // Check DNC status
    result.dncStatus = 'checking';
    
    try {
        // First check DNC status
        document.getElementById('currentStatus').textContent = 'Checking DNC status...';
        const dncResult = await checkDNCStatus(result.cleaned);
        result.dncData = dncResult;
        
        // Then check person data
        document.getElementById('currentStatus').textContent = 'Getting person data...';
        const personData = await checkPersonData(result.cleaned);
        result.personData = personData;
        
        // Update result status
        if (dncResult.isDNC) {
            result.dncStatus = 'dnc';
            dncCount++;
            
            // Update details display
            document.getElementById('currentDetails').innerHTML = `
                <span class="badge bg-danger">DNC</span> 
                <span class="ms-2">${dncResult.details}</span>
            `;
        } else {
            result.dncStatus = 'clean';
            cleanCount++;
            
            // Update details display
            const personInfo = processPersonData(personData);
            if (personInfo.hasData) {
                document.getElementById('currentDetails').innerHTML = `
                    <span class="badge bg-success">CLEAN</span> 
                    <span class="ms-2">${personInfo.name}</span>
                `;
            } else {
                document.getElementById('currentDetails').innerHTML = `
                    <span class="badge bg-success">CLEAN</span> 
                    <span class="ms-2">No person data found</span>
                `;
            }
        }
        
    } catch (error) {
        console.error('Check error:', error);
        result.dncStatus = 'error';
        result.dncData = { error: error.message };
        
        document.getElementById('currentDetails').innerHTML = `
            <span class="badge bg-warning">ERROR</span> 
            <span class="ms-2">${error.message}</span>
        `;
    }
    
    // Update counters
    updateCounters();
    
    // Move to next number
    moveToNextNumber();
}

// Move to next number
function moveToNextNumber() {
    currentCheckIndex++;
    
    // Update progress
    const progress = (currentCheckIndex / validationResults.length) * 100;
    updateDNCProgress(progress);
    
    // Calculate estimated time remaining
    if (checkStartTime) {
        const elapsed = Date.now() - checkStartTime;
        const numbersPerSecond = currentCheckIndex / (elapsed / 1000);
        const remaining = validationResults.length - currentCheckIndex;
        const secondsRemaining = Math.round(remaining / numbersPerSecond);
        
        if (secondsRemaining > 0) {
            const minutes = Math.floor(secondsRemaining / 60);
            const seconds = secondsRemaining % 60;
            document.getElementById('currentStatus').textContent = 
                `Estimated time remaining: ${minutes}m ${seconds}s`;
        }
    }
    
    // Check next number with delay
    if (isCheckingDNC && currentCheckIndex < validationResults.length) {
        setTimeout(checkNextNumber, 500); // 500ms delay between checks
    } else {
        finishDNCCheck();
    }
}

// Check DNC status
async function checkDNCStatus(phoneNumber) {
    try {
        const apiUrl = `${DNC_APIS.TCPA_V1}${phoneNumber}`;
        console.log('DNC API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('DNC Response:', data);
        
        // Parse response
        let isDNC = false;
        let details = [];
        
        if (data.listed === "Yes" || data.type !== "No") {
            isDNC = true;
            if (data.listed === "Yes") details.push('Listed');
            if (data.type !== "No") details.push(`Type: ${data.type}`);
        }
        
        // Add carrier info if available
        if (data.carrier) {
            details.push(`Carrier: ${data.carrier}`);
        }
        
        return {
            isDNC: isDNC,
            details: details.length > 0 ? details.join(', ') : 'Clean',
            data: data,
            state: data.state || 'Unknown',
            ndnc: data.ndnc || 'No',
            sdnc: data.sdnc || 'No',
            listed: data.listed || 'No',
            type: data.type || 'No',
            carrier: data.carrier || 'Unknown',
            lineType: data.line_type || 'unknown'
        };
        
    } catch (error) {
        console.error('DNC check error:', error);
        return {
            isDNC: false,
            details: 'Error: ' + error.message,
            error: error.message
        };
    }
}

// Check person data
async function checkPersonData(phoneNumber) {
    try {
        const apiUrl = `${DNC_APIS.PERSON_V1}${phoneNumber}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Person check error:', error);
        return null;
    }
}

// Update current number display
function updateCurrentNumberDisplay(number) {
    const formattedNumber = formatPhoneNumber(number);
    document.getElementById('currentNumber').textContent = formattedNumber;
    document.getElementById('currentStatus').textContent = 'Processing...';
    document.getElementById('currentStatus').className = 'checking-status status-checking';
    document.getElementById('currentDetails').innerHTML = '';
}

// Format phone number for display
function formatPhoneNumber(number) {
    if (number.length === 10) {
        return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    }
    return number;
}

// Update counters
function updateCounters() {
    document.getElementById('dncCount').textContent = dncCount.toLocaleString();
    document.getElementById('cleanCount').textContent = cleanCount.toLocaleString();
    
    document.getElementById('cleanFileInfo').textContent = `${cleanCount.toLocaleString()} clean numbers`;
    document.getElementById('dncFileInfo').textContent = `${dncCount.toLocaleString()} DNC numbers`;
}

// Finish DNC check
function finishDNCCheck() {
    isCheckingDNC = false;
    
    // Update UI
    document.getElementById('dncCheckBtn').classList.remove('d-none');
    document.getElementById('cancelCheckBtn').classList.add('d-none');
    
    document.getElementById('currentNumber').textContent = '✓ Processing Complete!';
    document.getElementById('currentStatus').textContent = 
        `Found ${dncCount.toLocaleString()} DNC and ${cleanCount.toLocaleString()} clean numbers`;
    document.getElementById('currentStatus').className = 'checking-status status-valid';
    
    // Calculate total time
    if (checkStartTime) {
        const totalTime = Date.now() - checkStartTime;
        const minutes = Math.floor(totalTime / 60000);
        const seconds = Math.floor((totalTime % 60000) / 1000);
        document.getElementById('currentDetails').textContent = 
            `Total processing time: ${minutes}m ${seconds}s`;
    }
    
    // Show download section
    document.getElementById('downloadSection').classList.remove('d-none');
    document.getElementById('dataPreview').classList.remove('d-none');
    
    // Update download buttons
    updateDownloadButtons();
    
    // Generate preview
    generateDataPreview();
    
    // Update step icons
    document.getElementById('step2Icon').classList.remove('active');
    document.getElementById('step2Icon').classList.add('completed');
    document.getElementById('step3Icon').classList.add('active');
    
    // Show success notification
    showNotification('DNC and Person check completed successfully!', 'success');
}

// Cancel DNC check
function cancelDNCCheck() {
    isCheckingDNC = false;
    
    // Update UI
    document.getElementById('dncCheckBtn').classList.remove('d-none');
    document.getElementById('cancelCheckBtn').classList.add('d-none');
    
    showNotification('DNC check cancelled', 'warning');
}

// Update download buttons
function updateDownloadButtons() {
    const cleanBtn = document.querySelector('button[onclick="downloadCleanNumbers()"]');
    const dncBtn = document.querySelector('button[onclick="downloadDNCNumbers()"]');
    const allBtn = document.querySelector('button[onclick="downloadAllData()"]');
    const reportBtn = document.querySelector('button[onclick="downloadCompleteReport()"]');
    
    if (cleanCount > 0) {
        cleanBtn.disabled = false;
        cleanBtn.innerHTML = '<i class="fas fa-download me-2"></i>Download Clean Numbers';
        cleanBtn.className = cleanBtn.className.replace('disabled', '').trim();
    }
    
    if (dncCount > 0) {
        dncBtn.disabled = false;
        dncBtn.innerHTML = '<i class="fas fa-download me-2"></i>Download DNC Numbers';
        dncBtn.className = dncBtn.className.replace('disabled', '').trim();
    }
    
    allBtn.disabled = false;
    allBtn.className = allBtn.className.replace('disabled', '').trim();
    
    reportBtn.disabled = false;
    reportBtn.className = reportBtn.className.replace('disabled', '').trim();
}

// Generate data preview
function generateDataPreview() {
    const previewTable = document.getElementById('previewTable');
    previewTable.innerHTML = '';
    
    // Get first 5 valid results
    const previewData = validationResults
        .filter(r => r.isValid)
        .slice(0, 5);
    
    if (previewData.length === 0) {
        previewTable.innerHTML = '<div class="text-center p-3 text-muted">No valid data to preview</div>';
        return;
    }
    
    previewData.forEach((result, index) => {
        const personInfo = processPersonData(result.personData);
        const dncData = result.dncData || {};
        
        const previewRow = document.createElement('div');
        previewRow.className = 'preview-row fade-in';
        previewRow.style.animationDelay = `${index * 0.1}s`;
        
        previewRow.innerHTML = `
            <div class="preview-label">Phone</div>
            <div class="preview-value">${formatPhoneNumber(result.cleaned)}</div>
            
            <div class="preview-label">DNC Status</div>
            <div class="preview-value">
                <span class="badge ${result.dncStatus === 'dnc' ? 'bg-danger' : 'bg-success'}">
                    ${result.dncStatus.toUpperCase()}
                </span>
            </div>
            
            <div class="preview-label">Name</div>
            <div class="preview-value">${personInfo.name || 'Not Found'}</div>
            
            <div class="preview-label">Address</div>
            <div class="preview-value">${personInfo.address || 'Not Found'}</div>
            
            <div class="preview-label">State/City</div>
            <div class="preview-value">${personInfo.city || ''} ${personInfo.state || ''} ${personInfo.zip || ''}</div>
        `;
        
        previewTable.appendChild(previewRow);
    });
}
