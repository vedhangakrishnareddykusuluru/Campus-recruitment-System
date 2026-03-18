from app import db
from datetime import datetime, date, timezone


class Student(db.Model):
    __tablename__ = 'students'

    student_id    = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'),
                               unique=True, nullable=False)
    first_name    = db.Column(db.String(60), nullable=False)
    last_name     = db.Column(db.String(60), nullable=False)
    department    = db.Column(db.String(100), nullable=False)
    cgpa          = db.Column(db.Float, nullable=False)
    phone         = db.Column(db.String(15), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    applications = db.relationship('Application', backref='student',
                                    cascade='all, delete-orphan')

    @property
    def age(self):
        """Derived attribute – calculated from date_of_birth."""
        today = date.today()
        dob   = self.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def to_dict(self):
        return {
            'student_id':    self.student_id,
            'user_id':       self.user_id,
            'full_name':     self.full_name,
            'first_name':    self.first_name,
            'last_name':     self.last_name,
            'department':    self.department,
            'cgpa':          self.cgpa,
            'phone':         self.phone,
            'date_of_birth': str(self.date_of_birth),
            'age':           self.age,
            'email':         self.user.email if self.user else None,
        }
