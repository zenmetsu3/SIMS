const API_URL = 'http://localhost:3000/api/students';
const USER_API_URL = 'http://localhost:3000/api/current-user';
const LOGIN_API_URL = 'http://localhost:3000/api/login';
const LOGIN_ADMIN_URL = 'http://localhost:3000/api/login/admin';
const LOGIN_STUDENT_URL = 'http://localhost:3000/api/login/student';
const CSRF_URL = 'http://localhost:3000/api/csrf-token';
const CAPTCHA_URL = 'http://localhost:3000/api/captcha';

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
});

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
        const response = await fetch(LOGIN_ADMIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, departmentCode })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            const loginScreen = document.getElementById('login-screen');
            loginScreen.style.opacity = '0';
            loginScreen.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loginScreen.style.display = 'none';
                document.getElementById('app-dashboard').style.display = 'flex';
                fetchUser();
                fetchStudents();
            }, 500);
        } else {
            const errorMessage = data.error || 'Login failed';
            if (errorMessage === 'wrong email') {
                emailError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Wrong email';
                emailInput.classList.add('error');
                emailInput.focus();
            } else if (errorMessage === 'wrong password') {
                passwordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Wrong password';
                passwordInput.classList.add('error');
                passwordInput.focus();
            } else if (errorMessage === 'invalid department code') {
                deptError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Invalid department code';
                deptInput.classList.add('error');
                deptInput.focus();
            } else {
                alert(errorMessage);
            }
        }
    } catch (err) {
        alert(err.message || 'An error occurred during admin login.');
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
    const captchaWrap = document.getElementById('student-captcha');
    const captchaText = document.getElementById('captcha-text');
    const captchaAnswerEl = document.getElementById('captcha-answer');
    const email = idInput.value.trim();
    const password = passwordInput.value;
    const btn = submitBtn;
    const originalText = btn.querySelector('.btn-text').innerText;
    idError.innerText = '';
    passwordError.innerText = '';
    idInput.classList.remove('error');
    passwordInput.classList.remove('error');
    idInput.setAttribute('aria-invalid', 'false');
    passwordInput.setAttribute('aria-invalid', 'false');
    btn.querySelector('.btn-text').innerText = 'Signing In...';
    btn.classList.add('loading');
    btn.disabled = true;
    btn.style.opacity = '0.7';
    const emailValid = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$/.test(email) || /^[A-Za-z0-9-]+$/.test(email);
    if (!email || !emailValid) {
        idError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Enter a valid email or ID';
        idInput.classList.add('error');
        idInput.setAttribute('aria-invalid', 'true');
        btn.querySelector('.btn-text').innerText = originalText;
        btn.classList.remove('loading');
        btn.disabled = false;
        btn.style.opacity = '1';
        return;
    }
    if (!password) {
        passwordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Enter your password';
        passwordInput.classList.add('error');
        passwordInput.setAttribute('aria-invalid', 'true');
        btn.querySelector('.btn-text').innerText = originalText;
        btn.classList.remove('loading');
        btn.disabled = false;
        btn.style.opacity = '1';
        return;
    }
    try {
        const csrf = await ensureCsrf();
        const body = { email, password };
        const visibleCaptcha = captchaWrap.style.display !== 'none';
        if (visibleCaptcha) {
            const t = sessionStorage.getItem('captchaToken');
            const ans = captchaAnswerEl.value.trim();
            if (t && ans) {
                body.captchaToken = t;
                body.captchaAnswer = ans;
            }
        }
        const response = await fetch(LOGIN_STUDENT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) },
            credentials: 'include',
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (response.ok) {
            if (remember && remember.checked) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
            } else {
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('role', data.role);
            }
            const loginScreen = document.getElementById('login-screen');
            loginScreen.style.opacity = '0';
            loginScreen.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loginScreen.style.display = 'none';
                document.getElementById('student-dashboard').style.display = 'flex';
                loadStudentDashboard();
            }, 500);
        } else {
            const errorMessage = data.error || 'Login failed';
            if (errorMessage === 'wrong email') {
                idError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Wrong ID or email';
                idInput.classList.add('error');
                idInput.focus();
            } else if (errorMessage === 'wrong password') {
                passwordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Wrong password';
                passwordInput.classList.add('error');
                passwordInput.focus();
            } else if (errorMessage === 'account not initialized') {
                idError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Account not initialized. Contact admin.';
                idInput.classList.add('error');
            } else if (errorMessage === 'captcha required' || data.captchaRequired) {
                captchaWrap.style.display = '';
                try {
                    const c = await fetch('http://localhost:3000/api/captcha', { credentials: 'include' });
                    if (c.ok) {
                        const cj = await c.json();
                        sessionStorage.setItem('captchaToken', cj.token);
                        captchaText.innerText = cj.text;
                        captchaAnswerEl.value = '';
                        document.getElementById('captcha-error').innerText = '';
                    }
                } catch {}
            } else if (errorMessage === 'captcha invalid') {
                document.getElementById('captcha-error').innerHTML = '<i class="fas fa-exclamation-circle"></i> Incorrect answer';
                captchaAnswerEl.classList.add('error');
                captchaAnswerEl.focus();
            } else if (response.status === 429) {
                idError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Too many attempts. Please try again later.';
                captchaWrap.style.display = '';
            } else {
                alert(errorMessage);
            }
        }
    } catch (err) {
        alert(err.message || 'An error occurred during student login.');
    } finally {
        btn.querySelector('.btn-text').innerText = originalText;
        btn.classList.remove('loading');
        btn.disabled = false;
        btn.style.opacity = '1';
        loginDraft.student = { id: email, password };
        saveDraft();
    }
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
        const pw = document.getElementById('reg-password');
        const bar = document.getElementById('strength-bar');
        const text = document.getElementById('strength-text');
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
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Registration requires backend integration.');
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
    try {
        const existing = sessionStorage.getItem('csrfToken');
        if (existing) return existing;
        const res = await fetch(CSRF_URL, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            sessionStorage.setItem('csrfToken', data.token);
            return data.token;
        }
    } catch {}
    return null;
}

// (Removed obsolete Quick Panel functions)
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
    try {
        const res = await fetch('http://localhost:3000/api/announcements', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            renderAnnouncementsTo('admin-announcements-list', data);
        }
    } catch {}
}

async function initAdminTerm(term) {
    try {
        const res = await fetch(API_URL, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const bodyId = `${term}-body`;
        const totalId = `${term}-total`;
        const subId = `${term}-submitted`;
        const missId = `${term}-missing`;
        const nameId = `${term}-name`;
        const maxId = `${term}-max`;
        const dateId = `${term}-date`;
        const tbody = document.getElementById(bodyId);
        const totalEl = document.getElementById(totalId);
        const submittedEl = document.getElementById(subId);
        const missingEl = document.getElementById(missId);
        tbody.innerHTML = '';
        let submitted = 0;
        let missing = 0;
        const aname = document.getElementById(nameId).value.trim();
        const amax = parseFloat(document.getElementById(maxId).value);
        data.forEach(st => {
            const tr = document.createElement('tr');
            const statusId = `${term}-status-${st.studentId}`;
            const scoreId = `${term}-score-${st.studentId}`;
            tr.innerHTML = `
                <td>${st.studentId}</td>
                <td>${st.name || (st.firstName + ' ' + st.lastName)}</td>
                <td>
                    <select id="${statusId}" aria-label="Submission status for ${st.studentId}">
                        <option value="Pending">Pending</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Missing">Missing</option>
                    </select>
                </td>
                <td>
                    <input id="${scoreId}" type="number" min="0" ${isFinite(amax) ? `max="${amax}"` : ''} step="0.01" inputmode="decimal" aria-label="Score for ${st.studentId}">
                </td>
                <td id="${term}-pct-${st.studentId}">-</td>
                <td>
                    <button class="btn-primary" aria-label="Save grade for ${st.studentId}" data-id="${st.studentId}">Save</button>
                </td>
            `;
            tbody.appendChild(tr);
            const select = tr.querySelector(`#${statusId}`);
            const input = tr.querySelector(`#${scoreId}`);
            const pctCell = tr.querySelector(`#${term}-pct-${st.studentId}`);
            const calc = () => {
                const v = parseFloat(input.value);
                if (isFinite(amax) && isFinite(v)) {
                    const pct = Math.max(0, Math.min(100, (v / amax) * 100));
                    pctCell.textContent = pct.toFixed(1) + '%';
                } else {
                    pctCell.textContent = '-';
                }
            };
            input.addEventListener('input', calc);
            select.addEventListener('change', () => {
                if (select.value === 'Submitted') submitted++;
                if (select.value === 'Missing') missing++;
                submittedEl.textContent = `${submitted} submitted`;
                missingEl.textContent = `${missing} missing`;
            });
        });
        totalEl.textContent = `${data.length} students`;
        tbody.querySelectorAll('button.btn-primary').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const studentId = e.currentTarget.getAttribute('data-id');
                const name = document.getElementById(nameId).value.trim();
                const maxScore = parseFloat(document.getElementById(maxId).value);
                const date = document.getElementById(dateId).value || new Date().toISOString().slice(0,10);
                const scoreInput = document.getElementById(`${term}-score-${studentId}`);
                const statusSelect = document.getElementById(`${term}-status-${studentId}`);
                const rawScore = scoreInput.value;
                if (!name || !isFinite(maxScore)) {
                    alert('Provide assignment name and max score.');
                    return;
                }
                const payload = {
                    assignment: {
                        name,
                        maxScore,
                        date,
                        term,
                        status: statusSelect.value,
                        score: rawScore === '' ? null : parseFloat(rawScore)
                    }
                };
                try {
                    const resp = await fetch(`http://localhost:3000/api/admin/assessments/${studentId}`, {
                        method: 'PUT',
                        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!resp.ok) throw new Error('Save failed');
                    e.currentTarget.textContent = 'Saved';
                    setTimeout(() => e.currentTarget.textContent = 'Save', 1200);
                } catch {
                    alert('Failed to save grade.');
                }
            });
        });
    } catch {}
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
