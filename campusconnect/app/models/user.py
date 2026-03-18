from app import db
from datetime import datetime, timezone


class User(db.Model):
    __tablename__ = 'users'

    user_id   = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email     = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password  = db.Column(db.String(255), nullable=False)
    role      = db.Column(db.Enum('ADMIN', 'STUDENT', 'COMPANY'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    student_profile = db.relationship('Student', backref='user', uselist=False,
                                       cascade='all, delete-orphan')
    company_profile = db.relationship('Company', backref='user', uselist=False,
                                       cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'user_id':    self.user_id,
            'email':      self.email,
            'role':       self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
