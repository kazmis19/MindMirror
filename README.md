# 🌿 MindMirror
### A Space to Pause. Reflect. Understand.

<p align="center">
  <b>Your Personal Space for Emotional Reflection</b>
</p>

<p align="center">
  A web-based wellness and self-reflection platform designed to help people record their thoughts, explore their emotions, and become more aware of their everyday emotional patterns.
</p>

<p align="center">
  <a href="https://mindmirror-tbso.onrender.com/">🌐 Live Demo</a> •
  <a href="https://github.com/kazmis19/MindMirror">💻 GitHub Repository</a>
</p>

---

## 🍃 About MindMirror

In our everyday lives, we experience a range of emotions, but we don't always take the time to understand them.

**MindMirror** aims to create a simple, comfortable digital space where users can pause, express their thoughts, and reflect on how they feel.

Through mood check-ins, personal journaling, rule-based emotion estimation, and mood insights, the platform encourages users to build a habit of emotional reflection and self-awareness.

The idea behind MindMirror is simple:

*Sometimes, understanding how you feel is the first step towards understanding yourself.*

---

## ✨ What Makes MindMirror Special?

MindMirror brings together several self-reflection features in one accessible platform.

### 🧠 1. Mood Check-ins
Record your current mood and give yourself a moment to reflect on your emotional state.

### 📝 2. Personal Journal
Write down your thoughts, feelings, and everyday experiences in a dedicated journaling space.

### 💭 3. Emotion Estimation
Uses a rule-based keyword and sentiment analysis approach to estimate possible emotions from written entries.

### 📊 4. Mood Insights
Explore recorded mood patterns and view insights based on your saved entries.

### 🌱 5. Reflection Space
Interact with a supportive, rule-based companion that provides reflective prompts and responses.

### 🤍 6. Support & Safety
Includes supportive guidance and safety-related information to encourage users to seek appropriate help when needed.

---

## 🛠️ Technology Behind MindMirror

The project combines a lightweight Python backend with a simple, interactive web interface.

| Technology | Role |
|---|---|
| Python | Core backend logic |
| FastAPI | REST API and application backend |
| SQLite | Database for storing journal and mood entries |
| HTML5 | Frontend structure |
| CSS3 | Styling and responsive layout |
| JavaScript | Frontend functionality and API communication |
| Chart.js | Mood insight visualizations |

---

## 🏗️ How It Works

MindMirror follows a simple flow:

1. **Express:** The user records a mood or writes a journal entry.
2. **Analyze:** The backend processes the written text using predefined keywords and sentiment rules.
3. **Store:** The entry and associated information are saved in the SQLite database.
4. **Reflect:** The application provides a supportive response or reflection.
5. **Understand:** The insights section displays patterns from recorded entries.

---

## 📂 Project Structure

```text
MindMirror/
│
├── main.py                 # FastAPI backend
├── requirements.txt        # Python dependencies
├── render.yaml             # Render deployment configuration
├── Procfile                # Application start command
├── .python-version         # Python runtime version
├── .gitignore              # Ignored files
├── README.md
│
└── static/
    ├── index.html          # Main application interface
    ├── style.css           # Styling
    └── app.js              # Frontend functionality
```

---

## 🚀 Getting Started

Want to run MindMirror on your local machine? Follow these steps.

### Prerequisites

- Python 3.12
- Git
- A code editor such as VS Code

### Installation

**Step 1 — Clone the repository**

```bash
git clone https://github.com/kazmis19/MindMirror.git
```

**Step 2 — Navigate to the project directory**

```bash
cd MindMirror
```

**Step 3 — Install the required dependencies**

```bash
pip install -r requirements.txt
```

**Step 4 — Start the FastAPI server**

```bash
python -m uvicorn main:app --reload
```

**Step 5 — Open the application**

Visit:

`http://127.0.0.1:8000`

To explore the API documentation, visit:

`http://127.0.0.1:8000/docs`

---

## 🌐 Live Application

Experience MindMirror here:

**[Open MindMirror →](https://mindmirror-tbso.onrender.com/)**

---

## 🔮 Future Scope

MindMirror can be extended with features such as:

- More advanced natural language processing for emotion estimation.
- Personalized reflection suggestions.
- Improved mood analytics and visualizations.
- Secure user accounts and private journal spaces.
- Persistent cloud database storage.
- More accessible and personalized user experiences.

---

## ⚠️ Important Note

MindMirror is an educational wellness and self-reflection project. Its emotion estimation is based on predefined rules and keywords. It is not a clinically validated AI system, a mental health diagnostic tool, or a substitute for professional support.

---

## 💚 The Thought Behind the Project

MindMirror was built around the belief that emotional reflection should be simple and accessible.

It offers a small space in the digital world to pause, put thoughts into words, and pay attention to emotional patterns.

**Pause. Express. Reflect. Understand.**

---

<p align="center">
  <b>MindMirror — A little more awareness, one reflection at a time.</b>
</p>

<p align="center">
  Developed as a hackathon project.
</p>
