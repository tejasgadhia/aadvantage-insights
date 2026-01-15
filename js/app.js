// AAdvantage Insights - Main Application Logic

// State management
const state = {
    flightRecords: null,
    accountActivity: null,
    accountProfile: null,
    admiralsClub: null,
    processedData: {
        flights: [],
        stats: {}
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeFileUpload();
    initializeDropZone();
});

// Close privacy banner
function closeBanner() {
    document.getElementById('privacy-banner').style.display = 'none';
}

// File upload initialization
function initializeFileUpload() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', handleFileSelect);
}

// Drag and drop initialization
function initializeDropZone() {
    const uploadSection = document.getElementById('upload-section');
    const dropZone = uploadSection.querySelector('.bg-white');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('border-aa-blue', 'bg-blue-50');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('border-aa-blue', 'bg-blue-50');
        });
    });
    
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
}

// Handle file selection
function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

// Process uploaded files
function handleFiles(files) {
    const fileList = document.getElementById('file-list');
    const fileItems = document.getElementById('file-items');
    
    fileList.classList.remove('hidden');
    fileItems.innerHTML = '';
    
    Array.from(files).forEach(file => {
        const fileItem = createFileItem(file);
        fileItems.appendChild(fileItem);
        
        // Read and parse file
        parseFile(file, fileItem);
    });
}

// Create file item UI
function createFileItem(file) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <span class="flex-1 text-sm">${file.name}</span>
        <span class="text-xs text-gray-500">${formatFileSize(file.size)}</span>
        <div class="status-indicator">
            <div class="spinner"></div>
        </div>
    `;
    return div;
}

// Parse uploaded file
function parseFile(file, fileItemElement) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Identify file type and store
            if (file.name.includes('Flight_Records')) {
                state.flightRecords = data;
            } else if (file.name.includes('Account_Activity')) {
                state.accountActivity = data;
            } else if (file.name.includes('Account_Profile')) {
                state.accountProfile = data;
            } else if (file.name.includes('Admirals_Club')) {
                state.admiralsClub = data;
            }
            
            markFileSuccess(fileItemElement);
            
            // If we have flight records, process and display
            if (state.flightRecords) {
                processData();
                displayDashboard();
            }
            
        } catch (error) {
            console.error('Error parsing file:', error);
            markFileError(fileItemElement, 'Invalid JSON');
        }
    };
    
    reader.onerror = () => {
        markFileError(fileItemElement, 'Read error');
    };
    
    reader.readAsText(file);
}

// Mark file as successfully loaded
function markFileSuccess(element) {
    element.classList.add('success');
    element.querySelector('.status-indicator').innerHTML = `
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
    `;
}

// Mark file as error
function markFileError(element, message) {
    element.classList.add('error');
    element.querySelector('.status-indicator').innerHTML = `
        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
    `;
    const span = element.querySelector('span:last-of-type');
    span.textContent = message;
    span.className = 'text-xs text-red-600';
}

// Process flight data
function processData() {
    if (!state.flightRecords) return;
    
    // Extract all flights from the nested structure
    const flights = [];
    
    state.flightRecords.forEach(record => {
        const itinerary = record['Itinerary Information'];
        const flightInfo = record['Your Flight Information'];
        
        if (itinerary && Array.isArray(itinerary)) {
            itinerary.forEach(segment => {
                flights.push({
                    date: segment['Segment Departure Date'],
                    flight: segment['Marketing Flight'],
                    from: segment['Segment Departure Airport Code'],
                    to: segment['Segment Arrival Airport Code'],
                    cabin: segment['Cabin Code'],
                    status: segment['Segment Current Status Code'],
                    fareClass: segment['Marketing Fare Class Code']
                });
            });
        }
    });
    
    // Sort by date
    flights.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    state.processedData.flights = flights;
    
    // Calculate stats
    const uniqueCountries = new Set();
    const routes = {};
    
    flights.forEach(flight => {
        // Count routes
        const route = `${flight.from}-${flight.to}`;
        routes[route] = (routes[route] || 0) + 1;
        
        // Countries would need airport database - placeholder for now
    });
    
    state.processedData.stats = {
        totalFlights: flights.length,
        routes: routes,
        uniqueCountries: 0 // Placeholder
    };
}

// Display dashboard
function displayDashboard() {
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');
    
    // Update summary cards
    document.getElementById('total-flights').textContent = state.processedData.stats.totalFlights;
    document.getElementById('total-miles').textContent = '-'; // Placeholder
    document.getElementById('total-countries').textContent = '-'; // Placeholder
    
    // Get loyalty status from profile if available
    if (state.accountProfile) {
        const profile = state.accountProfile['AAdvantage Information'];
        if (profile && profile['AAdvantage Account Tier Level Code']) {
            document.getElementById('loyalty-status').textContent = profile['AAdvantage Account Tier Level Code'];
        }
    }
    
    // Populate flights table
    populateFlightsTable();
    
    // Create charts
    createFlightsChart();
    createRoutesChart();
    
    // Initialize map
    initializeMap();
}

// Populate flights table
function populateFlightsTable() {
    const tbody = document.getElementById('flights-table-body');
    tbody.innerHTML = '';
    
    state.processedData.flights.forEach(flight => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-4 py-2">${formatDate(flight.date)}</td>
            <td class="px-4 py-2">${flight.flight}</td>
            <td class="px-4 py-2">${flight.from}</td>
            <td class="px-4 py-2">${flight.to}</td>
            <td class="px-4 py-2">${getCabinName(flight.cabin)}</td>
            <td class="px-4 py-2">${flight.status}</td>
        `;
    });
}

// Create flights over time chart
function createFlightsChart() {
    const ctx = document.getElementById('flights-chart').getContext('2d');
    
    // Group flights by month
    const monthlyFlights = {};
    state.processedData.flights.forEach(flight => {
        const month = flight.date.substring(0, 7); // YYYY-MM
        monthlyFlights[month] = (monthlyFlights[month] || 0) + 1;
    });
    
    const labels = Object.keys(monthlyFlights).sort();
    const data = labels.map(month => monthlyFlights[month]);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Flights per Month',
                data: data,
                borderColor: '#0078D2',
                backgroundColor: 'rgba(0, 120, 210, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Create top routes chart
function createRoutesChart() {
    const ctx = document.getElementById('routes-chart').getContext('2d');
    
    // Get top 10 routes
    const routeEntries = Object.entries(state.processedData.stats.routes);
    routeEntries.sort((a, b) => b[1] - a[1]);
    const topRoutes = routeEntries.slice(0, 10);
    
    const labels = topRoutes.map(r => r[0]);
    const data = topRoutes.map(r => r[1]);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Flight Count',
                data: data,
                backgroundColor: '#0078D2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Initialize map
function initializeMap() {
    const map = L.map('map').setView([37.0902, -95.7129], 4); // USA center
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Placeholder - would need airport coordinates to plot routes
    // For now, just show a basic map
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function getCabinName(code) {
    const cabins = {
        'Y': 'Economy',
        'C': 'Business',
        'F': 'First',
        'W': 'Premium Economy'
    };
    return cabins[code] || code;
}
