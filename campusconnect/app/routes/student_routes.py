from flask import Blueprint, request, jsonify, render_template, abort
from app import db
from app.models.application import Application
from app.models.job import Job
from app.models.student import Student
from app.models.user import User
from flask_jwt_extended import jwt_required, get_jwt_identity

student_bp = Blueprint('student', __name__)


@student_bp.route('/dashboard')
def dashboard():
    return render_template('student/dashboard.html')


@student_bp.route('/apply/<int:job_id>', methods=['POST'])
@jwt_required()
def apply(job_id):
    uid     = int(get_jwt_identity())
    user    = db.session.get(User, uid)
    if not user:
        abort(404)
    if user.role != 'STUDENT':
        return jsonify({'success': False, 'message': 'Only students can apply'}), 403

    student = user.student_profile
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404

    job = db.session.get(Job, job_id)
    if not job:
        abort(404)
    if not job.is_open:
        return jsonify({'success': False, 'message': 'Application deadline has passed'}), 400

    if student.cgpa < job.min_cgpa:
        return jsonify({
            'success': False,
            'message': f'Minimum CGPA required is {job.min_cgpa}. Your CGPA: {student.cgpa}'
        }), 400

    existing = Application.query.filter_by(
        student_id=student.student_id, job_id=job_id
    ).first()
    if existing:
        return jsonify({'success': False, 'message': 'Already applied for this job'}), 409

    app_obj = Application(student_id=student.student_id, job_id=job_id)
    db.session.add(app_obj)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Applied successfully!', 'application': app_obj.to_dict()}), 201


@student_bp.route('/applications', methods=['GET'])
@jwt_required()
def my_applications():
    uid     = int(get_jwt_identity())
    user    = db.session.get(User, uid)
    if not user:
        abort(404)
    if user.role != 'STUDENT':
        return jsonify({'success': False, 'message': 'Forbidden'}), 403

    student = user.student_profile
    apps    = Application.query.filter_by(student_id=student.student_id).order_by(
        Application.application_date.desc()
    ).all()
    return jsonify([a.to_dict() for a in apps]), 200


@student_bp.route('/profile', methods=['GET'])
@jwt_required()
def profile():
    uid     = int(get_jwt_identity())
    user    = db.session.get(User, uid)
    if not user:
        abort(404)
    student = user.student_profile
    if not student:
        return jsonify({'success': False, 'message': 'Profile not found'}), 404
    return jsonify(student.to_dict()), 200
