const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin (Placeholder - requires service account)
// process.env.GOOGLE_APPLICATION_CREDENTIALS should be set
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized");
    } else {
        console.log("Firebase Admin not initialized (missing credentials)");
    }
} catch (e) {
    console.warn("Failed to initialize Firebase Admin:", e.message);
}

const app = express();
const PORT = 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-sims-2026'; // Use env var
const DATA_FILE = path.join(__dirname, 'data', 'students.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const AUDIT_FILE = path.join(__dirname, 'data', 'audit_logs.json');
const ASSESSMENTS_FILE = path.join(__dirname, 'data', 'assessments.json');
const ANNOUNCEMENTS_FILE = path.join(__dirname, 'data', 'announcements.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Login Rate Limiter (Stricter)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: { error: 'Too many login attempts, please try again later.' }
});

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // For form data if needed
app.use(express.static(path.join(__dirname, 'public')));

app.enable('trust proxy');
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
        if (proto !== 'https') {
            return res.redirect('https://' + req.headers.host + req.url);
        }
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Auth Middleware moved below helpers


const parseCookies = (req) => {
    const header = req.headers.cookie || '';
    const pairs = header.split(';').map(s => s.trim()).filter(Boolean);
    const obj = {};
    for (const p of pairs) {
        const idx = p.indexOf('=');
        if (idx > -1) obj[p.slice(0, idx)] = decodeURIComponent(p.slice(idx + 1));
    }
    return obj;
};

const loginAttempts = new Map();
const captchaChallenges = new Map();

app.get('/api/csrf-token', (req, res) => {
    const token = crypto.randomBytes(16).toString('hex');
    const opts = { httpOnly: false, sameSite: 'lax', path: '/' };
    if (process.env.NODE_ENV === 'production') opts.secure = true;
    res.cookie('XSRF-TOKEN', token, opts);
    res.json({ token });
});

app.get('/api/captcha', (req, res) => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const text = `${a} + ${b} = ?`;
    const token = crypto.randomBytes(12).toString('hex');
    const expires = Date.now() + 5 * 60 * 1000;
    captchaChallenges.set(token, { answer: String(a + b), expires });
    res.json({ token, text });
});

const requireCsrf = (req) => {
    const header = req.headers['x-csrf-token'];
    const cookies = parseCookies(req);
    const cookie = cookies['XSRF-TOKEN'];
    return header && cookie && header === cookie;
};

const ipKey = (req) => {
    const xf = req.headers['x-forwarded-for'];
    return Array.isArray(xf) ? xf[0] : (xf ? xf.split(',')[0] : req.ip);
};

// Helper functions
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, '[]');
        return [];
    }
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading data:", err);
        return [];
    }
};

const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing data:", err);
    }
};

const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (err) {
        console.error("Error reading users:", err);
        return [];
    }
};

const writeUsers = (data) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing users:", err);
    }
};

const readAudit = () => {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    } catch (err) {
        console.error("Error reading audit:", err);
        return [];
    }
};

const writeAudit = (data) => {
    try {
        fs.writeFileSync(AUDIT_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing audit:", err);
    }
};

const logAction = (action, user, details, success = true) => {
    const logs = readAudit();
    logs.push({
        timestamp: new Date().toISOString(),
        action,
        user: user || 'Unknown',
        details,
        success,
        ip: '::1' // Ideally capture from req
    });
    writeAudit(logs);
};

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const allowRole = (role) => (req, res, next) => {
    if (!req.user || req.user.role !== role) {
        logAction('ACCESS_DENIED', req.user ? req.user.username || req.user.email : 'Unknown', `Attempted access to ${req.path} requiring ${role}`, false);
        return res.status(403).json({ error: 'Access denied: Insufficient privileges' });
    }
    // Log successful admin access for critical routes or just generally?
    // Let's log if admin accesses sensitive routes
    if (role === 'admin' && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
         logAction('ADMIN_ACTION', req.user.username, `${req.method} ${req.path}`, true);
    }
    next();
};

const readAssessments = () => {
    if (!fs.existsSync(ASSESSMENTS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(ASSESSMENTS_FILE, 'utf8'));
    } catch (err) {
        console.error("Error reading assessments:", err);
        return [];
    }
};

const readAnnouncements = () => {
    if (!fs.existsSync(ANNOUNCEMENTS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf8'));
    } catch (err) {
        console.error("Error reading announcements:", err);
        return [];
    }
};

// Normalization Helper
const normalizeYearLevel = (input) => {
    if (input === null || input === undefined || input === '') return 1;
    
    // If it's already a number 1-12
    if (typeof input === 'number' && input >= 1 && input <= 12) return input;
    
    const str = String(input).toLowerCase().trim();
    
    // Check keywords
    if (str.includes('first') || str.includes('fresh') || str.includes('1st') || str === 'one' || str === '1') return 1;
    if (str.includes('second') || str.includes('soph') || str.includes('2nd') || str === 'two' || str === '2') return 2;
    if (str.includes('third') || str.includes('jun') || str.includes('3rd') || str === 'three' || str === '3') return 3;
    if (str.includes('fourth') || str.includes('sen') || str.includes('4th') || str === 'four' || str === '4') return 4;
    if (str.includes('fifth') || str.includes('5th') || str === 'five' || str === '5') return 5;
    if (str.includes('grade 11') || str.includes('11th') || str === '11') return 11;
    if (str.includes('grade 12') || str.includes('12th') || str === '12') return 12;
    
    // Check for year-like numbers (e.g., 2023)
    const num = parseInt(str.replace(/\D/g, '')); // extract digits
    if (!isNaN(num)) {
        if (num >= 1 && num <= 12) return num;
        if (num > 1900) {
            // Assume input is entry year or current year reference.
            // Simple logic: Calculate year level based on current year.
            // Assuming <env> date is 2026.
            const currentYear = new Date().getFullYear();
            // If entry year is 2023, and current is 2026 => 3rd/4th year?
            // Let's use logic: Year Level = (Current Year - Input Year) + 1
            // 2026 - 2026 + 1 = 1
            // 2026 - 2023 + 1 = 4
            let level = (currentYear - num) + 1;
            if (level < 1) level = 1;
            if (level > 5) level = 4; // Default max to 4 if calculated, unless it's explicitly 5? 
            // Keep existing logic capping at 4 for auto-calculation, but allow manual input up to 12
            return level;
        }
    }
    
    return 1; // Default fallback
};

const processStudentData = (data) => {
    // Transform Names to Uppercase
    ['firstName', 'middleName', 'lastName', 'fatherName', 'motherName'].forEach(field => {
        if (data[field]) {
            data[field] = data[field].toUpperCase();
        }
    });
    
    // Construct Full Name for search compatibility
    const f = data.firstName || '';
    const m = data.middleName || '';
    const l = data.lastName || '';
    data.name = `${f} ${m} ${l}`.replace(/\s+/g, ' ').trim();

    // Transform Year Level
    if (data.yearLevel !== undefined) {
        data.yearLevel = normalizeYearLevel(data.yearLevel);
    }
    
    return data;
};

const cleanStudent = (student) => {
    const { enrollmentHistory, ...rest } = student;
    return rest;
};

// API Routes

// Get all students
app.get('/api/students', authenticateToken, allowRole('admin'), (req, res) => {
    const students = readData();
    const cleaned = students.map(cleanStudent);
    res.json(cleaned);
});

// Search students
app.get('/api/students/search', authenticateToken, allowRole('admin'), (req, res) => {
    const { query } = req.query;
    const students = readData();
    if (!query) {
        const cleaned = students.map(cleanStudent);
        return res.json(cleaned);
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = students.filter(s => 
        s.studentId.toLowerCase().includes(lowerQuery) || 
        (s.name && s.name.toLowerCase().includes(lowerQuery))
    );
    const cleaned = filtered.map(cleanStudent);
    res.json(cleaned);
});

// Add student
app.post('/api/students', authenticateToken, allowRole('admin'), upload.single('photo'), (req, res) => {
    let newStudent = req.body;
    
    // Basic validation
    if (!newStudent.studentId || !newStudent.firstName || !newStudent.lastName || !newStudent.course) {
        return res.status(400).json({ error: 'Student ID, First Name, Last Name, and Course are required' });
    }

    if (newStudent.age && parseInt(newStudent.age) < 0) {
        return res.status(400).json({ error: 'Age cannot be negative' });
    }
    
    // Handle Photo
    if (req.file) {
        newStudent.photo = `/uploads/${req.file.filename}`;
    } else {
        newStudent.photo = null; // Or default placeholder logic
    }
    
    newStudent = processStudentData(newStudent);
    
    const students = readData();
    // Check duplicate ID
    if (students.some(s => s.studentId === newStudent.studentId)) {
        return res.status(400).json({ error: 'Student ID already exists' });
    }
    
    students.push(newStudent);
    writeData(students);
    res.status(201).json(newStudent);
});

// Update student
app.put('/api/students/:id', authenticateToken, allowRole('admin'), upload.single('photo'), (req, res) => {
    const { id } = req.params;
    let updates = req.body;
    
    const students = readData();
    const index = students.findIndex(s => s.studentId === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Student not found' });
    }

    if (updates.age && parseInt(updates.age) < 0) {
        return res.status(400).json({ error: 'Age cannot be negative' });
    }

    // Handle Photo Update
    if (req.file) {
        updates.photo = `/uploads/${req.file.filename}`;
    }
    
    updates = processStudentData(updates);
    
    // Merge updates
    students[index] = { ...students[index], ...updates };
    students[index].studentId = id; 
    
    writeData(students);
    res.json(students[index]);
});

// Add Enrollment Record - REMOVED
// app.post('/api/students/:id/enrollment', (req, res) => { ... });

// Delete student
app.delete('/api/students/:id', authenticateToken, allowRole('admin'), (req, res) => {
    const { id } = req.params;
    let students = readData();
    const initialLength = students.length;
    students = students.filter(s => s.studentId !== id);
    
    if (students.length === initialLength) {
        return res.status(404).json({ error: 'Student not found' });
    }
    
    writeData(students);
    res.json({ message: 'Student deleted successfully' });
});

app.get('/api/admin/assessments', authenticateToken, allowRole('admin'), (req, res) => {
    const assessments = readAssessments();
    res.json(assessments);
});

app.put('/api/admin/assessments/:studentId', authenticateToken, allowRole('admin'), (req, res) => {
    const { studentId } = req.params;
    const { assignment } = req.body;
    if (!assignment || !assignment.name || assignment.maxScore === undefined) {
        return res.status(400).json({ error: 'Invalid assignment payload' });
    }
    const assessments = readAssessments();
    let entry = assessments.find(a => a.studentId === studentId);
    if (!entry) {
        entry = { studentId, assignments: [] };
        assessments.push(entry);
    }
    if (!assignment.id) {
        const maxId = entry.assignments.reduce((m, a) => Math.max(m, a.id || 0), 0);
        assignment.id = maxId + 1;
    }
    const idx = entry.assignments.findIndex(a => a.id === assignment.id);
    if (idx >= 0) {
        entry.assignments[idx] = { ...entry.assignments[idx], ...assignment };
    } else {
        entry.assignments.push(assignment);
    }
    fs.writeFileSync(ASSESSMENTS_FILE, JSON.stringify(assessments, null, 2));
    res.json({ message: 'Updated', assignment });
});

// --- User Management Routes ---

// Helper to verify Firebase ID token but remain usable in dev
async function verifyFirebaseToken(idToken) {
    if (!idToken) throw new Error('ID Token required');
    if (admin && admin.apps && admin.apps.length > 0) {
        return await admin.auth().verifyIdToken(idToken);
    }
    console.warn("Using mock token verification (Firebase Admin not initialized)");
    // In dev, accept any non-empty token and build a pseudo user
    return { uid: 'dev-' + crypto.randomBytes(6).toString('hex'), email: 'student@local.dev' };
}

// Firebase Auth Verification Endpoint
app.post('/api/auth/firebase', loginLimiter, async (req, res) => {
    try {
        const { idToken } = req.body;
        const decodedToken = await verifyFirebaseToken(idToken);
        const token = jwt.sign(
            { id: decodedToken.uid, email: decodedToken.email, role: 'student' },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        logAction('LOGIN_SUCCESS', decodedToken.email, 'Firebase login', true);
        return res.json({ token, user: decodedToken, role: 'student' });
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        logAction('LOGIN_FAILED', 'firebase-user', error.message, false);
        return res.status(401).json({ error: error.message || 'Invalid token' });
    }
});

// Login Endpoint - ADMIN ONLY
app.post('/api/login', loginLimiter, (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email/ID and password are required' });
    }

    const users = readUsers();
    // Students check removed to restrict system access to admins only

    // 1. Check Admin Users (by email)
    const adminUser = users.find(u => u.email === email && u.status === 'active');
    
    if (adminUser) {
        const passwordMatch = bcrypt.compareSync(password, adminUser.password);
        if (!passwordMatch) {
            logAction('LOGIN_FAILED', email, 'Wrong password', false);
            return res.status(401).json({ error: 'wrong password' });
        }
        
        // Generate Token for Admin
        const token = jwt.sign(
            { id: adminUser.id, username: adminUser.username, role: 'admin', email: adminUser.email },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        logAction('LOGIN_SUCCESS', adminUser.username, 'Admin logged in', true);
        const { password: _, ...userWithoutPassword } = adminUser;
        return res.json({ token, user: userWithoutPassword, role: 'admin' });
    }

    // 2. Not found or not admin
    // Timing attack mitigation
    bcrypt.compareSync(password, '$2b$10$AsEbUuKeBFX5NGE/ezhLu.Bs.Q2U/hdIoMuqTxMwfdwW9T752w/Nm');
    logAction('LOGIN_FAILED', email, 'User not found or access restricted', false);
    return res.status(401).json({ error: 'Invalid credentials or access denied' });
});

// Admin Login Endpoint
app.post('/api/login/admin', loginLimiter, (req, res) => {
    const { email, password, departmentCode } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    const users = readUsers();
    const adminUser = users.find(u => u.email === email && u.status === 'active');
    if (!adminUser) {
        bcrypt.compareSync(password, '$2b$10$AsEbUuKeBFX5NGE/ezhLu.Bs.Q2U/hdIoMuqTxMwfdwW9T752w/Nm');
        logAction('LOGIN_FAILED', email, 'Admin user not found', false);
        return res.status(401).json({ error: 'wrong email' });
    }
    const passwordMatch = bcrypt.compareSync(password, adminUser.password);
    if (!passwordMatch) {
        logAction('LOGIN_FAILED', email, 'Wrong password', false);
        return res.status(401).json({ error: 'wrong password' });
    }
    const requiredDeptCode = process.env.ADMIN_DEPT_CODE;
    if (requiredDeptCode) {
        if (!departmentCode || departmentCode !== requiredDeptCode) {
            logAction('LOGIN_FAILED', email, 'Invalid department code', false);
            return res.status(401).json({ error: 'invalid department code' });
        }
    }
    const token = jwt.sign(
        { id: adminUser.id, username: adminUser.username, role: 'admin', email: adminUser.email },
        SECRET_KEY,
        { expiresIn: '24h' }
    );
    logAction('LOGIN_SUCCESS', adminUser.username, 'Admin logged in via dedicated endpoint', true);
    const { password: _, ...userWithoutPassword } = adminUser;
    return res.json({ token, user: userWithoutPassword, role: 'admin' });
});

// Student Login Endpoint - Accepts Firebase ID Token
app.post('/api/login/student', loginLimiter, async (req, res) => {
    try {
        const { idToken } = req.body;
        const decodedToken = await verifyFirebaseToken(idToken);
        const token = jwt.sign(
            { id: decodedToken.uid, email: decodedToken.email, role: 'student' },
            SECRET_KEY,
            { expiresIn: '24h' }
        );
        logAction('LOGIN_SUCCESS', decodedToken.email, 'Student login via /api/login/student', true);
        return res.json({ token, user: decodedToken, role: 'student' });
    } catch (error) {
        logAction('LOGIN_FAILED CARBON', 'student', error.message, false);
        return res.status(401).json({ error: error.message || 'Invalid credentials' });
    }
});



// Get current user (Protected) - Handles both Admin and Student
app.get('/api/current-user', authenticateToken, (req, res) => {
    if (req.user.role === 'admin') {
        const users = readUsers();
        const user = users.find(u => u.email === req.user.email);
        if (!user || user.status !== 'active') return res.status(404).json({ error: 'User not found' });
        const { password, ...safeUser } = user;
        return res.json({ ...safeUser, role: 'admin' });
    } else if (req.user.role === 'student') {
        const students = readData();
        const student = students.find(s => s.studentId === req.user.id);
        if (!student) return res.status(404).json({ error: 'Student not found' });
        const { password, grades, ...safeStudent } = student;
        return res.json({ ...safeStudent, role: 'student' });
    }
    res.status(403).json({ error: 'Invalid role' });
});

// Get Student Grades (Protected)
app.get('/api/student/grades', authenticateToken, allowRole('student'), (req, res) => {
    const students = readData();
    const student = students.find(s => s.studentId === req.user.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    res.json(student.grades || []);
});

// Get Student Assessments (Protected)
app.get('/api/student/assessments', authenticateToken, allowRole('student'), (req, res) => {
    const assessments = readAssessments();
    const studentAssessment = assessments.find(a => a.studentId === req.user.id);
    
    res.json(studentAssessment ? studentAssessment.assignments : []);
});

// Get Announcements (Public/Protected)
app.get('/api/announcements', (req, res) => {
    const announcements = readAnnouncements();
    res.json(announcements);
});

// Soft Delete User (Admin Removal)
app.delete('/api/users/:username', (req, res) => {
    const { username } = req.params;
    const users = readUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

    if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];
    
    // Soft delete: change status to inactive
    user.status = 'inactive';
    user.deleted_at = new Date().toISOString();
    
    writeUsers(users);

    // Audit Log
    const auditLogs = readAudit();
    auditLogs.push({
        action: 'DELETE_USER',
        target: username,
        executor: 'SYSTEM_ADMIN_TOOL', // Mock executor
        timestamp: new Date().toISOString(),
        details: 'Soft delete of admin account via automated procedure'
    });
    writeAudit(auditLogs);

    res.json({ message: 'User deactivated successfully', user: user });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
