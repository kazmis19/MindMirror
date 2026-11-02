# MindMirror — Emotional Reflection & Wellbeing Companion

**Problem statement:** HI-05 — Mental Health Screening & Crisis Detection  
**Tagline:** Your emotions. Your patterns. Your space.

MindMirror is a lightweight wellbeing companion that helps people reflect on their feelings through mood check-ins, private journaling, emotion-pattern summaries and guided reflection prompts.

> **Safety boundary:** MindMirror is a wellbeing and self-reflection tool, not a medical device. It does not diagnose, predict suicide risk, provide clinical screening, or replace a qualified professional or emergency service.

## Features
- Daily mood check-in with emotion and sentiment estimation
- Journal entries with reflection prompts
- Dashboard with recent entries and emotion distribution
- Pattern insights based on saved entries
- Supportive reflection chat
- Crisis-language safety response that encourages immediate human support
- Delete individual entries and export saved entries as JSON
- SQLite storage; no account or third-party AI API key required

## Tech stack
- Python 3.10+
- FastAPI + Uvicorn
- SQLite
- HTML, CSS, vanilla JavaScript
- Chart.js (loaded from CDN)

## Run locally (Mac / Windows / Linux)
1. Install Python 3.10 or newer.
2. Open Terminal in this folder.
3. Create and activate a virtual environment:

   **macOS/Linux**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

   **Windows**
   ```powershell
   py -m venv .venv
   .venv\Scripts\activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Start the app:
   ```bash
   uvicorn main:app --reload
   ```
6. Open http://127.0.0.1:8000

API docs are available at http://127.0.0.1:8000/docs

## Deploy on Render
1. Push this folder to a GitHub repository.
2. In Render, choose **New → Web Service** and connect the repository.
3. Use build command `pip install -r requirements.txt`.
4. Use start command `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Deploy and open the generated URL.

The included `render.yaml` can also be used as a Blueprint configuration. For a public demo, use non-sensitive sample data only. The default SQLite database is suitable for a prototype; production deployment should use managed persistent storage and a proper authentication/privacy design.

## Demo flow for judges
1. Open the dashboard and explain the problem.
2. Submit a mood check-in such as: “I felt worried about my presentation today.”
3. Show the detected emotion and reflection prompt.
4. Add a journal entry.
5. Open Insights to show the emotion distribution and recent trend.
6. Ask the companion a reflective question.
7. Demonstrate deletion/export controls.

## How the emotion engine works
The prototype uses a transparent, local keyword-based heuristic to estimate an emotional theme and a simple 1–5 sentiment score. It is intentionally described as an **estimate**, not a validated mental-health screening model. A future version could evaluate a consent-based NLP model against a labelled dataset and report precision, recall, false-positive and false-negative rates before making any screening claims.

## Project structure
```text
MindMirror/
├── main.py
├── requirements.txt
├── Procfile
├── render.yaml
├── README.md
└── static/
    ├── index.html
    ├── style.css
    └── app.js
```

## Important before submission
- Test the full demo locally.
- Replace sample/team details in your presentation.
- Do not claim clinical accuracy, real-time crisis monitoring, counsellor integration, or validated AI screening.
- Do not enter real private journal entries in a public demo.
- Confirm the hackathon's rules on data collection, consent, AI usage and deployment.
