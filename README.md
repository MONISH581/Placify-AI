# Placify-AI — SDE Placement & AI Readiness Platform

Placify-AI is a high-performance placement readiness platform integrating a **Node.js/Express TypeScript backend**, **Prisma ORM with SQLite**, and a **Python FastAPI ML Microservice** serving trained Machine Learning models and FAISS vector retrieval.

---

## 🏗️ Core System Architecture

```
Frontend (React + Vite)
       │
       ▼
Node.js Express Backend (Port 3000)
       ├── Prisma ORM ──► SQLite Database (prisma/dev.db)
       └── ML Client   ──► Python FastAPI Service (Port 8000)
                              ├── placement_model.pkl
                              ├── difficulty_model.pkl
                              ├── recommender_model.pkl
                              └── FAISS Vector RAG Index (192 vectors)
```

- **Node.js API Server**: Port 3000 (`server.ts`)
- **Python ML Microservice**: Port 8000 (`ml_service/main.py`)
- **Optional AI Engine**: Port 8001 (`ai-engine/app/main.py`)
- **Database**: SQLite `prisma/dev.db` managed via Prisma ORM

---

## 🚀 Quick Setup & Execution

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
PORT=3000
ML_SERVICE_URL=http://localhost:8000
AI_ENGINE_URL=http://localhost:8001
JWT_SECRET=placify_super_secret_jwt_key_2026
GEMINI_API_KEY=your_optional_gemini_key
```

### 2. Install Dependencies & Database Setup
```bash
npm install
npx prisma db push
npx prisma generate
npx tsx migrate.ts
```

### 3. Start Microservices

#### Start Python ML Microservice (Port 8000):
```bash
python ml_service/main.py
```

#### Start Node.js Backend (Port 3000):
```bash
npm run dev
```

---

## 🧪 Running Verification Tests

Run the full integration test suite covering Authentication, Database Persistence, ML Readiness, Recommendations, Coding Submissions, Mock Interviews, and RAG Assistant:

```bash
npx tsx scratch/test_all_phases.ts
```

---

## 🔐 Key Security & Architectural Enhancements

1. **Authoritative Persistence**: All user profiles, problems, code submissions, mock interviews, and roadmaps are stored in `prisma/dev.db` using Prisma ORM.
2. **Secure Auth & Password Hashing**: Passwords are hashed using PBKDF2-SHA512 with random salts and timing-safe comparison. Admin privileges are derived from trusted database role fields.
3. **Consolidated Python ML Microservice**: ML endpoints (`/ml/placement-score`, `/ml/recommend-problems`, `/ml/interview-score`, `/rag/mentor-ask`) run on port 8000 without port collisions.
4. **Code Judge & AI Integration**: Updated Gemini model identifier to `gemini-1.5-flash`, fixed variable shadowing in review feedback, and isolated untrusted execution boundaries.
