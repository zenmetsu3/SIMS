// Local Demo Constants
const MOCK_ADMIN_EMAIL = "admin@sims.com";
const MOCK_ADMIN_PASS = "admin123";

// --- Role Toggle State ---
let loginDraft = {
    admin: { email: '', password: '', dept: '' },
    student: { id: '', password: '' }
};

function saveDraft() {
    sessionStorage.setItem('loginDraft', JSON.stringify(loginDraft));
}

function loadDraft() {
    try {
        const raw = sessionStorage.getItem('loginDraft');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.admin) loginDraft.admin = parsed.admin;
            if (parsed.student) loginDraft.student = parsed.student;
        }
    } catch {}
}

function applyDraftToForms() {
    const a = loginDraft.admin;
    const s = loginDraft.student;
    const adminEmail = document.getElementById('admin-email');
    const adminPass = document.getElementById('admin-password');
    const adminDept = document.getElementById('admin-dept');
    const studentId = document.getElementById('student-id');
    const studentPass = document.getElementById('student-password');
    if (adminEmail) adminEmail.value = a.email || '';
    if (adminPass) adminPass.value = a.password || '';
    if (adminDept) adminDept.value = a.dept || '';
    if (studentId) studentId.value = s.id || '';
    if (studentPass) studentPass.value = s.password || '';
}

function setActiveRole(role) {
    sessionStorage.setItem('selectedRole', role);
    const adminBtn = document.getElementById('toggle-admin');
    const studentBtn = document.getElementById('toggle-student');
    const adminForm = document.getElementById('admin-form');
    const studentForm = document.getElementById('student-form');
    const label = document.getElementById('active-role-label');
    if (!adminBtn || !studentBtn || !adminForm || !studentForm || !label) return;
    if (role === 'admin') {
        adminBtn.classList.add('active');
        studentBtn.classList.remove('active');
        adminForm.style.display = '';
        adminForm.setAttribute('aria-hidden', 'false');
        studentForm.style.display = 'none';
        studentForm.setAttribute('aria-hidden', 'true');
        label.innerHTML = '<i class="fas fa-user-shield"></i> Admin Mode';
    } else {
        adminBtn.classList.remove('active');
        studentBtn.classList.add('active');
        adminForm.style.display = 'none';
        adminForm.setAttribute('aria-hidden', 'true');
        studentForm.style.display = '';
        studentForm.setAttribute('aria-hidden', 'false');
        label.innerHTML = '<i class="fas fa-user-graduate"></i> Student Mode';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadDraft();
    applyDraftToForms();
    const savedRole = sessionStorage.getItem('selectedRole') || 'admin';
    setActiveRole(savedRole);
    const adminBtn = document.getElementById('toggle-admin');
    const studentBtn = document.getElementById('toggle-student');
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            const sId = document.getElementById('student-id').value;
            const sPass = document.getElementById('student-password').value;
            loginDraft.student = { id: sId, password: sPass };
            const aEmail = document.getElementById('admin-email').value;
            const aPass = document.getElementById('admin-password').value;
            const aDept = document.getElementById('admin-dept').value;
            loginDraft.admin = { email: aEmail, password: aPass, dept: aDept };
            saveDraft();
            setActiveRole('admin');
        });
    }
    if (studentBtn) {
        studentBtn.addEventListener('click', () => {
            const aEmail = document.getElementById('admin-email').value;
            const aPass = document.getElementById('admin-password').value;
            const aDept = document.getElementById('admin-dept').value;
            loginDraft.admin = { email: aEmail, password: aPass, dept: aDept };
            const sId = document.getElementById('student-id').value;
            const sPass = document.getElementById('student-password').value;
            loginDraft.student = { id: sId, password: sPass };
            saveDraft();
            setActiveRole('student');
        });
    }

    // Bind Login Forms
    const adminForm = document.getElementById('admin-form');
    if (adminForm) {
        adminForm.addEventListener('submit', handleAdminLogin);
    }
    const studentForm = document.getElementById('student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', handleStudentLogin);
    }
});

// --- Local Data Sync ---
let studentSyncUnsubscribe = null;

function startStudentSync() {
    if (studentSyncUnsubscribe) {
        studentSyncUnsubscribe();
    }
    
    // Subscribe to changes in LocalStorage
    studentSyncUnsubscribe = DatabaseService.subscribeToStudents((data) => {
        // Convert object to array for display
        const studentsList = Object.values(data);
        // Use the global students array for filtering
        students = studentsList;
        renderTable(students);
        updateStats();
    });
}

// Remove Firebase ready listener
// window.addEventListener('firebase-ready', () => {});

// --- Login Logic: Admin ---
async function handleAdminLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const deptInput = document.getElementById('admin-dept');
    const emailError = document.getElementById('admin-email-error');
    const passwordError = document.getElementById('admin-password-error');
    const deptError = document.getElementById('admin-dept-error');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const departmentCode = deptInput.value.trim();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    emailError.innerText = '';
    passwordError.innerText = '';
    deptError.innerText = '';
    emailInput.classList.remove('error');
    passwordInput.classList.remove('error');
    deptInput.classList.remove('error');
    btn.innerText = 'Signing In...';
    btn.disabled = true;
    btn.style.opacity = '0.7';
    try {
        await new Promise(r => setTimeout(r, 500));

        const user = await DatabaseService.getUserByEmail(email);
        const deptOk = user && typeof user.departmentCode === 'string'
            ? (departmentCode || '').trim().toUpperCase() === user.departmentCode.trim().toUpperCase()
            : true;

        if (user && user.role === 'admin' && user.password === password && deptOk) {
            localStorage.setItem('token', 'mock-admin-token-' + email);
            localStorage.setItem('role', 'admin');
            const loginScreen = document.getElementById('login-screen');
            loginScreen.classList.add('hidden');
            setTimeout(() => {
                loginScreen.style.display = 'none';
                document.getElementById('app-dashboard').style.display = 'flex';
                fetchUser();
                startStudentSync(); 
            }, 500);
        } else {
            if (!user || user.role !== 'admin') {
                emailError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Admin account not found';
                emailInput.classList.add('error');
                emailInput.focus();
            } else if (user.password !== password) {
                passwordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Wrong password';
                passwordInput.classList.add('error');
                passwordInput.focus();
            } else if (!deptOk) {
                deptError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Invalid department code';
                deptInput.classList.add('error');
                deptInput.focus();
            }
        }
    } catch (err) {
        alert('An error occurred during admin login.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.style.opacity = '1';
        loginDraft.admin = { email, password, dept: departmentCode };
        saveDraft();
    }
}

// --- Login Logic: Student ---
async function handleStudentLogin(e) {
    e.preventDefault();
    const idInput = document.getElementById('student-id');
    const passwordInput = document.getElementById('student-password');
    const idError = document.getElementById('student-id-error');
    const passwordError = document.getElementById('student-password-error');
    const remember = document.getElementById('student-remember');
    const submitBtn = document.getElementById('student-submit-btn');
    const identifier = idInput.value.trim();
    const password = passwordInput.value;
    const btn = submitBtn;
    const originalText = btn.querySelector('.btn-text').innerText;
    
    // Reset UI
    idError.innerText = '';
    passwordError.innerText = '';
    idInput.classList.remove('error');
    passwordInput.classList.remove('error');
    idInput.setAttribute('aria-invalid', 'false');
    passwordInput.setAttribute('aria-invalid', 'false');
    
    // Basic Validation
    if (!identifier) {
        idError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Enter your email or ID';
        idInput.classList.add('error');
        return;
    }
    if (!password) {
        passwordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Enter your password';
        passwordInput.classList.add('error');
        return;
    }

    btn.querySelector('.btn-text').innerText = 'Signing In...';
    btn.classList.add('loading');
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        await new Promise(r => setTimeout(r, 500)); // Fake delay
        
        // Check user by email first
        let user = await DatabaseService.getUserByEmail(identifier);
        // If not found by email, try by studentId
        if (!user) {
            user = await DatabaseService.getUserByStudentId(identifier);
        }

        if (user && user.role === 'student') {
            // Validate password
            if (user.password !== password) {
                throw new Error('Invalid email/ID or password');
            }
            const studentId = user.studentId;
            if (!studentId) throw new Error('Student profile not linked');

            const token = 'mock-student-token-' + studentId;
            if (remember && remember.checked) {
               localStorage.setItem('token', token);
               localStorage.setItem('role', 'student');
               localStorage.setItem('currentStudentId', studentId);
            } else {
               sessionStorage.setItem('token', token);
               sessionStorage.setItem('role', 'student');
               sessionStorage.setItem('currentStudentId', studentId);
            }

           const loginScreen = document.getElementById('login-screen');
           loginScreen.classList.add('hidden');
           setTimeout(() => {
               loginScreen.style.display = 'none';
               document.getElementById('app-dashboard').style.display = 'none';
               document.getElementById('student-dashboard').style.display = 'flex';
               loadStudentDashboard();
           }, 500);
        } else {
            throw new Error('Student account not found. Please register first.');
        }

    } catch (err) {
        idError.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${err.message}`;
        idInput.classList.add('error');
    } finally {
        btn.querySelector('.btn-text').innerText = originalText;
        btn.classList.remove('loading');
        btn.disabled = false;
        btn.style.opacity = '1';
        loginDraft.student = { id: identifier, password };
        saveDraft();
    }
}

// Google Login Handler (Disabled)
async function handleGoogleLogin() {
    alert("Google Sign-In is disabled in this local demo version.");
}

// Toggle Password Visibility
document.addEventListener('DOMContentLoaded', () => {
    const showAdmin = document.getElementById('show-admin-password');
    if (showAdmin) {
        showAdmin.addEventListener('change', function() {
            const passwordInput = document.getElementById('admin-password');
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    }
    const showStudent = document.getElementById('show-student-password');
    if (showStudent) {
        showStudent.addEventListener('change', function() {
            const passwordInput = document.getElementById('student-password');
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    }
    const regLink = document.getElementById('student-register-link');
    const regModal = document.getElementById('registerModal');
    const regClose = document.getElementById('registerClose');
    const regCancel = document.getElementById('registerCancel');
    const regForm = document.getElementById('registerForm');
    if (regLink && regModal) {
        regLink.addEventListener('click', (e) => {
            e.preventDefault();
            regModal.style.display = 'flex';
        });
    }
    if (regClose) regClose.addEventListener('click', () => regModal.style.display = 'none');
    if (regCancel) regCancel.addEventListener('click', () => regModal.style.display = 'none');
    if (regForm) {
        // Password Strength Meter
        const pw = document.getElementById('reg-password');
        const bar = document.getElementById('strength-bar');
        const text = document.getElementById('strength-text');
        
        if (pw && bar && text) {
             const calcStrength = (v) => {
                let score = 0;
                if (v.length >= 8) score++;
                if (/[A-Z]/.test(v)) score++;
                if (/[a-z]/.test(v)) score++;
                if (/[0-9]/.test(v)) score++;
                if (/[^A-Za-z0-9]/.test(v)) score++;
                return score;
            };
            pw.addEventListener('input', () => {
                const s = calcStrength(pw.value);
                const pct = (s / 5) * 100;
                bar.style.width = pct + '%';
                if (s <= 2) { bar.style.background = '#ff4d4d'; text.textContent = 'Weak'; }
                else if (s === 3) { bar.style.background = '#ffcc00'; text.textContent = 'Medium'; }
                else { bar.style.background = '#2ecc71'; text.textContent = 'Strong'; }
            });
        }
        
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const confirmPass = document.getElementById('reg-confirm').value;
            const studentId = document.getElementById('reg-student-id').value.trim();
            const firstName = (document.getElementById('reg-first-name')?.value || '').trim();
            const middleName = (document.getElementById('reg-middle-name')?.value || '').trim();
            const lastName = (document.getElementById('reg-last-name')?.value || '').trim();
            const degreeProgram = (document.getElementById('reg-degree')?.value || '').trim();
            const yearLevel = (document.getElementById('reg-year-level')?.value || '').trim();
            const phone = (document.getElementById('reg-phone')?.value || '').trim();
            const dob = (document.getElementById('reg-dob')?.value || '').trim();
            const admissionDate = (document.getElementById('reg-admission-date')?.value || '').trim();
            const age = (document.getElementById('reg-age')?.value || '').trim();
            const currentAddress = (document.getElementById('reg-current-address')?.value || '').trim();
            const permanentAddress = (document.getElementById('reg-permanent-address')?.value || '').trim();
            const fatherName = (document.getElementById('reg-father-name')?.value || '').trim();
            const motherName = (document.getElementById('reg-mother-name')?.value || '').trim();
            
            const errors = [];
            const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!studentId) errors.push('Student ID is required');
            if (!firstName) errors.push('First name is required');
            if (!lastName) errors.push('Last name is required');
            if (!degreeProgram) errors.push('Course is required');
            if (!yearLevel) errors.push('Year level is required');
            if (!email || !emailRe.test(email)) errors.push('Valid email is required');
            if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
            if (password !== confirmPass) errors.push('Passwords do not match');
            if (phone && !/^[0-9()+\-\s]{7,20}$/.test(phone)) errors.push('Phone number format is invalid');
            
            if (errors.length) {
                alert('Please fix the following:\n- ' + errors.join('\n- '));
                return;
            }

            try {
                // Mock Registration
                const existingStudents = await DatabaseService._getStudents();
                if (existingStudents[studentId]) {
                    throw new Error("Student ID already exists.");
                }
                
                // Check email uniqueness
                const emailExists = Object.values(existingStudents).some(s => s.email === email);
                if (emailExists) {
                    throw new Error("Email already exists.");
                }

                const newStudent = {
                    email,
                    studentId,
                    firstName: firstName || "New",
                    middleName: middleName || "",
                    lastName: lastName || "Student",
                    course: degreeProgram || "",
                    yearLevel: yearLevel || "",
                    phone: phone || "",
                    birthDate: dob || "",
                    admissionDate: admissionDate || "",
                    age: age || "",
                    currentAddress: currentAddress || "",
                    permanentAddress: permanentAddress || "",
                    fatherName: fatherName || "",
                    motherName: motherName || "",
                    status: "active",
                    password: password, // Storing plain text for demo
                    createdAt: new Date().toISOString()
                };
                
                // Use DatabaseService
                await DatabaseService.setStudent(studentId, newStudent);
                // Also create linked user account for login
                await DatabaseService.setUser({
                    email,
                    password,
                    role: 'student',
                    studentId,
                    createdAt: new Date().toISOString()
                });

                alert('Registration successful! Please login.');
                // Find and close modal properly
                const modal = document.getElementById('registerModal') || document.querySelector('.modal');
                if (modal) modal.style.display = 'none';
                regForm.reset();
                
            } catch (error) {
                console.error("Registration Error:", error);
                alert('Registration failed: ' + error.message);
            }
        });
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
    ensureCsrf();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const role = localStorage.getItem('role') || sessionStorage.getItem('role');
    if (token) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('login-screen').classList.add('hidden');
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
    
    if (studentSyncUnsubscribe) {
        studentSyncUnsubscribe();
        studentSyncUnsubscribe = null;
    }
    
    document.getElementById('app-dashboard').style.display = 'none';
    document.getElementById('student-dashboard').style.display = 'none';
    
    const loginScreen = document.getElementById('login-screen');
    loginScreen.style.display = 'flex';
    // Force reflow
    void loginScreen.offsetWidth;
    loginScreen.classList.remove('hidden');
    
    // Reset form
    const adminEmail = document.getElementById('admin-email');
    const adminPassword = document.getElementById('admin-password');
    const adminDept = document.getElementById('admin-dept');
    const studentId = document.getElementById('student-id');
    const studentPassword = document.getElementById('student-password');
    if (adminEmail) adminEmail.value = '';
    if (adminPassword) adminPassword.value = '';
    if (adminDept) adminDept.value = '';
    if (studentId) studentId.value = '';
    if (studentPassword) studentPassword.value = '';
    sessionStorage.removeItem('loginDraft');
    sessionStorage.removeItem('selectedRole');
    
    // Clear errors
    const errorIds = ['admin-email-error','admin-password-error','admin-dept-error','student-id-error','student-password-error'];
    errorIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = '';
    });
    ['admin-email','admin-password','admin-dept','student-id','student-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('error');
    });
}
function getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function ensureCsrf() {
    return "mock-csrf-token";
}

// (Removed obsolete Quick Panel functions)
// Fetch User
async function fetchUser() {
    try {
        const role = localStorage.getItem('role');
        const profileEl = document.getElementById('user-profile');
        const usernameEl = document.getElementById('username-display');
        
        if (role === 'admin') {
            usernameEl.innerText = 'Admin';
            profileEl.style.display = 'flex';
            return true;
        } else if (role === 'student') {
             // Already handled by loadStudentDashboard mostly
             const id = localStorage.getItem('currentStudentId');
             if (id) {
                 const student = await DatabaseService.getStudent(id);
                 if (student) {
                    usernameEl.innerText = student.firstName;
                    profileEl.style.display = 'flex';
                    return true;
                 }
             }
        }
        return false;
    } catch (err) {
        console.error('Error fetching user:', err);
        return false;
    }
}

function renderAnnouncementsTo(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-color);">No announcements.</p>';
        return;
    }
    const items = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    items.forEach(ann => {
        const dateStr = new Date(ann.timestamp).toLocaleString();
        const pri = (ann.priority || 'low').toLowerCase();
        const card = document.createElement('div');
        card.className = 'announcement-card';
        card.innerHTML = `
            <div class="announcement-header">
                <span class="badge badge-${pri}">${pri}</span>
                <div class="announcement-meta">
                    <span>${ann.author || 'System'}</span>
                    <span>${dateStr}</span>
                </div>
            </div>
            <div class="announcement-title">${ann.title}</div>
            <div class="announcement-content">${(ann.content || '').replace(/\\n/g,'<br>')}</div>
        `;
        container.appendChild(card);
    });
}

async function initAdminAnnouncements() {
    // Mock - No backend
}

async function loadAdminGradingSheet() {
    try {
        const data = await DatabaseService._getStudents();
        const students = Object.values(data);
        const tbody = document.getElementById('admin-grading-body');
        tbody.innerHTML = '';
        
        students.forEach(st => {
            const tr = document.createElement('tr');
            
            // Get grades from the first semester found or mock data
            let subjects = [];
            if (st.grades && st.grades.length > 0 && st.grades[0].courses) {
                subjects = st.grades[0].courses.slice(0, 4); // Take up to 4 subjects
            }
            
            // Fill up with placeholders if less than 4
            while (subjects.length < 4) {
                subjects.push({ grade: 0 });
            }

            const s1 = parseFloat(subjects[0].grade) || 0;
            const s2 = parseFloat(subjects[1].grade) || 0;
            const s3 = parseFloat(subjects[2].grade) || 0;
            const s4 = parseFloat(subjects[3].grade) || 0;
            
            // Determine Letter Grade based on average
            const avg = (s1 + s2 + s3 + s4) / 4;
            const avgDisplay = avg.toFixed(2);
            
            let letter = 'F';
            if (avg <= 1.5 && avg > 0) letter = 'A';
            else if (avg <= 2.5 && avg > 0) letter = 'B';
            else if (avg <= 3.0 && avg > 0) letter = 'C';
            else if (avg <= 4.0 && avg > 0) letter = 'D';
            else if (avg === 0) letter = '-';
            
            const inputStyle = "width: 60px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: center;";

            tr.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${st.name || (st.firstName + ' ' + st.lastName)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <input type="number" step="0.01" min="0" value="${s1 || ''}" style="${inputStyle}" class="grade-input" data-idx="0">
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <input type="number" step="0.01" min="0" value="${s2 || ''}" style="${inputStyle}" class="grade-input" data-idx="1">
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <input type="number" step="0.01" min="0" value="${s3 || ''}" style="${inputStyle}" class="grade-input" data-idx="2">
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <input type="number" step="0.01" min="0" value="${s4 || ''}" style="${inputStyle}" class="grade-input" data-idx="3">
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;" class="total-score">${avgDisplay}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;" class="letter-grade">${letter}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">
                    <button class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="saveStudentGrades('${st.studentId}', this)">Save</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Add change listener for live calc
            const inputs = tr.querySelectorAll('.grade-input');
            const totalEl = tr.querySelector('.total-score');
            const letterEl = tr.querySelector('.letter-grade');

            const recalc = () => {
                let sum = 0;
                let count = 0;
                inputs.forEach(inp => {
                    const val = parseFloat(inp.value) || 0;
                    sum += val;
                    if (parseFloat(inp.value) > 0) count++; 
                });
                
                // Fixed 4 subjects logic
                const average = sum / 4;
                totalEl.innerText = average.toFixed(2);
                
                let l = 'F';
                if (average <= 1.5 && average > 0) l = 'A';
                else if (average <= 2.5 && average > 0) l = 'B';
                else if (average <= 3.0 && average > 0) l = 'C';
                else if (average <= 4.0 && average > 0) l = 'D';
                else if (average === 0) l = '-';
                
                letterEl.innerText = l;
            };

            inputs.forEach(inp => inp.addEventListener('input', recalc));
        });
    } catch (err) {
        console.error("Error loading grading sheet:", err);
    }
}

async function saveStudentGrades(studentId, btn) {
    const originalText = btn.innerText;
    btn.innerText = 'Saving...';
    btn.disabled = true;

    try {
        const tr = btn.closest('tr');
        const inputs = tr.querySelectorAll('.grade-input');
        const newGrades = Array.from(inputs).map(inp => parseFloat(inp.value) || 0);

        const student = await DatabaseService.getStudent(studentId);
        if (student) {
            // Ensure structure exists
            if (!student.grades) student.grades = [];
            if (student.grades.length === 0) student.grades.push({ semester: "1st Semester", courses: [] });
            
            // Update courses
            const courses = student.grades[0].courses;
            // Ensure we have enough course slots
            while (courses.length < 4) {
                courses.push({ code: `SUBJ${courses.length+1}`, title: `Subject ${courses.length+1}`, units: 3, grade: 0 });
            }

            // Update specific grades
            newGrades.forEach((val, i) => {
                if (courses[i]) courses[i].grade = val;
            });

            await DatabaseService.updateStudent(studentId, { grades: student.grades });
            btn.innerText = 'Saved!';
            setTimeout(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            }, 1500);
        }
    } catch (err) {
        console.error("Save error:", err);
        alert("Failed to save grades");
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function initAdminTerm(term) {
    // Deprecated
}

// Fetch Data
async function fetchStudents() {
    try {
        const data = await DatabaseService._getStudents();
        students = Object.values(data);
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
    const titleMap = {
        'dashboard': 'Overview',
        'students': 'Student Records',
        'profile-view': 'Student Profile',
        'admin-grading': 'Grading Sheet',
        'admin-announcements': 'Announcements'
    };
    
    const activeIndexMap = {
        'dashboard': 1,
        'students': 2,
        'profile-view': 2,
        'admin-grading': 3,
        'admin-announcements': 4
    };
    
    if (titleMap[sectionId]) {
        document.getElementById('page-title').innerText = titleMap[sectionId];
    }
    
    if (activeIndexMap[sectionId]) {
        document.querySelector(`.sidebar li:nth-child(${activeIndexMap[sectionId]})`).classList.add('active');
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

    // Render Grades
    const grades = student.grades || [];
    renderStudentGrades(grades, 'admin-view-grades-container', id);
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
    
    // Mock Form Submission
    const data = Object.fromEntries(formData.entries());
    const studentId = data.studentId;

    try {
        if (isEdit) {
            await DatabaseService.updateStudent(studentId, data);
        } else {
            const existing = await DatabaseService.getStudent(studentId);
            if (existing) throw new Error("Student ID already exists");
            await DatabaseService.setStudent(studentId, {
                ...data,
                status: 'active',
                createdAt: new Date().toISOString()
            });
        }

        closeModal();
        
        // If we are currently viewing this profile, refresh it
        if (isEdit && currentProfileId === studentId) {
             const allData = await DatabaseService._getStudents();
             students = Object.values(allData);
             viewProfile(currentProfileId);
        }

    } catch (err) {
        console.error('Error saving student:', err);
        alert(err.message || 'An error occurred');
    }
});

// Delete
async function deleteStudent(id) {
    if (confirm('Are you sure you want to delete this student?')) {
        try {
            await DatabaseService.deleteStudent(id);
            // Re-fetch handled by subscription
            
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
        const id = localStorage.getItem('currentStudentId') || sessionStorage.getItem('currentStudentId');
        if (!id) {
             // Try to find by email if ID not set (fallback)
             const token = localStorage.getItem('token') || sessionStorage.getItem('token');
             if (token && token.startsWith('mock-student-token-')) {
                 const extractedId = token.replace('mock-student-token-', '');
                 localStorage.setItem('currentStudentId', extractedId);
                 // recursive call
                 return loadStudentDashboard();
             }
             return;
        }

        const student = await DatabaseService.getStudent(id);
        if (!student) {
            console.error("Student not found");
            return;
        }
        
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

        // Mock Data for Grades/Assessments if not present
        const grades = student.grades || [];
        renderStudentGrades(grades);

        const assessments = student.assessments || [];
        renderAssessments(assessments);

        // Fetch Announcements (Mock)
        // fetchAnnouncements(); 

    } catch (err) {
        console.error('Error loading student dashboard:', err);
    }
}

// --- Grading Sheet Logic ---
let allAssessments = [];

async function fetchStudentAssessments() {
    try {
        const id = localStorage.getItem('currentStudentId');
        if (!id) return;
        const student = await DatabaseService.getStudent(id);
        if (student && student.assessments) {
            allAssessments = student.assessments;
        } else {
            allAssessments = [];
        }
        renderAssessments(allAssessments);
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
    // Mock Announcements
    const announcements = [
        { id: 1, title: "Welcome to SIMS", content: "Welcome to the new Student Information Management System!", priority: "high", author: "Admin", timestamp: new Date().toISOString() },
        { id: 2, title: "Exam Schedule", content: "Midterm exams will start next week.", priority: "medium", author: "Registrar", timestamp: new Date().toISOString() }
    ];
    renderAnnouncements(announcements);
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

function renderStudentGrades(gradesData, containerId = 'grades-container', studentId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    if (!gradesData || gradesData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-color);">No grade records found.</p>';
        return;
    }

    // Header Info
    const id = studentId || localStorage.getItem('currentStudentId');
    DatabaseService.getStudent(id).then(student => {
        if (!student) return;
        const headerHtml = `
            <div class="grade-header-info" style="background-color: var(--white); color: #333; padding: 20px; border-radius: 8px; margin-bottom: 20px; font-family: 'Roboto', sans-serif;">
                <div style="display: flex; gap: 40px; margin-bottom: 10px;">
                    <div><span style="font-weight: bold; color: #555;">School Year:</span> <span style="font-weight: bold;">2025-2026</span></div>
                    <div><span style="font-weight: bold; color: #555;">Term:</span> <span style="font-weight: bold;">Second</span></div>
                </div>
                <div style="display: flex; gap: 30px;">
                    <div><span style="font-weight: bold; color: #555;">Course:</span> <span style="font-weight: bold;">${student.course || 'BSIT'}</span></div>
                    <div><span style="font-weight: bold; color: #555;">Year Level:</span> <span style="font-weight: bold;">${student.yearLevel || '1 Year'}</span></div>
                    <div><span style="font-weight: bold; color: #555;">Section:</span> <span style="font-weight: bold;">M002</span></div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('afterbegin', headerHtml);

        gradesData.forEach((semester, index) => {
            const semesterDiv = document.createElement('div');
            semesterDiv.className = 'table-container grade-table-wrapper';
            semesterDiv.style.marginBottom = '30px';
            
            // Calculate GWA
            let totalUnits = 0;
            let totalPoints = 0;
            semester.courses.forEach(c => {
                const u = parseFloat(c.units) || 0;
                const g = parseFloat(c.grade) || 0;
                if (g > 0) {
                    totalUnits += u;
                    totalPoints += (u * g);
                }
            });
            const gwa = totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : '0.00';

            let tableHtml = `
                <table class="styled-grade-table">
                    <thead>
                        <tr style="background-color: #002b5c; color: white;">
                            <th style="padding: 12px;">#</th>
                            <th style="padding: 12px;">SUBJECT CODE</th>
                            <th style="padding: 12px;">SUBJECT TITLE</th>
                            <th style="padding: 12px;">PROFESSOR</th>
                            <th style="padding: 12px;">UNITS</th>
                            <th style="padding: 12px;">SECTION</th>
                            <th style="padding: 12px;">PRELIM</th>
                            <th style="padding: 12px;">MIDTERM</th>
                            <th style="padding: 12px;">FINAL</th>
                            <th style="padding: 12px;">AVERAGE</th>
                            <th style="padding: 12px;">GRADE STATUS</th>
                        </tr>
                    </thead>
                    <tbody style="background-color: white; color: #333;">
            `;
            
            semester.courses.forEach((course, i) => {
                const gradeVal = parseFloat(course.grade);
                const status = gradeVal <= 3.0 ? 'Passed' : 'Failed';
                const statusColor = gradeVal <= 3.0 ? '#2ecc71' : '#ff4d4d';
                
                // Mock breakdown grades if not present
                const prelim = course.prelim || (gradeVal + 0.1).toFixed(2);
                const midterm = course.midterm || (gradeVal - 0.1).toFixed(2);
                const final = course.final || gradeVal;

                tableHtml += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;">${i + 1}</td>
                        <td style="padding: 12px;">${course.code}</td>
                        <td style="padding: 12px;">${course.title || course.name}</td>
                        <td style="padding: 12px;">${course.professor || 'TBA'}</td>
                        <td style="padding: 12px;">${course.units}</td>
                        <td style="padding: 12px;">M002</td>
                        <td style="padding: 12px;">${prelim}</td>
                        <td style="padding: 12px;">${midterm}</td>
                        <td style="padding: 12px;">${final}</td>
                        <td style="padding: 12px; font-weight: bold;">${course.grade}</td>
                        <td style="padding: 12px; color: ${statusColor}; font-weight: bold;">${status}</td>
                    </tr>
                `;
            });
            
            tableHtml += `
                    </tbody>
                </table>
                <div style="background-color: #f0f4f8; padding: 15px; border-radius: 0 0 8px 8px; margin-top: -5px; color: #333; font-weight: bold;">
                    General Weighted Average (GWA): <span style="float: right; font-size: 1.1rem;">${gwa}</span>
                </div>
            `;
            
            semesterDiv.innerHTML = tableHtml;
            container.appendChild(semesterDiv);
        });
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
