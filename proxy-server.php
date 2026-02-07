<?php
// Phone Validator Proxy Server
// Save this as proxy-server.php on your hosting

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get parameters
$api_type = $_GET['type'] ?? 'dnc';
$phone_number = $_GET['phone'] ?? '';
$api_key = $_GET['api_key'] ?? '';

// Validate phone number
if (empty($phone_number) || !preg_match('/^\d{10}$/', $phone_number)) {
    echo json_encode(['error' => 'Invalid phone number']);
    exit();
}

// API endpoints
$apis = [
    'dnc' => 'https://api.uspeoplesearch.site/tcpa/v1?x=',
    'person' => 'https://api.uspeoplesearch.site/v1/?x='
];

// Select API
$api_url = $apis[$api_type] ?? $apis['dnc'];
$full_url = $api_url . $phone_number;

// Add API key if provided
if (!empty($api_key)) {
    $full_url .= '&api_key=' . urlencode($api_key);
}

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $full_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// Set headers
$headers = [
    'User-Agent: PhoneValidatorProxy/1.0',
    'Accept: application/json',
    'Accept-Language: en-US,en;q=0.9'
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Execute request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

curl_close($ch);

// Handle response
if ($error) {
    echo json_encode([
        'error' => 'CURL Error: ' . $error,
        'url' => $full_url
    ]);
} elseif ($http_code !== 200) {
    echo json_encode([
        'error' => 'API returned HTTP ' . $http_code,
        'url' => $full_url,
        'response' => $response
    ]);
} else {
    // Return API response directly
    echo $response;
}
?>
