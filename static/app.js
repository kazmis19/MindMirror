const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let selectedMood = "";
let emotionChart, trendChart;

function showPage(name) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === `page-${name}`));
  $$(".nav").forEach(b => b.classList.toggle("active", b.dataset.page === name));
  if (name === "home") loadRecent();
  if (name === "journal") loadJournal();
  if (name === "insights") loadInsights();
  if (name === "calendar") loadCalendar();
  window.scrollTo({top:0, behavior:"smooth"});
}
$$(".nav").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
$$("[data-go]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.go)));

async function api(url, options={}) {
  const res = await fetch(url, {headers:{"Content-Type":"application/json"}, ...options});
  if (!res.ok) throw new Error((await res.json()).detail || "Something went wrong");
  return res.json();
}
function safe(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function formatDate(s) { return new Date(s).toLocaleString([], {dateStyle:"medium", timeStyle:"short"}); }
function renderEntries(items, target) {
  const el = $(target);
  if (!items.length) { el.innerHTML = '<div class="empty">Nothing here yet. Your entries will appear as you check in.</div>'; return; }
  el.innerHTML = items.map(e => `<article class="entry"><div><b>${safe(e.kind)} · ${safe(e.emotion || "reflection")}</b><p>${safe(e.text)}</p><small>${formatDate(e.created_at)}</small></div><button class="delete-entry" title="Delete entry" data-delete="${e.id}">✕</button></article>`).join("");
  el.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    await api(`/api/entries/${b.dataset.delete}`, {method:"DELETE"});
    loadJournal(); loadRecent();
  }));
}
async function loadRecent() { try { renderEntries((await api("/api/entries?limit=4")), "#recent-list"); } catch(e) {} }
async function loadJournal() { try { renderEntries((await api("/api/entries?limit=50")), "#journal-list"); } catch(e) {} }

$$(".mood").forEach(b => b.addEventListener("click", () => {
  selectedMood = b.dataset.mood;
  $$(".mood").forEach(x => x.classList.toggle("selected", x === b));
}));
async function saveText(kind) {
  const field = kind === "checkin" ? $("#checkin-text") : $("#journal-text");
  const result = kind === "checkin" ? $("#checkin-result") : $("#journal-result");
  if (field.value.trim().length < 2) { alert("Please write a little about how you're feeling."); return; }
  try {
    const data = await api(`/api/${kind}`, {method:"POST", body:JSON.stringify({text:field.value.trim(), mood:kind==="checkin"?selectedMood:null})});
    result.classList.remove("hidden");
    result.innerHTML = `<b>Reflection theme: ${safe(data.emotion)}</b><br>${safe(data.reflection)}<br><small>${safe(data.message)}</small>`;
    field.value = ""; if(kind==="checkin"){selectedMood="";$$(".mood").forEach(x=>x.classList.remove("selected"));}
    loadRecent(); loadJournal();
    if (data.crisis_flag) result.innerHTML += `<br><b>If you may be in immediate danger, contact local emergency services and a trusted person now.</b>`;
  } catch(e) { alert(e.message); }
}
$("#save-checkin").addEventListener("click", () => saveText("checkin"));
$("#save-journal").addEventListener("click", () => saveText("journal"));
$("#journal-text").addEventListener("input", e => $("#word-count").textContent = `${e.target.value.length} / 4000 characters`);
$("#export-btn").addEventListener("click", async () => {
  const data = await api("/api/export");
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mindmirror-export.json"; a.click(); URL.revokeObjectURL(a.href);
});

async function loadInsights() {
  const d = await api("/api/insights");
  $("#stat-total").textContent = d.total;
  $("#stat-score").textContent = d.average_score ?? "—";
  const top = Object.entries(d.emotions).sort((a,b)=>b[1]-a[1])[0];
  $("#stat-theme").textContent = top ? top[0] : "—";
  $("#insight-text").textContent = d.insight;
  if (emotionChart) emotionChart.destroy();
  if (trendChart) trendChart.destroy();
  emotionChart = new Chart($("#emotion-chart"), {type:"doughnut",data:{labels:Object.keys(d.emotions),datasets:[{data:Object.values(d.emotions),backgroundColor:["#8b7bd3","#f2ad91","#8ecbb2","#e5c778","#a4b9df","#d99bb8","#b8b8c9"],borderWidth:0}]},options:{plugins:{legend:{position:"bottom",labels:{boxWidth:9,font:{size:10}}}}}});
  trendChart = new Chart($("#trend-chart"), {type:"line",data:{labels:d.weekly.map(x=>x.date),datasets:[{label:"Mood estimate",data:d.weekly.map(x=>x.score),borderColor:"#8273d0",backgroundColor:"#8273d022",fill:true,tension:.35,pointRadius:3}]},options:{scales:{y:{min:1,max:5,ticks:{stepSize:1}},x:{ticks:{maxTicksLimit:6}}},plugins:{legend:{display:false}}}});
}

function addBubble(text, who) {
  const el = document.createElement("div"); el.className = `bubble ${who}`; el.textContent = text;
  $("#chat-messages").appendChild(el); $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
}
async function sendChat(text) {
  if (!text.trim()) return;
  addBubble(text, "user"); $("#chat-text").value = "";
  try { const d = await api("/api/companion", {method:"POST",body:JSON.stringify({message:text})}); addBubble(d.reply, "bot"); }
  catch(e) { addBubble("Sorry, I couldn't connect. Please try again.", "bot"); }
}
$("#send-chat").addEventListener("click", () => sendChat($("#chat-text").value));
$("#chat-text").addEventListener("keydown", e => { if(e.key==="Enter") sendChat($("#chat-text").value); });
$$(".prompt").forEach(b => b.addEventListener("click", () => sendChat(b.textContent)));
loadRecent();
// ==============================
// MOOD CALENDAR
// ==============================

let calendarMonth = new Date();
let selectedCalendarDate = new Date().toLocaleDateString("en-CA");
let calendarEntries = [];

const moodClasses = {
  happy: "mood-happy",
  calm: "mood-calm",
  sad: "mood-sad",
  anxious: "mood-anxious",
  angry: "mood-angry",
  tired: "mood-tired"
};

async function loadCalendar() {
  try {
    calendarEntries = await api("/api/entries?limit=100");
    renderCalendar();
    renderSelectedDate();
  } catch (error) {
    $("#calendar-entries").innerHTML =
      '<div class="empty">Unable to load calendar entries. Please try again.</div>';
  }
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  $("#calendar-month").textContent =
    calendarMonth.toLocaleDateString([], {
      month: "long",
      year: "numeric"
    });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = localDateKey(new Date());

  let html = "";

  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day empty-day"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = localDateKey(new Date(year, month, day));

    const entries = calendarEntries.filter(
      entry => entry.created_at.slice(0, 10) === dateKey
    );

    const mood = entries.length ? entries[0].emotion : "";
    const moodClass = moodClasses[mood] || "";

    const classes = [
      "calendar-day",
      dateKey === today ? "today" : "",
      dateKey === selectedCalendarDate ? "selected" : ""
    ].filter(Boolean).join(" ");

    html += `
      <button class="${classes}" data-date="${dateKey}">
        <span>${day}</span>
        ${moodClass ? `<span class="mood-dot ${moodClass}"></span>` : ""}
      </button>
    `;
  }

  $("#calendar-days").innerHTML = html;

  $$("#calendar-days [data-date]").forEach(button => {
    button.addEventListener("click", () => {
      selectedCalendarDate = button.dataset.date;
      renderCalendar();
      renderSelectedDate();
    });
  });
}

function renderSelectedDate() {
  const date = new Date(selectedCalendarDate + "T00:00:00");

  $("#selected-date-title").textContent =
    date.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

  const entries = calendarEntries.filter(
    entry => entry.created_at.slice(0, 10) === selectedCalendarDate
  );

  const container = $("#calendar-entries");

  if (!entries.length) {
    container.innerHTML =
      '<div class="empty">No saved entries for this day. Every day is a fresh opportunity to reflect.</div>';
    return;
  }

  container.innerHTML = entries.map(entry => `
    <article class="entry">
      <div>
        <b>${safe(entry.kind)} · ${safe(entry.emotion || "reflection")}</b>
        <p>${safe(entry.text)}</p>
        <small>${formatDate(entry.created_at)}</small>
      </div>
    </article>
  `).join("");
}

// Previous month
$("#prev-month").addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() - 1);
  renderCalendar();
});

// Next month
$("#next-month").addEventListener("click", () => {
  calendarMonth.setMonth(calendarMonth.getMonth() + 1);
  renderCalendar();
});
const dailyQuestions = [
  "What is one thing you appreciate about today?",
  "What made you smile recently?",
  "What is something you learned about yourself?",
  "What is one small thing you are looking forward to?",
  "What would you like to give yourself credit for today?",
  "When did you feel most at ease recently?",
  "What is something you would like to make more time for?",
  "What is one thing you handled well today?",
  "What is something you want to let go of?",
  "What is one small act of kindness you experienced?",
  "What helps you feel comfortable and supported?",
  "What is something new you would like to explore?"
];

function loadDailyQuestion() {
  const questionElement = document.getElementById("daily-question");
  if (!questionElement) return;

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayNumber = Math.floor((today - startOfYear) / 86400000);
  const questionIndex = dayNumber % dailyQuestions.length;

  questionElement.textContent = dailyQuestions[questionIndex];
}

loadDailyQuestion();
let breathingInterval = null;
let breathingPhase = "inhale";
let breathingSeconds = 0;

function startBreathing() {
  if (breathingInterval) return;

  const circle = document.getElementById("breathing-circle");
  const instruction = document.getElementById("breathing-instruction");
  const timer = document.getElementById("breathing-timer");

  breathingSeconds = 0;
  breathingPhase = "inhale";

  function updateBreathing() {
    if (breathingPhase === "inhale") {
      instruction.textContent = "Breathe in";
      circle.classList.add("inhale");
      circle.classList.remove("exhale");
      breathingPhase = "exhale";
    } else {
      instruction.textContent = "Breathe out";
      circle.classList.remove("inhale");
      circle.classList.add("exhale");
      breathingPhase = "inhale";
    }
  }

  updateBreathing();

  breathingInterval = setInterval(() => {
    breathingSeconds += 4;

    if (breathingSeconds >= 60) {
      stopBreathing(true);
      return;
    }

    updateBreathing();
    timer.textContent = "Take your time · " + breathingSeconds + " seconds";
  }, 4000);

  timer.textContent = "A gentle one-minute pause";
}

function stopBreathing(completed = false) {
  clearInterval(breathingInterval);
  breathingInterval = null;

  const circle = document.getElementById("breathing-circle");
  document.getElementById("breathing-instruction").textContent =
    completed ? "Well done!" : "Paused";

  circle.classList.remove("inhale", "exhale");

  document.getElementById("breathing-timer").textContent =
    completed ? "Your breathing exercise is complete." : "Take a break whenever you need.";
}

document.getElementById("start-breathing").addEventListener("click", startBreathing);
document.getElementById("stop-breathing").addEventListener("click", () => stopBreathing());
async function loadWeeklyReport() {
  const totalEl = document.getElementById("weekly-total");
  if (!totalEl) return;

  try {
    const entries = await api("/api/entries?limit=100");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);

    function getDateKey(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const startKey = getDateKey(startDate);
    const endKey = getDateKey(today);

    const weeklyEntries = entries.filter(entry => {
      const date = new Date(entry.created_at);
      const key = getDateKey(date);
      return key >= startKey && key <= endKey;
    });

    const days = new Set(
      weeklyEntries.map(entry =>
        getDateKey(new Date(entry.created_at))
      )
    );

    const moodCounts = {};

    weeklyEntries.forEach(entry => {
      if (entry.emotion) {
        moodCounts[entry.emotion] =
          (moodCounts[entry.emotion] || 0) + 1;
      }
    });

    const commonMood = Object.keys(moodCounts).sort(
      (a, b) => moodCounts[b] - moodCounts[a]
    )[0];

    document.getElementById("weekly-total").textContent =
      weeklyEntries.length;

    document.getElementById("weekly-days").textContent =
      days.size;

    document.getElementById("weekly-mood").textContent =
      commonMood
        ? commonMood.charAt(0).toUpperCase() + commonMood.slice(1)
        : "—";

    const activity = document.getElementById("weekly-activity");
    activity.innerHTML = "";

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const key = getDateKey(date);
      const count = weeklyEntries.filter(
        entry => getDateKey(new Date(entry.created_at)) === key
      ).length;

      const row = document.createElement("div");
      row.className = "weekly-day";

      const dayName = document.createElement("span");
      dayName.textContent = date.toLocaleDateString([], {
        weekday: "long",
        day: "numeric",
        month: "short"
      });

      const dayCount = document.createElement("span");
      dayCount.textContent =
        `${count} ${count === 1 ? "entry" : "entries"}`;

      row.append(dayName, dayCount);
      activity.appendChild(row);
    }

  } catch (error) {
    document.getElementById("weekly-activity").textContent =
      "Unable to load your weekly report. Please try again.";
  }
}

document.querySelectorAll(
  '[data-page="insights"], [data-go="insights"]'
).forEach(button => {
  button.addEventListener("click", loadWeeklyReport);
});
const moodColors = [
  { name: "Happy", color: "#FFD580", message: "A little sunshine in your day ☀️" },
  { name: "Calm", color: "#A8DCC5", message: "Enjoy this peaceful moment 🌿" },
  { name: "Sad", color: "#AFC8E8", message: "Give yourself space to feel 🌧️" },
  { name: "Anxious", color: "#C9B8E8", message: "Take things one moment at a time 💜" },
  { name: "Angry", color: "#F2A6A0", message: "You can pause and express yourself safely 🌸" },
  { name: "Tired", color: "#C9CED8", message: "Rest is valuable too ☁️" }
];

function openColorGame() {
  const area = document.getElementById("creative-activity");

  area.innerHTML = `
    <p class="eyebrow">COLOR YOUR MOOD</p>
    <h2>Which color feels right today?</h2>
    <p>There is no right or wrong choice. Pick whatever you like.</p>
    <div class="mood-color-options">
      ${moodColors.map((mood, index) => `
        <button class="color-choice" data-color-index="${index}"
          style="background:${mood.color}" aria-label="${mood.name}">
          ${mood.name}
        </button>
      `).join("")}
    </div>
    <div id="mood-color-result" class="mood-color-result">
      Your chosen color will appear here.
    </div>
  `;

  area.querySelectorAll(".color-choice").forEach(button => {
    button.addEventListener("click", () => {
      const mood = moodColors[Number(button.dataset.colorIndex)];
      const result = document.getElementById("mood-color-result");

      result.innerHTML = `
        <div class="chosen-color" style="background:${mood.color}"></div>
        <h3>${mood.name}</h3>
        <p>${mood.message}</p>
      `;
    });
  });
}

document.querySelectorAll('[data-game="color"]').forEach(button => {
  button.addEventListener("click", openColorGame);
});
function openDoodleGame() {
  const area = document.getElementById("creative-activity");

  area.innerHTML = `
    <p class="eyebrow">DIGITAL DOODLE</p>
    <h2>Your little drawing space</h2>
    <p>Draw anything you like. There is no perfect way to create.</p>

    <div class="doodle-toolbar">
      <label>Color
        <input type="color" id="doodle-color" value="#9282c7">
      </label>

      <label>Brush size
        <input type="range" id="doodle-size" min="2" max="25" value="5">
      </label>

      <button id="doodle-eraser" class="text-btn">Eraser</button>
<button id="doodle-clear" class="text-btn">Clear</button>
<button id="doodle-save" class="text-btn">Save drawing</button>
    </div>

    <canvas id="doodle-canvas" width="700" height="350"></canvas>
    <p class="breathing-note">Your saved drawing is stored in your MindMirror records.</p>
  `;

  const canvas = document.getElementById("doodle-canvas");
  const ctx = canvas.getContext("2d");
  const colorInput = document.getElementById("doodle-color");
  const sizeInput = document.getElementById("doodle-size");

  let drawing = false;
  let erasing = false;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  function getPosition(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height
    };
  }

  canvas.addEventListener("pointerdown", event => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);

    const pos = getPosition(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = erasing ? "#ffffff" : colorInput.value;
    ctx.lineWidth = Number(sizeInput.value);
    ctx.stroke();
  });

  canvas.addEventListener("pointermove", event => {
    if (!drawing) return;

    const pos = getPosition(event);

    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = erasing ? "#ffffff" : colorInput.value;
    ctx.lineWidth = Number(sizeInput.value);
    ctx.stroke();
  });

  function stopDrawing() {
    drawing = false;
    ctx.beginPath();
  }

  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointercancel", stopDrawing);
  canvas.addEventListener("pointerleave", stopDrawing);

  document.getElementById("doodle-eraser").addEventListener("click", () => {
    erasing = !erasing;
    document.getElementById("doodle-eraser").textContent =
      erasing ? "Use brush" : "Eraser";
  });

  document.getElementById("doodle-clear").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
    document.getElementById("doodle-save").addEventListener("click", async () => {
    const saveButton = document.getElementById("doodle-save");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
      const drawing = canvas.toDataURL("image/jpeg", 0.7);

      const response = await fetch("/api/creative", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          kind: "doodle",
          content: drawing
        })
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      saveButton.textContent = "Saved ✓";
    } catch (error) {
      alert("Unable to save drawing. Please try again.");
      saveButton.textContent = "Save drawing";
    } finally {
      saveButton.disabled = false;
    }
  });
}

document.querySelectorAll('[data-game="doodle"]').forEach(button => {
  button.addEventListener("click", openDoodleGame);
});
function openGratitudeGarden() {
  const area = document.getElementById("creative-activity");

  area.innerHTML = `
    <p class="eyebrow">GRATITUDE GARDEN</p>
    <h2>Grow your little garden 🌷</h2>
    <p>What's one small thing you appreciated today?</p>

    <div class="garden-input">
      <input
        type="text"
        id="gratitude-input"
        placeholder="e.g. A kind message from someone..."
        maxlength="150"
      >
      <button id="add-gratitude">Plant it 🌱</button>
    </div>

    <div id="garden-message"></div>
    <div id="garden-plants" class="garden-plants"></div>
  `;

  const input = document.getElementById("gratitude-input");
  const plants = document.getElementById("garden-plants");
  const message = document.getElementById("garden-message");

  let entries = [];

  function renderGarden() {
    plants.innerHTML = entries.map((entry, index) => `
      <div class="garden-note">
        <span>${["🌱", "🌷", "🌼", "🌿"][index % 4]}</span>
        <p></p>
      </div>
    `).join("");

    plants.querySelectorAll(".garden-note p").forEach((element, index) => {
      element.textContent = entries[index].content;
    });
  }
  async function loadGarden() {
  try {
    const response = await fetch("/api/creative");

    if (!response.ok) {
      throw new Error("Could not load garden.");
    }

    const records = await response.json();

    entries = records.filter(record => record.kind === "gratitude");

    renderGarden();
  } catch (error) {
    message.textContent = "Unable to load your garden records. Please try again.";
  }
}

  document.getElementById("add-gratitude").addEventListener("click", async () => {
  const value = input.value.trim();

  if (!value) {
    message.textContent = "Write a little moment before planting it.";
    return;
  }

  const button = document.getElementById("add-gratitude");
  button.disabled = true;
  button.textContent = "Planting...";

  try {
    const response = await fetch("/api/creative", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        kind: "gratitude",
        content: value
      })
    });

    if (!response.ok) {
      throw new Error("Could not save note.");
    }

    await loadGarden();
    input.value = "";
    message.textContent = "Your little moment has been planted! 🌸";
    renderGarden();

  } catch (error) {
    message.textContent = "Unable to save. Please try again.";
  } finally {
    button.disabled = false;
    button.textContent = "Plant it 🌱";
  }
});
    loadGarden();
}


document.querySelectorAll('[data-game="garden"]').forEach(button => {
  button.addEventListener("click", openGratitudeGarden);
});
async function loadCreativeHistory() {
  const dateInput = document.getElementById("history-date");
  const historyList = document.getElementById("creative-history-list");
  const button = document.getElementById("load-history");

  button.disabled = true;
  button.textContent = "Loading...";

  try {
    const date = dateInput.value;
    const url = date
      ? `/api/creative?date=${date}`
      : "/api/creative";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not load history.");
    }

    const records = await response.json();

    if (records.length === 0) {
      historyList.textContent = "No creative memories found for this date.";
      return;
    }

    historyList.innerHTML = "";

    records.forEach(record => {
      const card = document.createElement("div");
      card.className = "garden-note";

      const heading = document.createElement("h3");
      heading.textContent =
        record.kind === "doodle" ? "✏️ Your Drawing" : "🌱 Gratitude Note";

      const dateText = document.createElement("small");
      dateText.textContent = new Date(record.created_at).toLocaleString();

      card.appendChild(heading);
      card.appendChild(dateText);

      if (record.kind === "doodle") {
        const img = document.createElement("img");
        img.src = record.content;
        img.alt = "Saved doodle";
        img.style.maxWidth = "100%";
        img.style.borderRadius = "12px";
        card.appendChild(img);
      } else {
        const note = document.createElement("p");
        note.textContent = record.content;
        card.appendChild(note);
      }

      historyList.appendChild(card);
    });

  } catch (error) {
    historyList.textContent = "Unable to load memories. Please try again.";
  } finally {
    button.disabled = false;
    button.textContent = "View memories";
  }
}

document.getElementById("load-history").addEventListener("click", loadCreativeHistory);
async function openComfortJar() {
  const panel = document.getElementById("creative-activity");

  panel.innerHTML = `
    <p class="eyebrow">A LITTLE COMFORT</p>
    <h2>Your Comfort Jar 🫙</h2>
    <p>Save kind words, happy memories and reminders for yourself.</p>

    <textarea id="comfort-input"
      placeholder="Write something you'd like to remember..."
      maxlength="500"></textarea>

    <button id="save-comfort">Save to my jar ♡</button>
    <button id="random-comfort">Open a random note ✨</button>

    <div id="random-comfort-result"></div>

    <h3>Your saved notes</h3>
    <div id="comfort-notes-list">Loading your notes...</div>
  `;

  let notes = [];

  async function loadComfortNotes() {
    const response = await fetch("/api/comfort");

    if (!response.ok) {
      throw new Error("Could not load notes");
    }

    notes = await response.json();

    const list = document.getElementById("comfort-notes-list");
    list.innerHTML = "";

    if (notes.length === 0) {
      list.textContent = "Your jar is empty. Add your first little reminder! 🌷";
      return;
    }

    notes.forEach(note => {
      const card = document.createElement("div");
      card.className = "garden-note";

      const content = document.createElement("p");
      content.textContent = note.content;

      const date = document.createElement("small");
      date.textContent = new Date(note.created_at).toLocaleString();

      const remove = document.createElement("button");
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        const response = await fetch(`/api/comfort/${note.id}`, {
          method: "DELETE"
        });

        if (response.ok) {
          await loadComfortNotes();
          document.getElementById("random-comfort-result").textContent = "";
        }
      });

      card.append(content, date, remove);
      list.appendChild(card);
    });
  }

  document.getElementById("save-comfort").addEventListener("click", async () => {
    const input = document.getElementById("comfort-input");
    const content = input.value.trim();

    if (!content) {
      alert("Write a little reminder first!");
      return;
    }

    const response = await fetch("/api/comfort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });

    if (response.ok) {
      input.value = "";
      await loadComfortNotes();
    } else {
      alert("Could not save your note. Please try again.");
    }
  });

  document.getElementById("random-comfort").addEventListener("click", () => {
    const result = document.getElementById("random-comfort-result");

    if (notes.length === 0) {
      result.textContent = "Your jar is empty. Add a note first! 🌷";
      return;
    }

    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    result.textContent = "♡ " + randomNote.content;
  });

  try {
    await loadComfortNotes();
  } catch (error) {
    document.getElementById("comfort-notes-list").textContent =
      "Unable to load your notes. Please try again.";
  }
}

document.querySelectorAll('[data-game="comfort"]').forEach(button => {
  button.addEventListener("click", openComfortJar);
});