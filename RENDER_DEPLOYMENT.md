# Hosting Placify-AI on Render

This guide explains how to deploy Placify-AI to **Render** (<https://render.com>).

---

## Architecture Overview

Placify-AI contains:
1. **Web Service (Node.js + React SPA + SQLite)**: The complete placement preparation platform, including:
   - 270+ DSA coding problems with an interactive coding arena
   - Learning tracks & quizzes
   - AI Mock Interview simulator
   - Resume Analyzer & Scorecard
   - Contests & Leaderboards
   - Community Discussion Forums
   - Career Roadmaps & Company Prep Tracks
   - Built-in heuristics & fallbacks for when the ML microservice is offline
2. **Optional ML Microservice (FastAPI + PyTorch + FAISS)**: High-precision embedding-based mentor and ML-based readiness models. *(Requires >= 1 GB RAM, suitable for Render Starter tier or self-hosted).*

> [!TIP]
> The Web Service runs comfortably within **Render's Free Tier** (512 MB RAM) with zero monthly cost!

---

## Method 1: Instant Blueprint Deployment (Recommended)

Render Blueprints use the [`render.yaml`](./render.yaml) file included in this repository to configure everything automatically.

1. **Push your latest changes to GitHub** (if not already pushed).
2. Go to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** in the top navigation bar and select **Blueprint**.
4. Connect your GitHub repository: `MONISH581/Placify-AI`.
5. Render will automatically detect [`render.yaml`](./render.yaml).
6. Click **Apply**:
   - Render will generate secure random values for `JWT_SECRET` and `INTERNAL_API_KEY`.
   - The build command (`npm run build:render`) will run Prisma schema migrations, seed all 270+ problems, and bundle both the client and server.
7. Your app will be live at `https://placify-ai-xxxx.onrender.com` in 2–3 minutes!

---

## Method 2: Manual Web Service Setup

If you prefer to configure the Web Service manually via Render's Web UI:

1. Go to [Render Dashboard](https://dashboard.render.com) > **New +** > **Web Service**.
2. Connect repository: `MONISH581/Placify-AI`.
3. Configure settings:
   - **Name**: `placify-ai`
   - **Region**: Any (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm run build:render
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: `Free`
4. Expand **Advanced** and add the following **Environment Variables**:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimisations |
| `HOST` | `0.0.0.0` | Binds to all network interfaces on Render |
| `DATABASE_URL` | `file:./dev.db` | Embedded SQLite database file |
| `JWT_SECRET` | *(click "Generate" or enter a 64-char string)* | Signs authentication tokens |
| `INTERNAL_API_KEY` | *(click "Generate" or enter a 32-char string)* | Shared internal service secret |
| `CODE_RUNNER` | `local` | Enables JS and Python execution in sandboxed child processes |
| `ALLOWED_ORIGINS` | `*` | Allows cross-origin API calls |
| `SEED_DEMO_DATA` | `true` | Seeds the pre-built student and admin demo accounts |
| `GEMINI_API_KEY` | *(Optional)* | Your Google Gemini API key for AI reviews & mock interviews |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |

5. Under **Health Check Path**, enter:
   ```text
   /api/health
   ```
6. Click **Deploy Web Service**.

---

## Demo Accounts

When `SEED_DEMO_DATA=true` is set, the following accounts are ready to use immediately:

| Role | Email | Username | Password |
| :--- | :--- | :--- | :--- |
| **Student** | `student@placify.com` | `student` | `student123` |
| **Admin** | `admin@placify.com` | `admin` | `admin123` |

New users can also register freely on the `/login` page.

---

## Code Execution Options

- **Local Runner (`CODE_RUNNER=local`)**: Runs JavaScript and Python submissions using Node.js permission isolation and Python audit hooks in temporary sandboxes.
- **Judge0 (`CODE_RUNNER=judge0`)**: To support all 5 languages (JS, Python, Java, C++, C) in production, create a free account on RapidAPI Judge0 and set:
  - `CODE_RUNNER=judge0`
  - `JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com`
  - `JUDGE0_API_KEY=your_rapidapi_key`
  - `JUDGE0_API_HOST=judge0-ce.p.rapidapi.com`
- **Disabled (`CODE_RUNNER=disabled`)**: Turns off code execution while keeping all problem descriptions, learning modules, quizzes, and interview features active.

---

## Deploying the Python ML Microservice (Optional)

If you have a Render Starter plan (with >= 1 GB RAM):
1. In [`render.yaml`](./render.yaml), uncomment the `placify-ml` service block.
2. Under `placify-ai`, set `ML_SERVICE_URL` to the internal URL of `placify-ml` (e.g., `http://placify-ml:8000`).
3. Commit and apply the blueprint.
