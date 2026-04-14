const API_URL = 'http://localhost:5000/api';

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Load rentals on browse page
async function loadRentals() {
    const rentalsList = document.getElementById('rentalsList');
    if (!rentalsList) return;

    try {
        const response = await fetch(`${API_URL}/rentals`);
        const rentals = await response.json();
        
        if (rentalsList) {
            rentalsList.innerHTML = rentals.map(rental => `
                <div class="rental-card">
                    <img src="${rental.imageUrl}" alt="${rental.productName}" class="rental-image">
                    <div class="rental-info">
                        <div class="rental-title">${rental.productName}</div>
                        <div class="rental-price">$${rental.price}/day</div>
                        <div class="rental-details">📍 ${rental.location}</div>
                        <div class="rental-details">📅 Min: ${rental.days} days</div>
                        <div class="rental-details">🔧 Condition: ${rental.condition}</div>
                        <div class="rental-details">👤 Owner: ${rental.ownerName}</div>
                        ${rental.description ? `<div class="rental-details">📝 ${rental.description}</div>` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading rentals:', error);
    }
}

// Handle rental form submission
const rentalForm = document.getElementById('rentalForm');
if (rentalForm) {
    if (!isLoggedIn()) {
        document.getElementById('authWarning').style.display = 'block';
        rentalForm.style.display = 'none';
    } else {
        rentalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const rentalData = {
                productName: document.getElementById('productName').value,
                price: parseFloat(document.getElementById('price').value),
                days: parseInt(document.getElementById('days').value),
                condition: document.getElementById('condition').value,
                location: document.getElementById('location').value,
                category: document.getElementById('category').value,
                description: document.getElementById('description').value,
                imageUrl: document.getElementById('imageUrl').value
            };
            
            try {
                const response = await fetch(`${API_URL}/rentals`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(rentalData)
                });
                
                if (response.ok) {
                    alert('Rental listed successfully!');
                    rentalForm.reset();
                    window.location.href = 'browse.html';
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                console.error('Error listing rental:', error);
                alert('Failed to list rental');
            }
        });
    }
}

// Auth functions
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.querySelectorAll('.toggle-btn')[0].classList.add('active');
    document.querySelectorAll('.toggle-btn')[1].classList.remove('active');
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.querySelectorAll('.toggle-btn')[1].classList.add('active');
    document.querySelectorAll('.toggle-btn')[0].classList.remove('active');
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('Login successful!');
            window.location.reload();
        } else {
            const error = await response.json();
            alert('Login failed: ' + error.error);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed');
    }
}

async function signup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('Signup successful!');
            window.location.reload();
        } else {
            const error = await response.json();
            alert('Signup failed: ' + error.error);
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

// Search and filter functionality
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

if (searchInput && categoryFilter) {
    function filterRentals() {
        const cards = document.querySelectorAll('.rental-card');
        const searchTerm = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        
        cards.forEach(card => {
            const title = card.querySelector('.rental-title')?.textContent.toLowerCase() || '';
            const matchesSearch = title.includes(searchTerm);
            const matchesCategory = !category || card.dataset.category === category;
            
            card.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
        });
    }
    
    searchInput.addEventListener('input', filterRentals);
    categoryFilter.addEventListener('change', filterRentals);
}

// Initialize page
if (window.location.pathname.includes('browse.html')) {
    loadRentals();
}