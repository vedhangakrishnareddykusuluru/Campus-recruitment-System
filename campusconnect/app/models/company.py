from app import db
from datetime import datetime, timezone


class Company(db.Model):
    __tablename__ = 'companies'

    company_id   = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'),
                              unique=True, nullable=False)
    company_name = db.Column(db.String(120), nullable=False)
    location     = db.Column(db.String(120), nullable=False)
    industry     = db.Column(db.String(80), nullable=False)
    created_at   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                             onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    jobs = db.relationship('Job', backref='company', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'company_id':   self.company_id,
            'user_id':      self.user_id,
            'company_name': self.company_name,
            'location':     self.location,
            'industry':     self.industry,
            'email':        self.user.email if self.user else None,
            'job_count':    len(self.jobs),
        }
