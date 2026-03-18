from app import db
from datetime import datetime, timezone


class Job(db.Model):
    __tablename__ = 'jobs'

    job_id               = db.Column(db.Integer, primary_key=True, autoincrement=True)
    company_id           = db.Column(db.Integer, db.ForeignKey('companies.company_id', ondelete='CASCADE'),
                                      nullable=False, index=True)
    job_title            = db.Column(db.String(120), nullable=False)
    job_description      = db.Column(db.Text, nullable=False)
    salary               = db.Column(db.Float, nullable=False)
    min_cgpa             = db.Column(db.Float, nullable=False, default=0.0)
    location             = db.Column(db.String(120), nullable=False)
    application_deadline = db.Column(db.Date, nullable=False)
    created_at           = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at           = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                                     onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    applications = db.relationship('Application', backref='job', cascade='all, delete-orphan')

    @property
    def is_open(self):
        from datetime import date
        return self.application_deadline >= date.today()

    def to_dict(self, include_company=True):
        d = {
            'job_id':               self.job_id,
            'company_id':           self.company_id,
            'job_title':            self.job_title,
            'job_description':      self.job_description,
            'salary':               self.salary,
            'min_cgpa':             self.min_cgpa,
            'location':             self.location,
            'application_deadline': str(self.application_deadline),
            'is_open':              self.is_open,
            'applicant_count':      len(self.applications),
            'created_at':           self.created_at.isoformat() if self.created_at else None,
        }
        if include_company and self.company:
            d['company_name'] = self.company.company_name
            d['industry']     = self.company.industry
        return d
