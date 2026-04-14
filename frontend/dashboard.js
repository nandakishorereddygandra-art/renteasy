const API_URL = 'http://localhost:5000/api';

// Load user profile and rentals
async function loadProfile() {
    if (!isLoggedIn()) {
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('profileInfo').style.display = 'none';
        return;
    }
    
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('profileInfo').style.display = 'block';
    
    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = user.role;
    
    // Load user's rentals
    await loadUserRentals();
    
    // Load manager dashboard if role is manager
    if (user.role === 'manager') {
        await loadManagerDashboard();
        document.getElementById('managerDashboard').style.display = 'block';
    }
}

async function loadUserRentals() {
    try {
        const response = await fetch(`${API_URL}/rentals/user`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const rentals = await response.json();
            const container = document.getElementById('userRentalsList');
            
            if (rentals.length === 0) {
                container.innerHTML = '<p>You haven\'t listed any items yet.</p>';
                return;
            }
            
            container.innerHTML = rentals.map(rental => `
                <div class="rental-card">
                    <img src="${rental.imageUrl}" alt="${rental.productName}" class="rental-image">
                    <div class="rental-info">
                        <div class="rental-title">${rental.productName}</div>
                        <div class="rental-price">$${rental.price}/day</div>
                        <div class="rental-details">📍 ${rental.location}</div>
                        <div class="rental-details">Status: ${rental.status}</div>
                        <button onclick="deleteRental('${rental._id}')" class="delete-btn">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading user rentals:', error);
    }
}

async function loadManagerDashboard() {
    try {
        // Load all rentals
        const rentalsResponse = await fetch(`${API_URL}/rentals/all`, {
            headers: getAuthHeaders()
        });
        
        if (rentalsResponse.ok) {
            const rentals = await rentalsResponse.json();
            const allRentalsDiv = document.getElementById('allRentalsList');
            
            allRentalsDiv.innerHTML = rentals.map(rental => `
                <div class="rental-card">
                    <img src="${rental.imageUrl}" alt="${rental.productName}" class="rental-image">
                    <div class="rental-info">
                        <div class="rental-title">${rental.productName}</div>
                        <div class="rental-price">$${rental.price}/day</div>
                        <div class="rental-details">👤 Owner: ${rental.ownerName}</div>
                        <div class="rental-details">📍 ${rental.location}</div>
                        <div class="rental-details">Status: ${rental.status}</div>
                        <button onclick="deleteRental('${rental._id}')" class="delete-btn">Delete</button>
                    </div>
                </div>
            `).join('');
        }
        
        // Load all users
        const usersResponse = await fetch(`${API_URL}/users`, {
            headers: getAuthHeaders()
        });
        
        if (usersResponse.ok) {
            const users = await usersResponse.json();
            const usersListDiv = document.getElementById('usersList');
            
            usersListDiv.innerHTML = `
                <div class="users-table">
                    ${users.map(user => `
                        <div class="user-item">
                            <span>${user.name} (${user.email}) - Role: ${user.role}</span>
                            <button onclick="deleteUser('${user._id}')" class="delete-btn">Delete User</button>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading manager dashboard:', error);
    }
}

async function deleteRental(rentalId) {
    if (confirm('Are you sure you want to delete this rental?')) {
        try {
            const response = await fetch(`${API_URL}/rentals/${rentalId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                alert('Rental deleted successfully');
                loadProfile();
            } else {
                alert('Failed to delete rental');
            }
        } catch (error) {
            console.error('Error deleting rental:', error);
            alert('Failed to delete rental');
        }
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user and all their rentals?')) {
        try {
            const response = await fetch(`${API_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                alert('User deleted successfully');
                loadManagerDashboard();
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    }
}

// Initialize profile page
if (window.location.pathname.includes('profile.html')) {
    loadProfile();
}