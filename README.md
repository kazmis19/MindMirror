# 🌿 MindMirror
### Your Personal Space for Emotional Reflection

**MindMirror** is a web-based wellness and self-reflection platform designed to help users record their thoughts, understand emotional patterns, and reflect on their everyday experiences.

🔗 **[Live Demo](https://mindmirror-tbso.onrender.com/)** · **[GitHub Repository](https://github.com/kazmis19/MindMirror)**

---

## ✨ Key Features

- **Mood Check-ins:** Record your current mood and reflect on how you're feeling.
- **Personal Journaling:** Write and save personal thoughts and daily experiences.
- **Emotion Estimation:** Rule-based analysis of journal entries to identify possible emotional patterns.
- **Mood Insights:** View recorded mood patterns and reflections.
- **Reflection Space:** Receive supportive, rule-based reflection prompts and responses.
- **Support & Safety:** Access supportive guidance and safety information.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Python | Backend programming |
| FastAPI | Backend framework and API |
| SQLite | Local data storage |
| HTML | Web page structure |
| CSS | Styling and layout |
| JavaScript | Frontend interactions |

## 📁 Project Structure

```text
MindMirror/
│
├── main.py
├── requirements.txt
├── render.yaml
├── Procfile
├── .python-version
├── .gitignore
├── README.md
│
└── static/
    ├── index.html
    ├── style.css
    └── app.js
```

## 🚀 Run Locally

**1. Clone the repository**

```bash
git clone https://github.com/kazmis19/MindMirror.git
```

**2. Enter the project directory**

```bash
cd MindMirror
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Start the application**

```bash
python -m uvicorn main:app --reload
```

**5. Open in your browser**

```text
http://127.0.0.1:8000
```

API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

## 💡 Project Purpose

MindMirror aims to make everyday emotional reflection more accessible through a simple digital space for mood tracking, journaling, and self-awareness.

## ⚠️ Disclaimer

MindMirror is a self-reflection and wellness project. Its emotion estimation is rule-based and is not a clinical assessment, mental health diagnosis, or substitute for professional support.

## 👩‍💻 Built With

Made with 🌿 as a hackathon project.
