const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'students.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const AUDIT_FILE = path.join(__dirname, 'data', 'audit_logs.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

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
app.get('/api/students', (req, res) => {
    const students = readData();
    const cleaned = students.map(cleanStudent);
    res.json(cleaned);
});

// Search students
app.get('/api/students/search', (req, res) => {
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
app.post('/api/students', upload.single('photo'), (req, res) => {
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
app.put('/api/students/:id', upload.single('photo'), (req, res) => {
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
app.delete('/api/students/:id', (req, res) => {
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

// --- User Management Routes ---

// Get current user (Mock auth: returns first active admin)
app.get('/api/current-user', (req, res) => {
    const users = readUsers();
    // In a real app, this would check session/token. 
    // Here we return the first active admin found, or null.
    const activeAdmin = users.find(u => u.status === 'active' && u.role === 'admin');
    res.json(activeAdmin || null);
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
