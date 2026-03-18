from flask import Blueprint, request, jsonify, render_template, redirect, url_for, session, abort
from app import db, bcrypt
from app.models.user import User
from app.models.student import Student
from app.models.company import Company
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import date

auth_bp = Blueprint('auth', __name__)


# ── Page Routes ────────────────────────────────────────────────────────────────

@auth_bp.route('/login', methods=['GET'])
def login_page():
    return render_template('auth/login.html')


@auth_bp.route('/register', methods=['GET'])
def register_page():
    return render_template('auth/register.html')


# ── API Routes ─────────────────────────────────────────────────────────────────

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'message': 'Email and password are required'}), 400

    user = User.query.filter_by(email=data['email'].lower().strip()).first()
    if not user or not bcrypt.check_password_hash(user.password, data['password']):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    token = create_access_token(identity=str(user.user_id))

    profile = None
    if user.role == 'STUDENT' and user.student_profile:
        profile = user.student_profile.to_dict()
    elif user.role == 'COMPANY' and user.company_profile:
        profile = user.company_profile.to_dict()

    return jsonify({
        'success': True,
        'token':   token,
        'user':    user.to_dict(),
        'profile': profile,
    }), 200


@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['email', 'password', 'role']
    for f in required:
        if not data.get(f):
            return jsonify({'success': False, 'message': f'{f} is required'}), 400

    role = data['role'].upper()
    if role not in ('STUDENT', 'COMPANY'):
        return jsonify({'success': False, 'message': 'Role must be STUDENT or COMPANY'}), 400

    email = data['email'].lower().strip()
    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already registered'}), 409

    hashed_pw = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user = User(email=email, password=hashed_pw, role=role)
    db.session.add(user)
    db.session.flush()  # get user_id before commit

    if role == 'STUDENT':
        _required_student = ['first_name', 'last_name', 'department', 'cgpa', 'phone', 'date_of_birth']
        for f in _required_student:
            if not data.get(f):
                db.session.rollback()
                return jsonify({'success': False, 'message': f'Student field {f} is required'}), 400
        try:
            dob = date.fromisoformat(data['date_of_birth'])
        except ValueError:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Invalid date_of_birth format (YYYY-MM-DD)'}), 400

        student = Student(
            user_id       = user.user_id,
            first_name    = data['first_name'],
            last_name     = data['last_name'],
            department    = data['department'],
            cgpa          = float(data['cgpa']),
            phone         = data['phone'],
            date_of_birth = dob,
        )
        db.session.add(student)

    elif role == 'COMPANY':
        _required_company = ['company_name', 'location', 'industry']
        for f in _required_company:
            if not data.get(f):
                db.session.rollback()
                return jsonify({'success': False, 'message': f'Company field {f} is required'}), 400
        company = Company(
            user_id      = user.user_id,
            company_name = data['company_name'],
            location     = data['location'],
            industry     = data['industry'],
        )
        db.session.add(company)

    db.session.commit()
    return jsonify({'success': True, 'message': 'Registration successful'}), 201


@auth_bp.route('/api/me', methods=['GET'])
@jwt_required()
def me():
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    if not user:
        abort(404)
    profile = None
    if user.role == 'STUDENT' and user.student_profile:
        profile = user.student_profile.to_dict()
    elif user.role == 'COMPANY' and user.company_profile:
        profile = user.company_profile.to_dict()
    return jsonify({'user': user.to_dict(), 'profile': profile}), 200
