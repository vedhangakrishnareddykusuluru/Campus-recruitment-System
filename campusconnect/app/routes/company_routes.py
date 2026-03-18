from flask import Blueprint, request, jsonify, render_template, abort
from app import db
from app.models.application import Application
from app.models.job import Job
from app.models.company import Company
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity

company_bp = Blueprint('company', __name__)


@company_bp.route('/dashboard')
def dashboard():
    return render_template('company/dashboard.html')


@company_bp.route('/jobs', methods=['GET'])
@jwt_required()
def company_jobs():
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    if not user:
        abort(404)
    if user.role != 'COMPANY':
        return jsonify({'success': False, 'message': 'Forbidden'}), 403
    company = user.company_profile
    jobs = Job.query.filter_by(company_id=company.company_id).order_by(Job.created_at.desc()).all()
    return jsonify([j.to_dict() for j in jobs]), 200


@company_bp.route('/applicants/<int:job_id>', methods=['GET'])
@jwt_required()
def job_applicants(job_id):
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    if not user:
        abort(404)
    if user.role != 'COMPANY':
        return jsonify({'success': False, 'message': 'Forbidden'}), 403

    job = db.session.get(Job, job_id)
    if not job:
        abort(404)
    if job.company.user_id != uid:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    apps = Application.query.filter_by(job_id=job_id).all()
    return jsonify([a.to_dict() for a in apps]), 200


@company_bp.route('/update-status/<int:app_id>', methods=['PUT'])
@jwt_required()
def update_status(app_id):
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    if not user:
        abort(404)
    if user.role != 'COMPANY':
        return jsonify({'success': False, 'message': 'Forbidden'}), 403

    app_obj = db.session.get(Application, app_id)
    if not app_obj:
        abort(404)
    if app_obj.job.company.user_id != uid:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    data   = request.get_json()
    status = data.get('status')
    if status not in ('Applied', 'Under Review', 'Selected', 'Rejected'):
        return jsonify({'success': False, 'message': 'Invalid status'}), 400

    app_obj.status = status
    app_obj.notes  = data.get('notes', app_obj.notes)
    db.session.commit()
    return jsonify({'success': True, 'application': app_obj.to_dict()}), 200


@company_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    uid     = int(get_jwt_identity())
    user    = db.session.get(User, uid)
    if not user:
        abort(404)
    company = user.company_profile
    if not company:
        return jsonify({'success': False, 'message': 'Profile not found'}), 404
    return jsonify(company.to_dict()), 200
