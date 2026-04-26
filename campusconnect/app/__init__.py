import os
from urllib.parse import quote_plus
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # ── Configuration ──────────────────────────────────────────────────────────
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # session-like for demo

    use_sqlite = os.getenv('USE_SQLITE', 'True').lower() == 'true'
    if use_sqlite:
        basedir = os.path.abspath(os.path.dirname(__file__))
        app.config['SQLALCHEMY_DATABASE_URI'] = (
            f"sqlite:///{os.path.join(basedir, '..', 'campusconnect.db')}"
        )
    else:
        db_user = quote_plus(os.getenv('DB_USER', ''))
        db_password = quote_plus(os.getenv('DB_PASSWORD', ''))
        app.config['SQLALCHEMY_DATABASE_URI'] = (
            f"mysql+pymysql://{db_user}:{db_password}"
            f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
        )

    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    if not use_sqlite:
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_pre_ping': True,
            'pool_recycle': 300,
        }

    # ── Extensions ─────────────────────────────────────────────────────────────
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app, supports_credentials=True)

    # ── Register Blueprints ────────────────────────────────────────────────────
    from app.routes.auth_routes import auth_bp
    from app.routes.student_routes import student_bp
    from app.routes.company_routes import company_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.job_routes import job_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(student_bp, url_prefix='/student')
    app.register_blueprint(company_bp, url_prefix='/company')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(job_bp, url_prefix='/jobs')

    # ── Main page route ────────────────────────────────────────────────────────
    from flask import redirect, url_for
    @app.route('/')
    def index():
        return redirect(url_for('auth.login_page'))

    # ── Create tables ──────────────────────────────────────────────────────────
    with app.app_context():
        db.create_all()
        _seed_admin(app)

    return app


def _seed_admin(app):
    """Create default admin account if not exists."""
    from app.models.user import User
    from app import bcrypt
    with app.app_context():
        if not User.query.filter_by(email='admin@campusconnect.com').first():
            admin = User(
                email='admin@campusconnect.com',
                password=bcrypt.generate_password_hash('Admin@123').decode('utf-8'),
                role='ADMIN'
            )
            db.session.add(admin)
            db.session.commit()
