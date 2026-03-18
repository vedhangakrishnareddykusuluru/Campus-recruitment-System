from app import db
from datetime import datetime, timezone


class Application(db.Model):
    __tablename__ = 'applications'
    __table_args__ = (
        db.UniqueConstraint('student_id', 'job_id', name='uq_student_job'),
        db.Index('idx_student_id', 'student_id'),
        db.Index('idx_job_id', 'job_id'),
    )

    application_id   = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id       = db.Column(db.Integer, db.ForeignKey('students.student_id', ondelete='CASCADE'),
                                  nullable=False)
    job_id           = db.Column(db.Integer, db.ForeignKey('jobs.job_id', ondelete='CASCADE'),
                                  nullable=False)
    status           = db.Column(db.Enum('Applied', 'Under Review', 'Selected', 'Rejected'),
                                  nullable=False, default='Applied')
    application_date = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at       = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                                 onupdate=lambda: datetime.now(timezone.utc))
    notes            = db.Column(db.Text, nullable=True)

    def to_dict(self):
        d = {
            'application_id':   self.application_id,
            'student_id':       self.student_id,
            'job_id':           self.job_id,
            'status':           self.status,
            'application_date': self.application_date.isoformat() if self.application_date else None,
            'updated_at':       self.updated_at.isoformat() if self.updated_at else None,
            'notes':            self.notes,
        }
        if self.student:
            d['student_name']  = self.student.full_name
            d['department']    = self.student.department
            d['cgpa']          = self.student.cgpa
            d['student_email'] = self.student.user.email if self.student.user else None
        if self.job:
            d['job_title']     = self.job.job_title
            d['company_name']  = self.job.company.company_name if self.job.company else None
        return d
