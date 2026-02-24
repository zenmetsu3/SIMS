const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_FILE = path.join(__dirname, '../data/students.json');

const migrate = async () => {
    if (!fs.existsSync(DATA_FILE)) {
        console.log('No students.json found.');
        return;
    }

    let students = [];
    try {
        students = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        console.error('Error reading students.json:', err);
        return;
    }

    console.log(`Found ${students.length} students. Migrating...`);

    let updatedCount = 0;
    for (const student of students) {
        let changed = false;

        // Add password if missing
        if (!student.password) {
            // Default password is the student ID
            const salt = await bcrypt.genSalt(10);
            student.password = await bcrypt.hash(student.studentId, salt);
            changed = true;
        }

        // Add grades if missing
        if (!student.grades) {
            student.grades = [
                {
                    semester: "1st Semester 2023-2024",
                    courses: [
                        { code: "IT101", title: "Introduction to Computing", units: 3, grade: "1.25" },
                        { code: "IT102", title: "Computer Programming 1", units: 3, grade: "1.50" },
                        { code: "MATH1", title: "Mathematics in the Modern World", units: 3, grade: "1.75" },
                        { code: "ENG1", title: "Purposive Communication", units: 3, grade: "1.25" },
                        { code: "PE1", title: "Physical Fitness", units: 2, grade: "1.00" }
                    ]
                },
                {
                    semester: "2nd Semester 2023-2024",
                    courses: [
                        { code: "IT103", title: "Computer Programming 2", units: 3, grade: "1.25" },
                        { code: "IT104", title: "Data Structures and Algorithms", units: 3, grade: "1.50" },
                        { code: "MATH2", title: "Discrete Mathematics", units: 3, grade: "1.75" },
                        { code: "FIL1", title: "Kontekstwalisadong Komunikasyon", units: 3, grade: "1.25" },
                        { code: "PE2", title: "Rhythmic Activities", units: 2, grade: "1.00" }
                    ]
                }
            ];
            changed = true;
        }

        if (changed) updatedCount++;
    }

    if (updatedCount > 0) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2));
        console.log(`Successfully migrated ${updatedCount} students.`);
    } else {
        console.log('No changes needed.');
    }
};

migrate();
