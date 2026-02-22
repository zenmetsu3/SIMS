const API_URL = 'http://localhost:3000/api/students';
const USER_API_URL = 'http://localhost:3000/api/current-user';

// Default Avatar SVG (Student/Graduate Icon)
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2345A29E'%3E%3Cpath d='M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z'/%3E%3C/svg%3E";

// Global Image Error Handler
window.handleImageError = function(img) {
    img.onerror = null; // Prevent infinite loop
    img.src = DEFAULT_AVATAR;
};

// State
let students = [];
let currentProfileId = null;

// DOM Elements
const studentTableBody = document.getElementById('studentTableBody');
const modal = document.getElementById('studentModal');
const form = document.getElementById('studentForm');
const modalTitle = document.getElementById('modalTitle');
const totalStudentsEl = document.getElementById('total-students');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchStudents();
    fetchUser();
});

// Fetch User
async function fetchUser() {
    try {
        const res = await fetch(USER_API_URL);
        const user = await res.json();
        const profileEl = document.getElementById('user-profile');
        const usernameEl = document.getElementById('username-display');
        
        if (user && user.username) {
            // Capitalize first letter
            const name = user.username.charAt(0).toUpperCase() + user.username.slice(1);
            usernameEl.innerText = name;
            profileEl.style.display = 'flex';
        } else {
            profileEl.style.display = 'none';
        }
    } catch (err) {
        console.error('Error fetching user:', err);
    }
}

// Fetch Data
async function fetchStudents() {
    try {
        const res = await fetch(API_URL);
        students = await res.json();
        renderTable(students);
        updateStats();
    } catch (err) {
        console.error('Error fetching students:', err);
    }
}

// Render Table
function renderTable(data) {
    studentTableBody.innerHTML = '';
    data.forEach(student => {
        const tr = document.createElement('tr');
        // Handle split name display
        const fullName = student.name || `${student.firstName} ${student.lastName}`;
        const photoUrl = student.photo ? student.photo : DEFAULT_AVATAR;

        tr.innerHTML = `
            <td>${student.studentId}</td>
            <td style="cursor:pointer; color:var(--primary-color);" onclick="viewProfile('${student.studentId}')">${fullName}</td>
            <td>${student.course}</td>
            <td>${student.yearLevel}</td>
            <td>
                <button class="action-btn edit-btn" onclick="openEditModal('${student.studentId}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteStudent('${student.studentId}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        studentTableBody.appendChild(tr);
    });
}

// Update Stats
function updateStats() {
    totalStudentsEl.innerText = students.length;
}

// Search
function searchStudents() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = students.filter(s => 
        s.studentId.toLowerCase().includes(query) || 
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.firstName && s.firstName.toLowerCase().includes(query)) ||
        (s.lastName && s.lastName.toLowerCase().includes(query))
    );
    renderTable(filtered);
}

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
    
    // Update Sidebar
    document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
    
    // Find nav item (manual mapping or simple check)
    if (sectionId === 'dashboard') {
        document.querySelector('.sidebar li:nth-child(1)').classList.add('active');
        document.getElementById('page-title').innerText = 'Overview';
    } else if (sectionId === 'students') {
        document.querySelector('.sidebar li:nth-child(2)').classList.add('active');
        document.getElementById('page-title').innerText = 'Student Records';
    } else if (sectionId === 'profile-view') {
        document.querySelector('.sidebar li:nth-child(2)').classList.add('active'); // Keep Students active
        document.getElementById('page-title').innerText = 'Student Profile';
    }
}

// Profile View Logic
function viewProfile(id) {
    const student = students.find(s => s.studentId === id);
    if (!student) return;

    currentProfileId = id;
    showSection('profile-view');

    // Populate Data
    const photoUrl = student.photo ? student.photo : DEFAULT_AVATAR;
    document.getElementById('view-photo').src = photoUrl;
    document.getElementById('view-fullname').innerText = student.name || `${student.firstName} ${student.lastName}`;
    document.getElementById('view-id').innerText = `#${student.studentId}`;
    document.getElementById('view-course').innerText = student.course;
    document.getElementById('view-year').innerText = student.yearLevel;

    // Details
    const fields = [
        'firstname', 'middlename', 'lastname', 'dob', 'age', 
        'admission', 'mobile', 'email', 
        'current-address', 'permanent-address', 
        'father', 'mother'
    ];
    
    // Map keys from backend to IDs
    const map = {
        'firstname': 'firstName', 'middlename': 'middleName', 'lastname': 'lastName',
        'dob': 'dob', 'age': 'age', 'admission': 'admissionDate',
        'mobile': 'mobileNumber', 'email': 'email',
        'current-address': 'currentAddress', 'permanent-address': 'permanentAddress',
        'father': 'fatherName', 'mother': 'motherName'
    };

    fields.forEach(field => {
        const key = map[field];
        document.getElementById(`view-${field}`).innerText = student[key] || '-';
    });
}

function editCurrentProfile() {
    if (currentProfileId) {
        openEditModal(currentProfileId);
    }
}

// Modal Functions
function openModal(mode) {
    modal.style.display = 'flex';
    form.reset();
    if (mode === 'add') {
        modalTitle.innerText = 'Add Student';
        document.getElementById('editMode').value = 'false';
        document.getElementById('studentId').readOnly = false;
    }
}

function openEditModal(id) {
    const student = students.find(s => s.studentId === id);
    if (!student) return;

    modalTitle.innerText = 'Edit Student';
    document.getElementById('editMode').value = 'true';
    document.getElementById('studentId').value = student.studentId;
    document.getElementById('studentId').readOnly = true;

    // Populate all fields
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.name && student[input.name] !== undefined) {
            if (input.type !== 'file') {
                input.value = student[input.name];
                // Fix for case-sensitive select options (e.g. course "bsit" vs "BSIT")
                if (input.tagName === 'SELECT' && input.value !== student[input.name]) {
                    input.value = String(student[input.name]).toUpperCase();
                }
            }
        }
    });

    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

// Form Submit (FormData for File Upload)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const isEdit = document.getElementById('editMode').value === 'true';
    const formData = new FormData(form);
    
    // Handle specific logic if needed (e.g. converting empty strings to null? Backend handles some)

    try {
        let res;
        if (isEdit) {
            const id = document.getElementById('studentId').value;
            res = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                body: formData // Fetch automatically sets Content-Type to multipart/form-data
            });
        } else {
            res = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
        }

        if (!res.ok) {
            const err = await res.json();
            alert(err.error || 'An error occurred');
            return;
        }

        closeModal();
        fetchStudents();
        
        // If we are currently viewing this profile, refresh it
        if (isEdit && currentProfileId === document.getElementById('studentId').value) {
            // Re-fetch to get updated data (like photo URL)
            const updatedRes = await fetch(API_URL);
            students = await updatedRes.json();
            viewProfile(currentProfileId);
        }

    } catch (err) {
        console.error('Error saving student:', err);
        alert('An error occurred');
    }
});

// Delete
async function deleteStudent(id) {
    if (confirm('Are you sure you want to delete this student?')) {
        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
            fetchStudents();
            if (currentProfileId === id) {
                showSection('students');
                currentProfileId = null;
            }
        } catch (err) {
            console.error('Error deleting student:', err);
        }
    }
}

// Close modal on outside click
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

// README Fetch Logic Removed
