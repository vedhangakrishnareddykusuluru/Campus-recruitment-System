from flask import Blueprint, request, jsonify, render_template, abort
from app import db
from app.models.user import User
from app.models.student import Student
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)


def _require_admin():
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    if not user:
        abort(404)
    if user.role != 'ADMIN':
        return None, (jsonify({'success': False, 'message': 'Admin access required'}), 403)
    return user, None


@admin_bp.route('/dashboard')
def dashboard():
    return render_template('admin/dashboard.html')


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    _, err = _require_admin()
    if err:
        return err

    total_students    = Student.query.count()
    total_companies   = Company.query.count()
    total_jobs        = Job.query.count()
    total_apps        = Application.query.count()
    selected_count    = Application.query.filter_by(status='Selected').count()
    rejected_count    = Application.query.filter_by(status='Rejected').count()
    applied_count     = Application.query.filter_by(status='Applied').count()
    review_count      = Application.query.filter_by(status='Under Review').count()

    # Top hiring companies
    top_companies = db.session.query(
        Company.company_name,
        func.count(Application.application_id).label('hires')
    ).join(Job, Job.company_id == Company.company_id)\
     .join(Application, Application.job_id == Job.job_id)\
     .filter(Application.status == 'Selected')\
     .group_by(Company.company_id)\
     .order_by(func.count(Application.application_id).desc())\
     .limit(5).all()

    # Applications by department
    dept_stats = db.session.query(
        Student.department,
        func.count(Application.application_id).label('count')
    ).join(Application, Application.student_id == Student.student_id)\
     .group_by(Student.department)\
     .order_by(func.count(Application.application_id).desc())\
     .all()

    return jsonify({
        'overview': {
            'total_students':  total_students,
            'total_companies': total_companies,
            'total_jobs':      total_jobs,
            'total_apps':      total_apps,
        },
        'application_status': {
            'applied':      applied_count,
            'under_review': review_count,
            'selected':     selected_count,
            'rejected':     rejected_count,
        },
        'top_hiring_companies': [{'name': c[0], 'hires': c[1]} for c in top_companies],
        'dept_stats':           [{'dept': d[0], 'count': d[1]} for d in dept_stats],
    }), 200


@admin_bp.route('/students', methods=['GET'])
@jwt_required()
def all_students():
    _, err = _require_admin()
    if err:
        return err
    page     = request.args.get('page', 1, type=int)
    search   = request.args.get('search', '').strip()
    q = Student.query
    if search:
        q = q.filter(
            db.or_(
                Student.first_name.ilike(f'%{search}%'),
                Student.last_name.ilike(f'%{search}%'),
                Student.department.ilike(f'%{search}%'),
            )
        )
    students = q.paginate(page=page, per_page=20, error_out=False)
    return jsonify({'students': [s.to_dict() for s in students.items], 'total': students.total}), 200


@admin_bp.route('/companies', methods=['GET'])
@jwt_required()
def all_companies():
    _, err = _require_admin()
    if err:
        return err
    companies = Company.query.all()
    return jsonify([c.to_dict() for c in companies]), 200


@admin_bp.route('/applications', methods=['GET'])
@jwt_required()
def all_applications():
    _, err = _require_admin()
    if err:
        return err
    page = request.args.get('page', 1, type=int)
    apps = Application.query.order_by(Application.application_date.desc()).paginate(
        page=page, per_page=20, error_out=False
    )
    return jsonify({'applications': [a.to_dict() for a in apps.items], 'total': apps.total}), 200
