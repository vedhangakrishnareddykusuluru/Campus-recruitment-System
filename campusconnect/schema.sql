-- ============================================================
--  CampusConnect – Production MySQL Schema (3NF)
--  Run this ONCE to set up the database
-- ============================================================

CREATE DATABASE IF NOT EXISTS campusconnect_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE campusconnect_db;

-- ── USERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id    INT          AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(120) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    role       ENUM('ADMIN','STUDENT','COMPANY') NOT NULL,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role  (role)
) ENGINE=InnoDB;

-- ── STUDENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    student_id    INT         AUTO_INCREMENT PRIMARY KEY,
    user_id       INT         NOT NULL UNIQUE,
    first_name    VARCHAR(60) NOT NULL,
    last_name     VARCHAR(60) NOT NULL,
    department    VARCHAR(100) NOT NULL,
    cgpa          FLOAT       NOT NULL CHECK (cgpa >= 0 AND cgpa <= 10),
    phone         VARCHAR(15) NOT NULL,
    date_of_birth DATE        NOT NULL,   -- age is DERIVED from this
    created_at    DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_s_dept (department),
    INDEX idx_s_cgpa (cgpa)
) ENGINE=InnoDB;

-- ── COMPANIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
    company_id   INT          AUTO_INCREMENT PRIMARY KEY,
    user_id      INT          NOT NULL UNIQUE,
    company_name VARCHAR(120) NOT NULL,
    location     VARCHAR(120) NOT NULL,
    industry     VARCHAR(80)  NOT NULL,
    created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_company_user
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_c_industry (industry)
) ENGINE=InnoDB;

-- ── JOBS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    job_id               INT          AUTO_INCREMENT PRIMARY KEY,
    company_id           INT          NOT NULL,
    job_title            VARCHAR(120) NOT NULL,
    job_description      TEXT         NOT NULL,
    salary               FLOAT        NOT NULL,
    min_cgpa             FLOAT        NOT NULL DEFAULT 0.0,
    location             VARCHAR(120) NOT NULL,
    application_deadline DATE         NOT NULL,
    created_at           DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_job_company
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    INDEX idx_j_company  (company_id),
    INDEX idx_j_deadline (application_deadline),
    INDEX idx_j_cgpa     (min_cgpa)
) ENGINE=InnoDB;

-- ── APPLICATIONS (Associative Entity – M:N) ───────────────
CREATE TABLE IF NOT EXISTS applications (
    application_id   INT      AUTO_INCREMENT PRIMARY KEY,
    student_id       INT      NOT NULL,
    job_id           INT      NOT NULL,
    status           ENUM('Applied','Under Review','Selected','Rejected')
                              NOT NULL DEFAULT 'Applied',
    application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes            TEXT,
    CONSTRAINT fk_app_student
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_app_job
        FOREIGN KEY (job_id)     REFERENCES jobs(job_id)     ON DELETE CASCADE,
    CONSTRAINT uq_student_job
        UNIQUE (student_id, job_id),    -- no duplicate applications
    INDEX idx_app_student (student_id),
    INDEX idx_app_job     (job_id),
    INDEX idx_app_status  (status)
) ENGINE=InnoDB;

-- ── Default ADMIN Seed ─────────────────────────────────────
-- Password hash below = bcrypt of 'Admin@123'
INSERT IGNORE INTO users (email, password, role)
VALUES (
  'admin@campusconnect.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhg5UFKZ0CrJBQoH0Kf4yq',
  'ADMIN'
);
-- NOTE: The app's create_app() re-seeds with correct hash on first run.
