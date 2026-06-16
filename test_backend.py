import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base
from backend.models import Cohort, CohortMember, User, DailyChallenge

engine = create_engine('sqlite:///backend/kamicode.db')
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

user = db.query(User).first()
if not user:
    print("No user found")
    sys.exit(1)

cohort = Cohort(name="Test Cohort", slug="test-cohort", invite_code="TEST12", created_by=user.id)
db.add(cohort)
db.commit()
db.refresh(cohort)

member = CohortMember(cohort_id=cohort.id, user_id=user.id, role="admin")
db.add(member)
db.commit()

print(f"Created cohort {cohort.id}")

db.query(DailyChallenge).filter(DailyChallenge.cohort_id == cohort.id).delete()
db.query(CohortMember).filter(CohortMember.cohort_id == cohort.id).delete()
db.delete(cohort)
try:
    db.commit()
    print("Deleted successfully")
except Exception as e:
    print(f"Error deleting: {e}")
