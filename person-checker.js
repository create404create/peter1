// Person Data Processor
function processPersonData(personData) {
    if (!personData || !personData.person || personData.person.length === 0) {
        return {
            hasData: false,
            name: 'Not Found',
            status: 'Unknown',
            dob: '',
            age: '',
            address: 'Not Found',
            city: '',
            state: '',
            zip: '',
            relatives: [],
            isDeliverable: 'Unknown'
        };
    }
    
    const person = personData.person[0];
    const primaryAddress = person.addresses && person.addresses.length > 0 ? person.addresses[0] : null;
    
    // Get all unique relatives
    const relatives = person.relatives && Array.isArray(person.relatives) 
        ? [...new Set(person.relatives.filter(r => r !== "Not Found"))]
        : [];
    
    return {
        hasData: true,
        name: person.name || 'Not Found',
        status: person.status || 'Unknown',
        dob: person.dob || '',
        age: person.age || '',
        address: primaryAddress ? primaryAddress.home || 'Not Found' : 'Not Found',
        city: primaryAddress ? primaryAddress.city || '' : '',
        state: primaryAddress ? primaryAddress.state || '' : '',
        zip: primaryAddress ? primaryAddress.zip || '' : '',
        relatives: relatives,
        isDeliverable: primaryAddress ? primaryAddress.isDeliverable || 'Unknown' : 'Unknown',
        rawData: personData
    };
}

// Download Clean Numbers
function downloadCleanNumbers() {
    const cleanNumbers = validationResults.filter(r => r.dncStatus === 'clean' && r.isValid);
    
    if (cleanNumbers.length === 0) {
        showNotification('No clean numbers to download', 'warning');
        return;
    }
    
    const content = generateCSVContent(cleanNumbers, 'clean');
    downloadFile('clean-numbers.csv', content);
    
    showNotification(`Downloaded ${cleanNumbers.length} clean numbers`, 'success');
}

// Download DNC Numbers
function downloadDNCNumbers() {
    const dncNumbers = validationResults.filter(r => r.dncStatus === 'dnc' && r.isValid);
    
    if (dncNumbers.length === 0) {
        showNotification('No DNC numbers to download', 'warning');
        return;
    }
    
    const content = generateCSVContent(dncNumbers, 'dnc');
    downloadFile('dnc-numbers.csv', content);
    
    showNotification(`Downloaded ${dncNumbers.length} DNC numbers`, 'success');
}

// Download All Data
function downloadAllData() {
    const allData = validationResults.filter(r => r.isValid);
    
    if (allData.length === 0) {
        showNotification('No valid data to download', 'warning');
        return;
    }
    
    const content = generateCSVContent(allData, 'all');
    downloadFile('all-phone-data.csv', content);
    
    showNotification(`Downloaded ${allData.length} records with complete data`, 'success');
}

// Download Complete Report
function downloadCompleteReport() {
    const allValid = validationResults.filter(r => r.isValid);
    
    if (allValid.length === 0) {
        showNotification('No valid data for report', 'warning');
        return;
    }
    
    let report = "COMPLETE PHONE NUMBER PROCESSING REPORT\n";
    report += "===========================================\n";
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Total Numbers Processed: ${validationResults.length}\n`;
    report += `Valid Numbers: ${allValid.length}\n`;
    report += `Invalid Numbers: ${validationResults.length - allValid.length}\n\n`;
    
    // Summary by DNC Status
    const dncNumbers = allValid.filter(r => r.dncStatus === 'dnc');
    const cleanNumbers = allValid.filter(r => r.dncStatus === 'clean');
    
    report += "SUMMARY BY DNC STATUS:\n";
    report += `DNC Numbers: ${dncNumbers.length}\n`;
    report += `Clean Numbers: ${cleanNumbers.length}\n\n`;
    
    report += "DETAILED RECORDS:\n";
    report += "==================================================================================================================================\n\n";
    
    allValid.forEach((result, index) => {
        const dncData = result.dncData || {};
        const personInfo = processPersonData(result.personData);
        
        report += `RECORD ${index + 1}:\n`;
        report += `Phone: ${result.cleaned}\n`;
        report += `Formatted: (${result.cleaned.substring(0, 3)}) ${result.cleaned.substring(3, 6)}-${result.cleaned.substring(6)}\n`;
        report += `Area Code: ${result.areaCode}\n`;
        report += `State (Area Code): ${result.state}\n`;
        report += `DNC Status: ${result.dncStatus.toUpperCase()}\n`;
        
        if (result.dncStatus === 'dnc') {
            report += `DNC Details: ${dncData.details || 'Not specified'}\n`;
            report += `Listed: ${dncData.listed || 'No'}\n`;
            report += `Type: ${dncData.type || 'No'}\n`;
            report += `State (DNC): ${dncData.state || 'Unknown'}\n`;
            report += `National DNC: ${dncData.ndnc || 'No'}\n`;
            report += `State DNC: ${dncData.sdnc || 'No'}\n`;
        }
        
        report += `Carrier: ${dncData.carrier || 'Unknown'}\n`;
        report += `Line Type: ${dncData.lineType || 'unknown'}\n\n`;
        
        // Person Information
        report += "PERSON INFORMATION:\n";
        if (personInfo.hasData) {
            report += `Name: ${personInfo.name}\n`;
            report += `Status: ${personInfo.status}\n`;
            if (personInfo.dob) report += `Date of Birth: ${personInfo.dob}\n`;
            if (personInfo.age) report += `Age: ${personInfo.age}\n`;
            report += `Address: ${personInfo.address}\n`;
            report += `City: ${personInfo.city}\n`;
            report += `State: ${personInfo.state}\n`;
            report += `ZIP Code: ${personInfo.zip}\n`;
            report += `Deliverable: ${personInfo.isDeliverable}\n`;
            
            if (personInfo.relatives.length > 0) {
                report += `Relatives: ${personInfo.relatives.join(', ')}\n`;
            }
        } else {
            report += `No person data found for this number.\n`;
        }
        
        report += "\n" + "=".repeat(80) + "\n\n";
    });
    
    // Statistics
    report += "\nSTATISTICS:\n";
    report += `Total Processing Time: ${checkStartTime ? Math.round((Date.now() - checkStartTime) / 1000) : 'Unknown'} seconds\n`;
    report += `Average Time per Number: ${checkStartTime && allValid.length > 0 
        ? Math.round((Date.now() - checkStartTime) / allValid.length) 
        : 'Unknown'} ms\n`;
    report += `Success Rate: ${allValid.length}/${validationResults.length} (${Math.round((allValid.length / validationResults.length) * 100)}%)\n`;
    
    downloadFile('complete-phone-report.txt', report);
    showNotification('Detailed report downloaded successfully', 'success');
}

// Generate CSV content
function generateCSVContent(results, type) {
    // CSV headers with all possible fields
    const headers = [
        'Phone', 'Formatted', 'Area Code', 'State (Area Code)', 
        'DNC Status', 'Listed', 'Type', 'State (DNC)', 'NDNC', 'SDNC',
        'Carrier', 'Line Type', 'DNC Details',
        'Name', 'Status', 'DOB', 'Age', 
        'Address', 'City', 'State', 'Zip Code', 'Deliverable',
        'Relatives', 'Original Number', 'Validation Status'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    results.forEach(result => {
        const dncData = result.dncData || {};
        const personInfo = processPersonData(result.personData);
        
        // Format phone number
        const formattedPhone = result.cleaned.length === 10 
            ? `(${result.cleaned.substring(0, 3)}) ${result.cleaned.substring(3, 6)}-${result.cleaned.substring(6)}`
            : result.cleaned;
        
        // Prepare relatives as semicolon-separated string
        const relativesStr = personInfo.relatives.join('; ');
        
        // Build CSV row
        const row = [
            `"${result.cleaned}"`,
            `"${formattedPhone}"`,
            `"${result.areaCode}"`,
            `"${result.state}"`,
            `"${result.dncStatus.toUpperCase()}"`,
            `"${dncData.listed || ''}"`,
            `"${dncData.type || ''}"`,
            `"${dncData.state || ''}"`,
            `"${dncData.ndnc || ''}"`,
            `"${dncData.sdnc || ''}"`,
            `"${dncData.carrier || ''}"`,
            `"${dncData.lineType || ''}"`,
            `"${dncData.details || ''}"`,
            `"${personInfo.name || ''}"`,
            `"${personInfo.status || ''}"`,
            `"${personInfo.dob || ''}"`,
            `"${personInfo.age || ''}"`,
            `"${personInfo.address || ''}"`,
            `"${personInfo.city || ''}"`,
            `"${personInfo.state || ''}"`,
            `"${personInfo.zip || ''}"`,
            `"${personInfo.isDeliverable || ''}"`,
            `"${relativesStr}"`,
            `"${result.original || ''}"`,
            `"${result.isValid ? 'Valid' : 'Invalid'}"`
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
}

// Download file helper
function downloadFile(filename, content) {
    try {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Error downloading file: ' + error.message, 'danger');
    }
}

// Export functions for use in other files
if (typeof window !== 'undefined') {
    window.processPersonData = processPersonData;
    window.downloadCleanNumbers = downloadCleanNumbers;
    window.downloadDNCNumbers = downloadDNCNumbers;
    window.downloadAllData = downloadAllData;
    window.downloadCompleteReport = downloadCompleteReport;
    window.generateCSVContent = generateCSVContent;
}
