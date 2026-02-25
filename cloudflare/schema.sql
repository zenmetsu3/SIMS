PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  course TEXT,
  year_level INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  title TEXT,
  units INTEGER
);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  semester TEXT,
  enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id, semester),
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL,
  grade REAL,
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_grades_enrollment ON grades(enrollment_id);

CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  actor TEXT,
  action TEXT,
  target TEXT,
  at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  priority TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  author TEXT
);
