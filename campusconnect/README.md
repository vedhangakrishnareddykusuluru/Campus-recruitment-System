# 🎓 CampusConnect – Enterprise Campus Recruitment System

A production-ready, full-stack campus recruitment platform built with **Flask + SQLAlchemy + JWT + HTML/CSS**.

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.10+ / Flask 2.3 |
| ORM | SQLAlchemy 2.0 |
| Auth | JWT (Flask-JWT-Extended) |
| Passwords | bcrypt |
| Database | SQLite (dev) / MySQL (prod) |
| Frontend | Vanilla HTML5 + CSS3 + JS |
| Theme | Bold Orange — dark warm amber |

---

## 📁 Project Structure

```
campusconnect/
├── run.py                      # Entry point
├── requirements.txt
├── .env                        # Environment config
├── schema.sql                  # MySQL production schema
├── campusconnect.db            # SQLite dev database (auto-created)
└── app/
    ├── __init__.py             # App factory
    ├── models/
    │   ├── user.py             # USERS table
    │   ├── student.py          # STUDENTS table
    │   ├── company.py          # COMPANIES table
    │   ├── job.py              # JOBS table
    │   └── application.py      # APPLICATIONS table (M:N associative)
    ├── routes/
    │   ├── auth_routes.py      # /auth/* — login, register, me
    │   ├── job_routes.py       # /jobs/* — CRUD, search, filter, pagination
    │   ├── student_routes.py   # /student/* — apply, track
    │   ├── company_routes.py   # /company/* — post jobs, manage applicants
    │   └── admin_routes.py     # /admin/* — read-only monitoring + analytics
    ├── static/css/main.css     # Full design system
    └── templates/
        ├── base.html           # Sidebar layout
        ├── auth/login.html
        ├── auth/register.html
        ├── student/dashboard.html
        ├── company/dashboard.html
        └── admin/dashboard.html
```

---

## 🚀 Quick Start (Development — SQLite)

### 1. Clone & Install

```bash
cd campusconnect
pip install -r requirements.txt
```

### 2. Run

```bash
python run.py
```

App starts at **http://localhost:5000**

### 3. Login with Admin

| Field | Value |
|-------|-------|
| Email | admin@campusconnect.com |
| Password | Admin@123 |

---

## 🗄 Switch to MySQL (Production)

1. Create database:
```sql
CREATE DATABASE campusconnect_db CHARACTER SET utf8mb4;
```

2. Run schema:
```bash
mysql -u root -p campusconnect_db < schema.sql
```

3. Update `.env`:
```env
USE_SQLITE=False
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campusconnect_db
DB_USER=root
DB_PASSWORD=your_password
```

---

## 🔗 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/api/login | Login → returns JWT |
| POST | /auth/api/register | Register (Student/Company) |
| GET | /auth/api/me | Get current user |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /jobs/?search=&industry=&page= | List jobs (paginated, filtered) |
| GET | /jobs/{id} | Get single job |
| POST | /jobs/post | Post job (Company only) |
| DELETE | /jobs/{id} | Delete job (Company only) |
| GET | /jobs/industries | All industries list |

### Student
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /student/apply/{job_id} | Apply for job |
| GET | /student/applications | My applications |
| GET | /student/profile | My profile |

### Company
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /company/jobs | Company's job listings |
| GET | /company/applicants/{job_id} | Applicants for a job |
| PUT | /company/update-status/{app_id} | Update application status |
| GET | /company/profile | Company profile |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/stats | Analytics overview |
| GET | /admin/students | All students |
| GET | /admin/companies | All companies |
| GET | /admin/applications | All applications |

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **ADMIN** | View all data, analytics dashboard — no writes |
| **STUDENT** | Browse & apply for jobs, track applications |
| **COMPANY** | Post jobs, view applicants, update status |

---

## 🗃 Database Design (3NF)

```
USERS ──1:1──► STUDENTS
USERS ──1:1──► COMPANIES
COMPANIES ──1:M──► JOBS
STUDENTS ──M:N──► JOBS  (via APPLICATIONS)
```

Constraints enforced:
- `UNIQUE(email)` on users
- `UNIQUE(student_id, job_id)` — no duplicate applications
- `ENUM` validation on role and status
- `ON DELETE CASCADE` for referential integrity
- Composite indexes for performance

---

## ✨ Pro Features Included

- [x] **JWT Authentication** — stateless, secure
- [x] **Search & Filter** — jobs by keyword, industry, location
- [x] **Pagination** — jobs, students, applications
- [x] **Analytics Dashboard** — status breakdown, top companies, dept stats
- [x] **CGPA Validation** — students can't apply below min CGPA
- [x] **Deadline Enforcement** — closed jobs can't receive applications
- [x] **Audit Timestamps** — `created_at`, `updated_at` on all tables
- [x] **Responsive UI** — mobile-friendly sidebar & layouts
