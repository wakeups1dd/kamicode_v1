from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import Problem, Submission, User, AIAnalysis  # noqa: F401 — ensures tables are registered
from routers import problems, submissions, analysis

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KamiCode API",
    description="API for the KamiCode competitive programming platform",
    version="2.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(problems.router)
app.include_router(submissions.router)
app.include_router(analysis.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to KamiCode API", "version": "2.0.0"}
