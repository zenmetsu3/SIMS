// LocalStorage Database Service (Mocking Backend)
const DatabaseService = {
    // Students -------------------------------------------
    _getStudents() {
        try {
            const data = localStorage.getItem('sims_students');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Error reading students from localStorage", e);
            return {};
        }
    },
    _saveStudents(students) {
        try {
            localStorage.setItem('sims_students', JSON.stringify(students));
            this._notifySubscribers(students);
        } catch (e) {
            console.error("Error writing students to localStorage", e);
        }
    },
    async setStudent(studentId, data) {
        const students = this._getStudents();
        students[studentId] = {
            ...data,
            updatedAt: new Date().toISOString()
        };
        this._saveStudents(students);
        console.log(`Student ${studentId} saved to LocalStorage`);
    },
    async getStudent(studentId) {
        const students = this._getStudents();
        return students[studentId] || null;
    },
    async updateStudent(studentId, updates) {
        const students = this._getStudents();
        if (students[studentId]) {
            students[studentId] = {
                ...students[studentId],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this._saveStudents(students);
            console.log(`Student ${studentId} updated in LocalStorage`);
        }
    },
    async deleteStudent(studentId) {
        const students = this._getStudents();
        if (students[studentId]) {
            delete students[studentId];
            this._saveStudents(students);
            console.log(`Student ${studentId} deleted from LocalStorage`);
        }
    },
    // Realtime Listener (Mocked)
    _subscribers: [],
    subscribeToStudents(callback) {
        this._subscribers.push(callback);
        const students = this._getStudents();
        callback(students);
        return () => {
            this._subscribers = this._subscribers.filter(cb => cb !== callback);
        };
    },
    _notifySubscribers(students) {
        this._subscribers.forEach(cb => cb(students));
    },

    // Users ----------------------------------------------
    _getUsers() {
        try {
            const data = localStorage.getItem('sims_users');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Error reading users from localStorage", e);
            return {};
        }
    },
    _saveUsers(users) {
        try {
            localStorage.setItem('sims_users', JSON.stringify(users));
        } catch (e) {
            console.error("Error writing users to localStorage", e);
        }
    },
    ensureDefaultAdmin() {
        const users = this._getUsers();
        if (!users['admin@sims.com']) {
            users['admin@sims.com'] = {
                email: 'admin@sims.com',
                password: 'admin123',
                role: 'admin',
                departmentCode: 'ITD-2026',
                createdAt: new Date().toISOString()
            };
            this._saveUsers(users);
        }
    },
    async setUser(user) {
        const users = this._getUsers();
        if (!user || !user.email) throw new Error("User email is required");
        users[user.email] = { ...user };
        this._saveUsers(users);
    },
    async updateUser(email, updates) {
        const users = this._getUsers();
        if (users[email]) {
            users[email] = { ...users[email], ...updates };
            this._saveUsers(users);
        }
    },
    async deleteUser(email) {
        const users = this._getUsers();
        if (users[email]) {
            delete users[email];
            this._saveUsers(users);
        }
    },
    async getUserByEmail(email) {
        const users = this._getUsers();
        return users[email] || null;
    },
    async getUserByStudentId(studentId) {
        const users = this._getUsers();
        const list = Object.values(users);
        return list.find(u => u.studentId === studentId) || null;
    }
};

// Initialize defaults and expose
DatabaseService.ensureDefaultAdmin();
window.DatabaseService = DatabaseService;
