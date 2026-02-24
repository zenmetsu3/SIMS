const API_URL = 'http://localhost:3000/api/students';
const USER_API_URL = 'http://localhost:3000/api/current-user';
const LOGIN_API_URL = 'http://localhost:3000/api/login';

// --- Login Logic ---
async function handleLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    
    const email = emailInput.value;
    const password = passwordInput.value;
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;

    // Reset Errors
    emailError.innerText = '';
    passwordError.innerText = '';
    emailInput.classList.remove('error');
    passwordInput.classList.remove('error');

    // Loading State
    btn.innerText = 'Signing In...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const response = await fetch(LOGIN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Login Success
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role); // Store Role
            
            const loginScreen = document.getElementById('login-screen');
            loginScreen.style.opacity = '0';
            loginScreen.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                loginScreen.style.display = 'none';
                
                if (data.role === 'student') {
                    document.getElementById('student-dashboard').style.display = 'flex';
                    loadStudentDashboard();
                } else {
                    document.getElementById('app-dashboard').style.display = 'flex';
                    fetchUser();
                    fetchStudents();
                }
            }, 500);
        } else {
            // Login Failed - Handle Specific Errors
            const errorMessage = data.error || 'Login failed';
            
            if (errorMessage === 'wrong email') {
                emailError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Wrong email';
                emailInput.classList.add('error');
                emailInput.focus();
            } else if (errorMessage === 'wrong password') {
                passwordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Wrong password';
                passwordInput.classList.add('error');
                passwordInput.focus();
            } else {
                // Fallback for other errors
                alert(errorMessage);
            }
        }
    } catch (err) {
        alert(err.message || 'An error occurred during login.');
    } finally {
        // Reset Button State
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

// Toggle Password Visibility
document.getElementById('show-password').addEventListener('change', function() {
    const passwordInput = document.getElementById('login-password');
    if (this.checked) {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
});

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
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token) {
        document.getElementById('login-screen').style.display = 'none';
        
        if (role === 'student') {
            document.getElementById('student-dashboard').style.display = 'flex';
            loadStudentDashboard();
        } else {
            document.getElementById('app-dashboard').style.display = 'flex';
            fetchUser();
            fetchStudents();
        }
    }
});

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    
    document.getElementById('app-dashboard').style.display = 'none';
    document.getElementById('student-dashboard').style.display = 'none';
    
    const loginScreen = document.getElementById('login-screen');
    loginScreen.style.display = 'flex';
    setTimeout(() => {
        loginScreen.style.opacity = '1';
    }, 10);
    
    // Reset form
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    // Clear errors
    document.getElementById('email-error').innerText = '';
    document.getElementById('password-error').innerText = '';
    document.getElementById('login-email').classList.remove('error');
    document.getElementById('login-password').classList.remove('error');
}
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Fetch User
async function fetchUser() {
    try {
        const res = await fetch(USER_API_URL, {
            headers: getAuthHeaders()
        });
        
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) return false;
            throw new Error('Failed to fetch user');
        }

        const user = await res.json();
        const profileEl = document.getElementById('user-profile');
        const usernameEl = document.getElementById('username-display');
        
        if (user && user.username) {
            // Capitalize first letter
            const name = user.username.charAt(0).toUpperCase() + user.username.slice(1);
            usernameEl.innerText = name;
            profileEl.style.display = 'flex';
            return true;
        } else {
            profileEl.style.display = 'none';
            return false;
        }
    } catch (err) {
        console.error('Error fetching user:', err);
        return false;
    }
}

// Fetch Data
async function fetchStudents() {
    try {
        const res = await fetch(API_URL, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch data');
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
                headers: getAuthHeaders(),
                body: formData // Fetch automatically sets Content-Type to multipart/form-data
            });
        } else {
            res = await fetch(API_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
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
            const updatedRes = await fetch(API_URL, {
                headers: getAuthHeaders()
            });
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
                method: 'DELETE',
                headers: getAuthHeaders()
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

// Toggle Admin Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('active');
    handleOverlay(sidebar.classList.contains('active'), overlay);
}

// Toggle Student Sidebar
function toggleStudentSidebar() {
    const sidebar = document.getElementById('student-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('active');
    handleOverlay(sidebar.classList.contains('active'), overlay);
}

// Close all sidebars
function closeSidebars() {
    const adminSidebar = document.getElementById('admin-sidebar');
    const studentSidebar = document.getElementById('student-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    adminSidebar.classList.remove('active');
    studentSidebar.classList.remove('active');
    handleOverlay(false, overlay);
}

function handleOverlay(isActive, overlay) {
    if (overlay) {
        if (isActive) {
            overlay.style.display = 'block';
            setTimeout(() => overlay.style.opacity = '1', 10);
        } else {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.style.display = 'none', 300);
        }
    }
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const adminSidebar = document.getElementById('admin-sidebar');
    const studentSidebar = document.getElementById('student-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const studentToggleBtn = document.getElementById('student-sidebar-toggle');
    
    if (window.innerWidth <= 768) {
        if (adminSidebar.classList.contains('active') && 
            !adminSidebar.contains(e.target) && 
            !toggleBtn.contains(e.target)) {
            closeSidebars();
        }
        if (studentSidebar.classList.contains('active') && 
            !studentSidebar.contains(e.target) && 
            !studentToggleBtn.contains(e.target)) {
            closeSidebars();
        }
    }
});

// --- Student Dashboard Functions ---

async function loadStudentDashboard() {
    try {
        // Fetch Student Profile
        const profileRes = await fetch(USER_API_URL, {
            headers: getAuthHeaders()
        });
        
        if (!profileRes.ok) throw new Error('Failed to fetch profile');
        const student = await profileRes.json();
        
        // Populate Header
        const name = student.firstName ? `${student.firstName} ${student.lastName}` : student.name;
        document.getElementById('student-name-display').innerText = name;
        
        // Populate Profile View
        const photoUrl = student.photo ? student.photo : DEFAULT_AVATAR;
        document.getElementById('student-view-photo').src = photoUrl;
        document.getElementById('student-view-fullname').innerText = name;
        document.getElementById('student-view-id').innerText = `#${student.studentId}`;
        document.getElementById('student-view-course').innerText = student.course;
        document.getElementById('student-view-year').innerText = student.yearLevel;
        document.getElementById('student-view-email').innerText = student.email;

        // Fetch Grades
        const gradesRes = await fetch('http://localhost:3000/api/student/grades', {
            headers: getAuthHeaders()
        });
        
        if (gradesRes.ok) {
            const grades = await gradesRes.json();
            renderStudentGrades(grades);
        }

        // Fetch Grading Sheet (Assessments)
        fetchStudentAssessments();

        // Fetch Announcements
        fetchAnnouncements();

    } catch (err) {
        console.error('Error loading student dashboard:', err);
    }
}

// --- Grading Sheet Logic ---
let allAssessments = [];

async function fetchStudentAssessments() {
    try {
        const res = await fetch('http://localhost:3000/api/student/assessments', {
            headers: getAuthHeaders()
        });
        if (res.ok) {
            allAssessments = await res.json();
            renderAssessments(allAssessments);
        }
    } catch (err) {
        console.error('Error fetching assessments:', err);
    }
}

function renderAssessments(data) {
    const tbody = document.getElementById('assessmentTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No assessments found.</td></tr>';
        return;
    }

    data.forEach(item => {
        let statusColor = 'var(--white)';
        if (item.status === 'Graded') statusColor = 'var(--primary-color)';
        else if (item.status === 'Missing') statusColor = 'var(--danger)';
        else if (item.status === 'Pending') statusColor = '#ffcc00';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.score !== null ? item.score + '/' + item.maxScore : '-'}</td>
            <td>${new Date(item.date).toLocaleDateString()}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${item.status}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAssessments() {
    const query = document.getElementById('assessmentSearch').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;

    const filtered = allAssessments.filter(item => {
        const matchesQuery = item.name.toLowerCase().includes(query);
        const matchesStatus = status === 'all' || item.status === status;
        return matchesQuery && matchesStatus;
    });

    renderAssessments(filtered);
}

let sortDir = 1;
function sortAssessments(key) {
    sortDir *= -1;
    const sorted = [...allAssessments].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (key === 'date') {
            valA = new Date(valA);
            valB = new Date(valB);
        }
        
        if (valA < valB) return -1 * sortDir;
        if (valA > valB) return 1 * sortDir;
        return 0;
    });
    renderAssessments(sorted);
}

// --- Announcements Logic ---
async function fetchAnnouncements() {
    try {
        const res = await fetch('http://localhost:3000/api/announcements', {
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const announcements = await res.json();
            renderAnnouncements(announcements);
        }
    } catch (err) {
        console.error('Error fetching announcements:', err);
    }
}

function renderAnnouncements(data) {
    const container = document.getElementById('announcements-container');
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-color);">No announcements.</p>';
        return;
    }

    // Sort by date desc
    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');

    data.forEach(ann => {
        const isRead = readIds.includes(ann.id);
        const dateStr = new Date(ann.timestamp).toLocaleString();
        
        const card = document.createElement('div');
        card.className = `announcement-card ${isRead ? 'read' : ''}`;
        card.setAttribute('data-id', ann.id);
        
        card.innerHTML = `
            <div class="announcement-header">
                <span class="badge badge-${ann.priority}">${ann.priority}</span>
                <div class="announcement-meta">
                    <span>${ann.author}</span>
                    <span>${dateStr}</span>
                    ${isRead ? '<span class="read-status"><i class="fas fa-check"></i> Read</span>' : ''}
                </div>
            </div>
            <div class="announcement-title">${ann.title}</div>
            <div class="announcement-content" style="margin-top:10px;">
                ${ann.content}
            </div>
        `;
        
        // Mark as read on click
        card.addEventListener('click', () => markAnnouncementRead(ann.id, card));
        
        container.appendChild(card);
    });
}

function markAnnouncementRead(id, cardElement) {
    const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem('readAnnouncements', JSON.stringify(readIds));
        
        // UI Update
        cardElement.classList.add('read');
        const meta = cardElement.querySelector('.announcement-meta');
        if (!meta.querySelector('.read-status')) {
             meta.insertAdjacentHTML('beforeend', '<span class="read-status"><i class="fas fa-check"></i> Read</span>');
        }
    }
}

function markAllAnnouncementsRead() {
    const cards = document.querySelectorAll('.announcement-card');
    cards.forEach(card => {
        const id = parseInt(card.getAttribute('data-id'));
        markAnnouncementRead(id, card);
    });
}

function renderStudentGrades(gradesData) {
    const container = document.getElementById('grades-container');
    container.innerHTML = '';
    
    if (!gradesData || gradesData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-color);">No grade records found.</p>';
        return;
    }

    gradesData.forEach(semester => {
        const semesterDiv = document.createElement('div');
        semesterDiv.className = 'table-container';
        semesterDiv.style.marginBottom = '30px';
        
        let tableHtml = `
            <h3 style="padding: 15px 20px; color: var(--primary-color); border-bottom: 1px solid #2b3642;">${semester.semester}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Course Title</th>
                        <th>Units</th>
                        <th>Grade</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        semester.courses.forEach(course => {
            // Determine grade color
            let gradeColor = 'var(--white)';
            const gradeVal = parseFloat(course.grade);
            if (gradeVal <= 1.25) gradeColor = 'var(--primary-color)'; // Excellent
            else if (gradeVal >= 3.0) gradeColor = 'var(--danger)'; // Warning/Fail
            
            tableHtml += `
                <tr>
                    <td>${course.code}</td>
                    <td>${course.title || course.name}</td>
                    <td>${course.units}</td>
                    <td style="color: ${gradeColor}; font-weight: bold;">${course.grade}</td>
                </tr>
            `;
        });
        
        tableHtml += `
                </tbody>
            </table>
        `;
        
        semesterDiv.innerHTML = tableHtml;
        container.appendChild(semesterDiv);
    });
}

function showStudentSection(sectionId) {
    // Hide all sections
    document.getElementById('student-overview').style.display = 'none';
    document.getElementById('student-grading-sheet').style.display = 'none';
    document.getElementById('student-grades').style.display = 'none';
    document.getElementById('student-announcements').style.display = 'none';
    
    // Show target
    document.getElementById(`student-${sectionId}`).style.display = 'block';
    
    // Update Sidebar
    document.querySelectorAll('#student-sidebar li').forEach(l => l.classList.remove('active'));
    
    if (sectionId === 'overview') {
        document.querySelector('#student-sidebar li:nth-child(1)').classList.add('active');
        document.getElementById('student-page-title').innerText = 'Profile';
    } else if (sectionId === 'grading-sheet') {
        document.querySelector('#student-sidebar li:nth-child(2)').classList.add('active');
        document.getElementById('student-page-title').innerText = 'Grading Sheet';
    } else if (sectionId === 'grades') {
        document.querySelector('#student-sidebar li:nth-child(3)').classList.add('active');
        document.getElementById('student-page-title').innerText = 'Semester Grades';
    } else if (sectionId === 'announcements') {
        document.querySelector('#student-sidebar li:nth-child(4)').classList.add('active');
        document.getElementById('student-page-title').innerText = 'Announcements';
    }
}

// Keyboard Navigation for Sidebar
document.addEventListener('DOMContentLoaded', () => {
    const sidebarItems = document.querySelectorAll('.sidebar li');
    sidebarItems.forEach(item => {
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
    });
});

function forgotPassword() {
    alert("For password recovery, please contact the System Administrator at admin@sims.com or visit the Registrar's Office with your ID.");
}
