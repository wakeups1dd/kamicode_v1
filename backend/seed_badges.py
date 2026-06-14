import os
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import Badge

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    initial_badges = [
        {"name": "First Blood", "description": "Solve your first problem.", "icon_name": "Swords", "condition_type": "total_solves", "condition_value": 1},
        {"name": "On Fire", "description": "Reach a 3-day streak.", "icon_name": "Flame", "condition_type": "streak", "condition_value": 3},
        {"name": "Gladiator", "description": "Win your first Arena match.", "icon_name": "Trophy", "condition_type": "arena_wins", "condition_value": 1},
        {"name": "Arena Champion", "description": "Win 5 Arena matches.", "icon_name": "Crown", "condition_type": "arena_wins", "condition_value": 5},
        {"name": "Code Master", "description": "Solve 10 problems total.", "icon_name": "Star", "condition_type": "total_solves", "condition_value": 10},
    ]

    for b in initial_badges:
        existing = db.query(Badge).filter(Badge.name == b["name"]).first()
        if not existing:
            badge = Badge(**b)
            db.add(badge)
    
    db.commit()
    db.close()
    print("Seeded badges.")

if __name__ == "__main__":
    seed()
