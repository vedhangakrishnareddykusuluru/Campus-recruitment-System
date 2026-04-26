import os
from datetime import datetime, date

from dotenv import load_dotenv

load_dotenv()

from app import create_app, db
from app.models.user import User
from app.models.student import Student
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application
from app import bcrypt

STATUS_MAP = {
    'APPLIED': 'Applied',
    'SHORTLISTED': 'Under Review',
    'SELECTED': 'Selected',
    'REJECTED': 'Rejected',
}

STUDENT_DATA = [
    {
        'email': 'ravi@gmail.com',
        'password': 'pass123',
        'role': 'STUDENT',
        'first_name': 'Ravi',
        'last_name': 'Kumar',
        'department': 'AI',
        'cgpa': 9.5,
        'phone': '9000000001',
        'date_of_birth': date(2003, 6, 15),
    },
    {
        'email': 'anu@gmail.com',
        'password': 'pass123',
        'role': 'STUDENT',
        'first_name': 'Anu',
        'last_name': 'Sharma',
        'department': 'IT',
        'cgpa': 7.8,
        'phone': '9000000002',
        'date_of_birth': date(2003, 7, 20),
    },
    {
        'email': 'kiran@gmail.com',
        'password': 'pass123',
        'role': 'STUDENT',
        'first_name': 'Kiran',
        'last_name': 'Reddy',
        'department': 'CSE',
        'cgpa': 8.9,
        'phone': '9000000003',
        'date_of_birth': date(2003, 5, 12),
    },
    {
        'email': 'meena@gmail.com',
        'password': 'pass123',
        'role': 'STUDENT',
        'first_name': 'Meena',
        'last_name': 'Gupta',
        'department': 'ECE',
        'cgpa': 7.2,
        'phone': '9000000004',
        'date_of_birth': date(2003, 8, 1),
    },
    {
        'email': 'rahul@gmail.com',
        'password': 'pass123',
        'role': 'STUDENT',
        'first_name': 'Rahul',
        'last_name': 'Verma',
        'department': 'IT',
        'cgpa': 8.1,
        'phone': '9000000005',
        'date_of_birth': date(2003, 6, 30),
    },
]

COMPANY_DATA = [
    {
        'email': 'tcs@gmail.com',
        'password': 'pass123',
        'role': 'COMPANY',
        'company_name': 'TCS',
        'industry': 'IT Services',
        'location': 'Chennai',
    },
    {
        'email': 'infosys@gmail.com',
        'password': 'pass123',
        'role': 'COMPANY',
        'company_name': 'Infosys',
        'industry': 'IT Services',
        'location': 'Bangalore',
    },
    {
        'email': 'wipro@gmail.com',
        'password': 'pass123',
        'role': 'COMPANY',
        'company_name': 'Wipro',
        'industry': 'IT Services',
        'location': 'Hyderabad',
    },
    {
        'email': 'accenture@gmail.com',
        'password': 'pass123',
        'role': 'COMPANY',
        'company_name': 'Accenture',
        'industry': 'Consulting',
        'location': 'Pune',
    },
]

JOB_DATA = [
    {
        'company_name': 'TCS',
        'title': 'Software Developer',
        'salary': 630000.0,
        'min_cgpa': 7.0,
        'deadline': date(2026, 5, 1),
    },
    {
        'company_name': 'TCS',
        'title': 'Data Analyst',
        'salary': 500000.0,
        'min_cgpa': 6.5,
        'deadline': date(2026, 6, 1),
    },
    {
        'company_name': 'Infosys',
        'title': 'System Engineer',
        'salary': 450000.0,
        'min_cgpa': 6.5,
        'deadline': date(2026, 5, 15),
    },
    {
        'company_name': 'Infosys',
        'title': 'Web Developer',
        'salary': 500000.0,
        'min_cgpa': 7.0,
        'deadline': date(2026, 6, 10),
    },
    {
        'company_name': 'Wipro',
        'title': 'Network Engineer',
        'salary': 400000.0,
        'min_cgpa': 6.0,
        'deadline': date(2026, 5, 20),
    },
    {
        'company_name': 'Wipro',
        'title': 'Cyber Security Analyst',
        'salary': 650000.0,
        'min_cgpa': 7.5,
        'deadline': date(2026, 6, 25),
    },
    {
        'company_name': 'Accenture',
        'title': 'Business Analyst',
        'salary': 550000.0,
        'min_cgpa': 6.8,
        'deadline': date(2026, 6, 5),
    },
    {
        'company_name': 'Accenture',
        'title': 'Cloud Engineer',
        'salary': 700000.0,
        'min_cgpa': 7.2,
        'deadline': date(2026, 7, 1),
    },
]

APPLICATION_DATA = [
    {'job_title': 'Software Developer', 'student_email': 'ravi@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-16 19:28:50'},
    {'job_title': 'Data Analyst', 'student_email': 'anu@gmail.com', 'status': 'SHORTLISTED', 'timestamp': '2026-04-16 19:28:50'},
    {'job_title': 'Data Analyst', 'student_email': 'ravi@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-16 22:07:31'},
    {'job_title': 'Software Developer', 'student_email': 'kiran@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'Data Analyst', 'student_email': 'kiran@gmail.com', 'status': 'SHORTLISTED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'System Engineer', 'student_email': 'ravi@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'System Engineer', 'student_email': 'anu@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'Web Developer', 'student_email': 'meena@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'Network Engineer', 'student_email': 'rahul@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'Cyber Security Analyst', 'student_email': 'kiran@gmail.com', 'status': 'SHORTLISTED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'Cyber Security Analyst', 'student_email': 'rahul@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'Business Analyst', 'student_email': 'anu@gmail.com', 'status': 'SELECTED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'Business Analyst', 'student_email': 'meena@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'Cloud Engineer', 'student_email': 'ravi@gmail.com', 'status': 'APPLIED', 'timestamp': '2026-04-26 23:47:37'},
    {'job_title': 'Cloud Engineer', 'student_email': 'rahul@gmail.com', 'status': 'SHORTLISTED', 'timestamp': '2026-04-26 23:47:37'},
]


def make_password(raw_password):
    return bcrypt.generate_password_hash(raw_password).decode('utf-8')


def get_or_create_user(email, password, role):
    user = User.query.filter_by(email=email).first()
    if user:
        return user

    user = User(email=email, password=make_password(password), role=role)
    db.session.add(user)
    db.session.flush()
    return user


def get_company_by_name(name):
    return Company.query.filter_by(company_name=name).first()


def get_job_by_title(title):
    return Job.query.filter_by(job_title=title).first()


def seed_students():
    for student in STUDENT_DATA:
        user = get_or_create_user(student['email'], student['password'], student['role'])
        if not Student.query.filter_by(user_id=user.user_id).first():
            db.session.add(
                Student(
                    user_id=user.user_id,
                    first_name=student['first_name'],
                    last_name=student['last_name'],
                    department=student['department'],
                    cgpa=student['cgpa'],
                    phone=student['phone'],
                    date_of_birth=student['date_of_birth'],
                )
            )
    db.session.commit()


def seed_companies():
    for company in COMPANY_DATA:
        user = get_or_create_user(company['email'], company['password'], company['role'])
        if not Company.query.filter_by(user_id=user.user_id).first():
            db.session.add(
                Company(
                    user_id=user.user_id,
                    company_name=company['company_name'],
                    industry=company['industry'],
                    location=company['location'],
                )
            )
    db.session.commit()


def seed_jobs():
    for job_data in JOB_DATA:
        company = get_company_by_name(job_data['company_name'])
        if not company:
            continue
        if not Job.query.filter_by(job_title=job_data['title'], company_id=company.company_id).first():
            db.session.add(
                Job(
                    company_id=company.company_id,
                    job_title=job_data['title'],
                    job_description=f"{job_data['title']} role at {company.company_name} in {company.location}",
                    salary=job_data['salary'],
                    min_cgpa=job_data['min_cgpa'],
                    location=company.location,
                    application_deadline=job_data['deadline'],
                )
            )
    db.session.commit()


def seed_applications():
    for row in APPLICATION_DATA:
        student = User.query.filter_by(email=row['student_email']).first()
        if not student or student.role != 'STUDENT':
            continue
        student_profile = Student.query.filter_by(user_id=student.user_id).first()
        job = get_job_by_title(row['job_title'])
        status = STATUS_MAP[row['status']]
        if not student_profile or not job:
            continue
        if not Application.query.filter_by(student_id=student_profile.student_id, job_id=job.job_id).first():
            db.session.add(
                Application(
                    student_id=student_profile.student_id,
                    job_id=job.job_id,
                    status=status,
                    application_date=datetime.fromisoformat(row['timestamp']),
                )
            )
    db.session.commit()


def main():
    use_sqlite = os.getenv('USE_SQLITE', 'True').lower() == 'true'
    if use_sqlite:
        raise RuntimeError('Set USE_SQLITE=False in .env to seed the MySQL database.')

    app = create_app()
    with app.app_context():
        db.create_all()
        print('Seeding students...')
        seed_students()
        print('Seeding companies...')
        seed_companies()
        print('Seeding jobs...')
        seed_jobs()
        print('Seeding applications...')
        seed_applications()
        print('Database seeding complete.')


if __name__ == '__main__':
    main()
