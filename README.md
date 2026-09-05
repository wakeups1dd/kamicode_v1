# KamiCode

KamiCode is an AI-powered competitive programming and coding league platform. It features a modern, real-time web interface and a robust backend capable of code execution and AI-assisted analysis.

## 🏗 Architecture

The project is structured as a monorepo with two main components:

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React 19)
- **Authentication**: [Clerk](https://clerk.com/)
- **Database & Real-time State**: [Convex](https://www.convex.dev/) (100% Serverless DB)
- **Styling**: Tailwind CSS & shadcn/ui
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Code Execution**: Integrations for running code via Piston, Judge0, or JDoodle.
- **AI Analysis**: Google Gemini (or OpenAI) integration for intelligent code complexity analysis and feedback.
- **API Endpoints**: Routers for problems, submissions, analysis, cohorts, leaderboard, streaks, arena, and badges.

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Python (v3.10+)
- Docker (optional, for backend)
- Convex CLI
- Clerk Account (for Auth)
- Google Gemini API Key (free from https://aistudio.google.com/) or OpenAI API Key

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (copy `.env.local.example` to `.env.local` and fill in).
4. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup (Local)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Set up environment variables (copy `.env.example` to `.env` and fill in).
4. Run the API:
   ```bash
   uvicorn main:app --reload
   ```

### Backend Setup (Docker)
Alternatively, you can run the backend using Docker Compose from the root directory:
```bash
docker-compose up --build
```
The backend will be available at `http://localhost:8000`.

## 📁 Directory Structure
- `/frontend`: Next.js application, Convex schemas, and UI components.
- `/backend`: FastAPI application, code execution clients, and route handlers.
- `docker-compose.yml`: Docker configuration for the backend.

## 🛠 Features
- **Real-time Arenas**: Compete with others in real-time.
- **AI Analysis**: Get feedback on your submissions.
- **Leaderboards & Streaks**: Track your progress.
- **Cohorts & Friends**: Learn and compete together.
