from flask import Blueprint, request, jsonify, render_template, abort
from app import db
from app.models.job import Job
from app.models.company import Company
from app.models.application import Application
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from datetime import date

job_bp = Blueprint('jobs', __name__)


@job_bp.route('/', methods=['GET'])
def list_jobs():
    """Public job listing with search, filter and pagination."""
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search   = request.args.get('search', '').strip()
    industry = request.args.get('industry', '').strip()
    location = request.args.get('location', '').strip()
    min_sal  = request.args.get('min_salary', 0, type=float)
    open_only = request.args.get('open_only', 'true').lower() == 'true'

    q = Job.query.join(Company)

    if search:
        q = q.filter(
            db.or_(
                Job.job_title.ilike(f'%{search}%'),
                Job.job_description.ilike(f'%{search}%'),
                Company.company_name.ilike(f'%{search}%'),
            )
        )
    if industry:
        q = q.filter(Company.industry.ilike(f'%{industry}%'))
    if location:
        q = q.filter(Job.location.ilike(f'%{location}%'))
    if min_sal:
        q = q.filter(Job.salary >= min_sal)
    if open_only:
        q = q.filter(Job.application_deadline >= date.today())

    total  = q.count()
    jobs   = q.order_by(Job.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'jobs':       [j.to_dict() for j in jobs.items],
        'total':      total,
        'page':       page,
        'pages':      jobs.pages,
        'per_page':   per_page,
    }), 200


@job_bp.route('/<int:job_id>', methods=['GET'])
def get_job(job_id):
    job = db.session.get(Job, job_id)
    if not job:
        abort(404)
    return jsonify(job.to_dict()), 200


@job_bp.route('/post', methods=['POST'])
@jwt_required()
def post_job():
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    if not user:
        abort(404)
    if user.role != 'COMPANY':
        return jsonify({'success': False, 'message': 'Only companies can post jobs'}), 403

    company = user.company_profile
    if not company:
        return jsonify({'success': False, 'message': 'Company profile not found'}), 404

    data = request.get_json()
    required = ['job_title', 'job_description', 'salary', 'location', 'application_deadline']
    for f in required:
        if not data.get(f):
            return jsonify({'success': False, 'message': f'{f} is required'}), 400

    try:
        deadline = date.fromisoformat(data['application_deadline'])
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid deadline format (YYYY-MM-DD)'}), 400

    job = Job(
        company_id           = company.company_id,
        job_title            = data['job_title'],
        job_description      = data['job_description'],
        salary               = float(data['salary']),
        min_cgpa             = float(data.get('min_cgpa', 0)),
        location             = data['location'],
        application_deadline = deadline,
    )
    db.session.add(job)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Job posted', 'job': job.to_dict()}), 201


@job_bp.route('/<int:job_id>', methods=['DELETE'])
@jwt_required()
def delete_job(job_id):
    uid  = int(get_jwt_identity())
    user = db.session.get(User, uid)
    if not user:
        abort(404)
    job  = db.session.get(Job, job_id)
    if not job:
        abort(404)

    if user.role != 'COMPANY' or job.company.user_id != uid:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    db.session.delete(job)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Job deleted'}), 200


@job_bp.route('/industries', methods=['GET'])
def get_industries():
    industries = db.session.query(Company.industry).distinct().all()
    return jsonify([i[0] for i in industries]), 200
