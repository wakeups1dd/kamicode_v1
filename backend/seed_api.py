import requests
from seed import SEED_PROBLEMS

for p in SEED_PROBLEMS:
    if hasattr(p['difficulty'], 'value'):
        diff = p['difficulty'].value
    else:
        diff = p['difficulty']
    
    payload = {
        "title": p["title"],
        "slug": p["slug"],
        "description": p["description"],
        "difficulty": diff,
        "topic": p["topic"],
        "constraints": p["constraints"],
        "examples": p["examples"],
        "test_cases": p["test_cases"],
        "starter_code": p["starter_code"],
        "time_limit_ms": p["time_limit_ms"],
        "memory_limit_kb": p["memory_limit_kb"],
    }
    
    res = requests.post("http://localhost:8000/api/problems/", json=payload)
    if res.status_code == 201:
        print(f"Created: {p['title']}")
    else:
        print(f"Failed {p['title']}: {res.text}")
