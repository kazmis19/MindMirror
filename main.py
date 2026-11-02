from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field 
from typing import Optional
from pathlib import Path
from datetime import datetime, timedelta
import sqlite3, re, os

BASE = Path(__file__).resolve().parent
DB = BASE / "mindmirror.db"
app = FastAPI(title="MindMirror API", version="1.0.0")
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")

EMOTIONS = {
    "happy": ["happy", "joy", "excited", "grateful", "good", "great", "peaceful", "proud", "relieved"],
    "sad": ["sad", "down", "lonely", "empty", "cry", "hopeless", "upset", "low", "disappointed"],
    "anxious": ["anxious", "anxiety", "worried", "worry", "nervous", "panic", "overthink", "scared", "stress"],
    "angry": ["angry", "anger", "irritated", "annoyed", "frustrated", "mad"],
    "tired": ["tired", "exhausted", "drained", "sleepy", "burnt out", "burned out"],
    "calm": ["calm", "relaxed", "okay", "fine", "steady", "content"]
}
POSITIVE = {"happy", "joy", "excited", "grateful", "good", "great", "peaceful", "proud", "relieved", "calm", "relaxed", "content"}
NEGATIVE = {"sad", "lonely", "empty", "hopeless", "upset", "anxious", "worried", "nervous", "panic", "scared", "stress", "angry", "irritated", "annoyed", "frustrated", "tired", "exhausted", "drained"}

CRISIS_TERMS = [
    "want to die", "kill myself", "end my life", "suicide", "hurt myself",
    "self harm", "self-harm", "can't keep myself safe", "cannot keep myself safe"
]

def connect():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    with connect() as con:
        con.execute("""CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,
            text TEXT NOT NULL,
            emotion TEXT,
            score INTEGER,
            created_at TEXT NOT NULL
        )""")


def analyze(text):
    normalized = re.sub(r"\s+", " ", text.lower()).strip()
    words = re.findall(r"[a-z']+", normalized)

    # Basic safety phrase matching (not a clinical risk detector)
    padded = " " + normalized + " "
    crisis = any(term in padded for term in CRISIS_TERMS)

    # Words that can reverse the meaning of an emotion
    negations = {
        "not", "never", "no", "isn't", "wasn't",
        "don't", "doesn't", "didn't", "hardly"
    }

    def is_negated(index):
        previous_words = words[max(0, index - 3):index]
        return any(word in negations for word in previous_words)

    # Count emotion keywords while considering nearby negations
    counts = {}

    for emotion, keywords in EMOTIONS.items():
        count = 0

        for keyword in keywords:
            if " " in keyword:
                # Match multi-word phrases
                pattern = r"\b" + re.escape(keyword) + r"\b"
                matches = list(re.finditer(pattern, normalized))

                for match in matches:
                    preceding = normalized[:match.start()]
                    preceding_words = re.findall(r"[a-z']+", preceding)
                    recent_words = preceding_words[-3:]

                    if not any(word in negations for word in recent_words):
                        count += 1
            else:
                for index, word in enumerate(words):
                    if word == keyword and not is_negated(index):
                        count += 1

        counts[emotion] = count

    # Choose the strongest detected emotion
    if max(counts.values(), default=0) > 0:
        emotion = max(counts, key=counts.get)
    else:
        emotion = "reflective"

    # Estimate sentiment from positive and negative words
    positive_count = sum(
        1 for i, word in enumerate(words)
        if word in POSITIVE and not is_negated(i)
    )

    negative_count = sum(
        1 for i, word in enumerate(words)
        if word in NEGATIVE and not is_negated(i)
    )

    score = max(1, min(5, 3 + positive_count - negative_count))

    return emotion, score, crisis


def save_entry(kind, text, emotion=None, score=None):
    with connect() as con:
        cur = con.execute(
            "INSERT INTO entries(kind,text,emotion,score,created_at) VALUES(?,?,?,?,?)",
            (kind, text, emotion, score, datetime.now().isoformat(timespec="seconds"))
        )
        return cur.lastrowid

class EntryIn(BaseModel):
    text: str = Field(min_length=2, max_length=4000)
    mood: Optional[str] = None

class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def home():
    return FileResponse(BASE / "static" / "index.html")

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "MindMirror"}

@app.post("/api/checkin")
def checkin(payload: EntryIn):
    emotion, score, crisis = analyze(payload.text)
    if payload.mood:
        emotion = payload.mood.lower()
    save_entry("checkin", payload.text, emotion, score)
    return {
        "emotion": emotion, "score": score, "crisis_flag": crisis,
        "message": "Your check-in has been saved.",
        "reflection": reflection_for(emotion)
    }

@app.post("/api/journal")
def journal(payload: EntryIn):
    emotion, score, crisis = analyze(payload.text)
    save_entry("journal", payload.text, emotion, score)
    return {
        "emotion": emotion, "score": score, "crisis_flag": crisis,
        "message": "Your journal entry has been saved.",
        "reflection": reflection_for(emotion)
    }

@app.get("/api/entries")
def entries(limit: int = 30):
    limit = max(1, min(limit, 100))
    with connect() as con:
        rows = con.execute(
            "SELECT id,kind,text,emotion,score,created_at FROM entries ORDER BY id DESC LIMIT ?",
            (limit,)
        ).fetchall()
    return [dict(r) for r in rows]

@app.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: int):
    with connect() as con:
        cur = con.execute("DELETE FROM entries WHERE id=?", (entry_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Entry not found")
    return {"deleted": True}

@app.get("/api/insights")
def insights():
    with connect() as con:
        rows = con.execute(
            "SELECT emotion,score,created_at FROM entries ORDER BY id DESC LIMIT 30"
        ).fetchall()
    if not rows:
        return {"total": 0, "average_score": None, "emotions": {}, "weekly": [], "insight": "Add a check-in or journal entry to start seeing your patterns."}
    counts = {}
    for row in rows:
        counts[row["emotion"] or "reflective"] = counts.get(row["emotion"] or "reflective", 0) + 1
    scores = [r["score"] for r in rows if r["score"] is not None]
    average = round(sum(scores) / len(scores), 1) if scores else None
    top = max(counts, key=counts.get)
    insight = {
        "anxious": "Stress or worry appears in several recent entries. Consider noting what happened just before those feelings.",
        "sad": "Some recent entries include sadness. A small check-in with someone you trust may help you feel less alone.",
        "tired": "Low-energy language appears in your entries. Consider whether rest, workload or routine is affecting you.",
        "happy": "Positive emotions appear often in your recent entries. Notice what activities or connections support them.",
        "angry": "Frustration appears in some entries. Pausing and naming what felt difficult may help clarify what you need.",
        "calm": "Calm feelings appear in your entries. Notice which routines help you feel steady."
    }.get(top, "Keep writing honestly. Patterns become more useful as you add entries over time.")
    weekly = []
    for r in reversed(rows):
        weekly.append({"date": r["created_at"][:10], "score": r["score"]})
    return {"total": len(rows), "average_score": average, "emotions": counts, "weekly": weekly, "insight": insight}

def reflection_for(emotion):
    return {
        "happy": "What helped create this positive moment, and how could you make room for it again?",
        "sad": "You do not need to solve everything at once. Is there one person you feel comfortable talking to?",
        "anxious": "Try naming one thing you can influence right now and one thing you can leave for later.",
        "angry": "It may help to pause, take a few slow breaths and identify the need behind the frustration.",
        "tired": "Consider whether you need a break, rest or support with something on your plate.",
        "calm": "Notice what is helping you feel settled so you can return to it when needed.",
        "reflective": "Take a moment to describe what stood out most in your day."
    }.get(emotion, "Take a moment to notice what you need right now.")

@app.post("/api/companion")
def companion(payload: ChatIn):
    emotion, score, crisis = analyze(payload.message)
    if crisis:
        reply = ("I'm really sorry things feel this difficult. Your safety matters more than this chat. "
                 "Please reach out now to a trusted person nearby, such as a family member, friend, teacher or counsellor. "
                 "If you may be in immediate danger, contact local emergency services or go to the nearest emergency department. "
                 "If possible, stay with someone you trust. I’m not an emergency service and cannot monitor your safety.")
    else:
        reply = {
            "anxious": "That sounds like a lot to carry. What is one part of the situation you can take one small step on today?",
            "sad": "Thank you for putting that feeling into words. Would it help to tell someone you trust what today has been like?",
            "angry": "It sounds frustrating. What boundary, expectation or need might be underneath that feeling?",
            "tired": "It sounds like your energy is low. What is one thing you could postpone, simplify or ask help with?",
            "happy": "I'm glad you shared that. What do you think contributed most to this moment?",
            "calm": "That sounds like a steadier moment. What helped you get there?",
            "reflective": "I'm listening. What part of this feels most important to you right now?"
        }.get(emotion, "I'm here to help you reflect. Can you tell me a little more about what feels important?")
    return {"reply": reply, "emotion": emotion, "crisis_flag": crisis}

@app.get("/api/export")
def export_entries():
    with connect() as con:
        rows = con.execute("SELECT kind,text,emotion,score,created_at FROM entries ORDER BY id").fetchall()
    return [dict(r) for r in rows]
