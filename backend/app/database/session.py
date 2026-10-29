from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.database.base import Base

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args={"connect_timeout": 30},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import app.models  # noqa: F401

    inspector = inspect(engine)
    if inspector.has_table('users'):
        with engine.begin() as conn:
            existing_columns = {col['name'] for col in inspector.get_columns('users')}
            expected_columns = {
                'phone', 'location', 'linkedin', 'github', 'skills', 'about',
                'application_draft', 'application_step', 'application_submitted',
                'application_submitted_at', 'application_id', 'profile_photo', 'resume_url',
                'resume_filename', 'degree_certificate_url', 'degree_certificate_filename',
                'aadhaar_number', 'pan_number', 'date_of_birth', 'gender',
                'current_address', 'permanent_address', 'emergency_contact', 'is_active',
                'college', 'university', 'degree', 'branch', 'graduation_year', 'cgpa',
                'tenth_percentage', 'twelfth_percentage', 'is_fresher', 'company',
                'designation', 'employment_type', 'start_date', 'end_date',
                'experience_description', 'projects', 'achievements', 'certifications',
                'account_holder_name', 'bank_name', 'account_number', 'ifsc_code',
                'bank_branch', 'upi_id', 'blood_group', 'nationality', 'languages_known',
                'marital_status', 'passport_number', 'pin_code', 'verification_status',
                'verification_rejection_reason', 'account_status', 'is_deleted',
                'failed_login_attempts', 'last_login', 'last_failed_login',
                'account_locked_until', 'password_updated_at', 'remember_token'
            }
            missing = expected_columns - existing_columns
            for column in missing:
                if column == 'phone':
                    conn.execute(text('ALTER TABLE users ADD COLUMN phone VARCHAR(30)'))
                elif column == 'location':
                    conn.execute(text('ALTER TABLE users ADD COLUMN location VARCHAR(150)'))
                elif column == 'linkedin':
                    conn.execute(text('ALTER TABLE users ADD COLUMN linkedin VARCHAR(255)'))
                elif column == 'github':
                    conn.execute(text('ALTER TABLE users ADD COLUMN github VARCHAR(255)'))
                elif column == 'skills':
                    conn.execute(text('ALTER TABLE users ADD COLUMN skills VARCHAR(255)'))
                elif column == 'about':
                    conn.execute(text('ALTER TABLE users ADD COLUMN about TEXT'))
                elif column == 'application_draft':
                    conn.execute(text('ALTER TABLE users ADD COLUMN application_draft TEXT'))
                elif column == 'application_step':
                    conn.execute(text('ALTER TABLE users ADD COLUMN application_step INTEGER DEFAULT 0'))
                elif column == 'application_submitted':
                    conn.execute(text('ALTER TABLE users ADD COLUMN application_submitted BOOLEAN DEFAULT FALSE'))
                elif column == 'application_submitted_at':
                    conn.execute(text('ALTER TABLE users ADD COLUMN application_submitted_at TIMESTAMP'))
                elif column == 'application_id':
                    conn.execute(text('ALTER TABLE users ADD COLUMN application_id VARCHAR(64)'))
                elif column == 'profile_photo':
                    conn.execute(text('ALTER TABLE users ADD COLUMN profile_photo VARCHAR(1024)'))
                elif column == 'resume_url':
                    conn.execute(text('ALTER TABLE users ADD COLUMN resume_url VARCHAR(1024)'))
                elif column == 'resume_filename':
                    conn.execute(text('ALTER TABLE users ADD COLUMN resume_filename VARCHAR(255)'))
                elif column == 'degree_certificate_url':
                    conn.execute(text('ALTER TABLE users ADD COLUMN degree_certificate_url VARCHAR(1024)'))
                elif column == 'degree_certificate_filename':
                    conn.execute(text('ALTER TABLE users ADD COLUMN degree_certificate_filename VARCHAR(255)'))
                elif column == 'aadhaar_number':
                    conn.execute(text('ALTER TABLE users ADD COLUMN aadhaar_number VARCHAR(32)'))
                elif column == 'pan_number':
                    conn.execute(text('ALTER TABLE users ADD COLUMN pan_number VARCHAR(16)'))
                elif column == 'date_of_birth':
                    conn.execute(text('ALTER TABLE users ADD COLUMN date_of_birth TIMESTAMP'))
                elif column == 'gender':
                    conn.execute(text('ALTER TABLE users ADD COLUMN gender VARCHAR(24)'))
                elif column == 'current_address':
                    conn.execute(text('ALTER TABLE users ADD COLUMN current_address TEXT'))
                elif column == 'permanent_address':
                    conn.execute(text('ALTER TABLE users ADD COLUMN permanent_address TEXT'))
                elif column == 'pin_code':
                    conn.execute(text('ALTER TABLE users ADD COLUMN pin_code VARCHAR(20)'))
                elif column == 'emergency_contact':
                    conn.execute(text('ALTER TABLE users ADD COLUMN emergency_contact VARCHAR(30)'))
                elif column == 'is_active':
                    conn.execute(text('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE'))
                elif column == 'college':
                    conn.execute(text('ALTER TABLE users ADD COLUMN college VARCHAR(255)'))
                elif column == 'university':
                    conn.execute(text('ALTER TABLE users ADD COLUMN university VARCHAR(255)'))
                elif column == 'degree':
                    conn.execute(text('ALTER TABLE users ADD COLUMN degree VARCHAR(255)'))
                elif column == 'branch':
                    conn.execute(text('ALTER TABLE users ADD COLUMN branch VARCHAR(255)'))
                elif column == 'graduation_year':
                    conn.execute(text('ALTER TABLE users ADD COLUMN graduation_year VARCHAR(50)'))
                elif column == 'cgpa':
                    conn.execute(text('ALTER TABLE users ADD COLUMN cgpa VARCHAR(50)'))
                elif column == 'tenth_percentage':
                    conn.execute(text('ALTER TABLE users ADD COLUMN tenth_percentage VARCHAR(50)'))
                elif column == 'twelfth_percentage':
                    conn.execute(text('ALTER TABLE users ADD COLUMN twelfth_percentage VARCHAR(50)'))
                elif column == 'account_holder_name':
                    conn.execute(text('ALTER TABLE users ADD COLUMN account_holder_name VARCHAR(255)'))
                elif column == 'bank_name':
                    conn.execute(text('ALTER TABLE users ADD COLUMN bank_name VARCHAR(255)'))
                elif column == 'account_number':
                    conn.execute(text('ALTER TABLE users ADD COLUMN account_number VARCHAR(50)'))
                elif column == 'ifsc_code':
                    conn.execute(text('ALTER TABLE users ADD COLUMN ifsc_code VARCHAR(20)'))
                elif column == 'bank_branch':
                    conn.execute(text('ALTER TABLE users ADD COLUMN bank_branch VARCHAR(100)'))
                elif column == 'upi_id':
                    conn.execute(text('ALTER TABLE users ADD COLUMN upi_id VARCHAR(100)'))
                elif column == 'blood_group':
                    conn.execute(text('ALTER TABLE users ADD COLUMN blood_group VARCHAR(10)'))
                elif column == 'nationality':
                    conn.execute(text('ALTER TABLE users ADD COLUMN nationality VARCHAR(100)'))
                elif column == 'languages_known':
                    conn.execute(text('ALTER TABLE users ADD COLUMN languages_known VARCHAR(255)'))
                elif column == 'marital_status':
                    conn.execute(text('ALTER TABLE users ADD COLUMN marital_status VARCHAR(50)'))
                elif column == 'passport_number':
                    conn.execute(text('ALTER TABLE users ADD COLUMN passport_number VARCHAR(50)'))
                elif column == 'is_fresher':
                    conn.execute(text('ALTER TABLE users ADD COLUMN is_fresher BOOLEAN DEFAULT FALSE'))
                elif column == 'company':
                    conn.execute(text('ALTER TABLE users ADD COLUMN company VARCHAR(255)'))
                elif column == 'designation':
                    conn.execute(text('ALTER TABLE users ADD COLUMN designation VARCHAR(255)'))
                elif column == 'employment_type':
                    conn.execute(text('ALTER TABLE users ADD COLUMN employment_type VARCHAR(100)'))
                elif column == 'start_date':
                    conn.execute(text('ALTER TABLE users ADD COLUMN start_date VARCHAR(50)'))
                elif column == 'end_date':
                    conn.execute(text('ALTER TABLE users ADD COLUMN end_date VARCHAR(50)'))
                elif column == 'experience_description':
                    conn.execute(text('ALTER TABLE users ADD COLUMN experience_description TEXT'))
                elif column == 'projects':
                    conn.execute(text('ALTER TABLE users ADD COLUMN projects TEXT'))
                elif column == 'achievements':
                    conn.execute(text('ALTER TABLE users ADD COLUMN achievements TEXT'))
                elif column == 'certifications':
                    conn.execute(text('ALTER TABLE users ADD COLUMN certifications TEXT'))
                elif column == 'verification_status':
                    conn.execute(text("ALTER TABLE users ADD COLUMN verification_status VARCHAR(50) DEFAULT 'Pending'"))
                elif column == 'verification_rejection_reason':
                    conn.execute(text("ALTER TABLE users ADD COLUMN verification_rejection_reason TEXT"))
                elif column == 'account_status':
                    conn.execute(text("ALTER TABLE users ADD COLUMN account_status VARCHAR(50) DEFAULT 'Active'"))
                elif column == 'is_deleted':
                    conn.execute(text('ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE'))
                elif column == 'failed_login_attempts':
                    conn.execute(text('ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0'))
                elif column == 'last_login':
                    conn.execute(text('ALTER TABLE users ADD COLUMN last_login TIMESTAMP'))
                elif column == 'last_failed_login':
                    conn.execute(text('ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP'))
                elif column == 'account_locked_until':
                    conn.execute(text('ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP'))
                elif column == 'password_updated_at':
                    conn.execute(text('ALTER TABLE users ADD COLUMN password_updated_at TIMESTAMP'))
                elif column == 'remember_token':
                    conn.execute(text('ALTER TABLE users ADD COLUMN remember_token VARCHAR(255)'))

    if inspector.has_table('employees'):
        existing_columns = {col['name'] for col in inspector.get_columns('employees')}
        if 'verification_status' not in existing_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE employees ADD COLUMN verification_status VARCHAR(50) DEFAULT 'Pending'"))
        if 'verification_rejection_reason' not in existing_columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE employees ADD COLUMN verification_rejection_reason TEXT"))

    if inspector.has_table('ai_interviews'):
        existing_columns = {col['name'] for col in inspector.get_columns('ai_interviews')}
        with engine.begin() as conn:
            if 'summary' not in existing_columns:
                conn.execute(text("ALTER TABLE ai_interviews ADD COLUMN summary TEXT"))
            if 'transcript' not in existing_columns:
                conn.execute(text("ALTER TABLE ai_interviews ADD COLUMN transcript TEXT"))
            if 'completed_at' not in existing_columns:
                conn.execute(text("ALTER TABLE ai_interviews ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE"))


    print("Registered tables:", list(Base.metadata.tables.keys()))
    print("Metadata object:", Base.metadata)

    Base.metadata.create_all(bind=engine)

