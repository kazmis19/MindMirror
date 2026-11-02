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
