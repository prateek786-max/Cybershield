const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

// static files (frontend)
app.use(express.static(path.join(__dirname, "public")));

// ---------- IN-MEMORY DATA ----------

const users = [];

let updates = [
  {
    id: 1,
    title: "Check links before clicking",
    summary:
      "Many phishing attacks use links that look like official sites. Always hover over the link and check the full URL before you open it.",
    label: "Safety tip",
    createdAt: new Date().toISOString(),
  },
];

let quizzes = [
  {
    id: 1,
    title: "Email phishing basics",
    question:
      "You get an email saying you have won a scholarship and must log in with your college ID on a given link. What is the safest thing to do?",
    options: [
      "Click the link quickly before it expires.",
      "Check the sender address and verify from the official college website or office.",
      "Reply to the email and send your ID and password.",
      "Forward the mail to friends and ask what to do.",
    ],
    correctIndex: 1,
    solution:
      "Genuine scholarships will not force you to log in through random links. Always verify from the official website or office before entering your ID or password.",
  },
  {
    id: 2,
    title: "OTP & support calls",
    question:
      "Someone calls you saying they are from your bank support and ask you to share the OTP you just received to ‘stop a fraud’. What should you do?",
    options: [
      "Share the OTP so they can block the transaction.",
      "Cut the call and call the official bank helpline number printed on your card or app.",
      "Ask them for their employee ID and then trust them.",
      "Tell them your full card number but not the OTP.",
    ],
    correctIndex: 1,
    solution:
      "No genuine bank employee will ever ask for your OTP, PIN or full card details on call. Cut the call and contact the bank using the official customer care number.",
  },
  {
    id: 3,
    title: "UPI payment link scam",
    question:
      "You are selling an item online. The buyer sends a ‘payment link’ and says, “Just click this to receive the money in your UPI”. What is correct?",
    options: [
      "Click the link and enter your UPI PIN to receive money.",
      "Never enter UPI PIN to receive money; you only enter PIN when you are sending money.",
      "Share your UPI ID and ATM PIN to be safe.",
      "Ask them to resend the link on WhatsApp instead.",
    ],
    correctIndex: 1,
    solution:
      "To receive money on UPI you do NOT need to enter your PIN. If a link asks for your UPI PIN, it is trying to pull money from your account, not send it.",
  },
  {
    id: 4,
    title: "Social media privacy",
    question:
      "Your social media profile is public and shows your college name, phone number and date of birth. What is the safest action?",
    options: [
      "Leave everything public so more people can find you.",
      "Hide personal details like phone number and limit who can see your profile and posts.",
      "Post even more details so people trust you.",
      "Share your ID card photo to prove identity.",
    ],
    correctIndex: 1,
    solution:
      "Personal details like phone number and date of birth can be misused for identity theft and social engineering. Keep them private and restrict who can see your profile.",
  },
];

const activityByEmail = {};
const streaksByEmail = {};
const quizActivity = [];

const ADMIN_KEY = "admin123";

function checkAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.adminKey;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ message: "Not allowed. Invalid admin key." });
  }
  next();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function computeLevel(points) {
  if (points >= 600) return "Platinum shield";
  if (points >= 300) return "Gold protector";
  if (points >= 150) return "Silver guardian";
  if (points >= 50) return "Bronze defender";
  return "New learner";
}

// ---------- API ROUTES ----------

// auth
app.post("/api/signup", (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const existing = users.find((u) => u.email === email.toLowerCase());
  if (existing) {
    return res
      .status(400)
      .json({ message: "An account with this email already exists." });
  }
  const user = { name, email: email.toLowerCase(), phone, password };
  users.push(user);
  res.status(201).json({
    message: "Account created.",
    user: { name: user.name, email: user.email, phone: user.phone },
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }
  const user = users.find(
    (u) => u.email === email.toLowerCase() && u.password === password
  );
  if (!user) {
    return res.status(400).json({ message: "Invalid email or password." });
  }
  res.json({
    message: "Login successful.",
    user: { name: user.name, email: user.email, phone: user.phone },
  });
});

// updates, quizzes
app.get("/api/updates", (req, res) => {
  const sorted = [...updates].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(sorted);
});

app.get("/api/quizzes", (req, res) => {
  res.json(quizzes);
});

// admin updates
app.post("/api/admin/updates", checkAdmin, (req, res) => {
  const { title, summary, label } = req.body;
  if (!title || !summary) {
    return res.status(400).json({ message: "Title and summary are required." });
  }
  const newUpdate = {
    id: Date.now(),
    title,
    summary,
    label: label || "Update",
    createdAt: new Date().toISOString(),
  };
  updates.push(newUpdate);
  res.status(201).json({ message: "Update created.", update: newUpdate });
});

app.delete("/api/admin/updates/:id", checkAdmin, (req, res) => {
  const id = Number(req.params.id);
  const before = updates.length;
  updates = updates.filter((u) => u.id !== id);
  if (updates.length === before) {
    return res.status(404).json({ message: "Update not found." });
  }
  res.json({ message: "Update deleted." });
});

// admin quizzes
app.post("/api/admin/quizzes", checkAdmin, (req, res) => {
  const { question, options, correctIndex, solution } = req.body;
  if (!question || !Array.isArray(options)) {
    return res.status(400).json({
      message: "Question and options are required for a quiz.",
    });
  }
  const cleanedOptions = options.map((o) => String(o || "").trim());
  const nonEmpty = cleanedOptions.filter((o) => o.length > 0);
  if (nonEmpty.length < 2) {
    return res
      .status(400)
      .json({ message: "Please fill at least two options." });
  }
  let idx = Number(correctIndex);
  if (isNaN(idx) || idx < 0 || idx >= cleanedOptions.length) {
    idx = 0;
  }
  const autoTitleBase = question.trim().replace(/\s+/g, " ");
  const autoTitle =
    autoTitleBase.length <= 60
      ? autoTitleBase
      : autoTitleBase.slice(0, 57) + "...";

  const newQuiz = {
    id: Date.now(),
    title: autoTitle || "Quiz",
    question,
    options: cleanedOptions,
    correctIndex: idx,
    solution: solution || "",
  };
  quizzes.push(newQuiz);
  res.status(201).json({ message: "Quiz created.", quiz: newQuiz });
});

app.delete("/api/admin/quizzes/:id", checkAdmin, (req, res) => {
  const id = Number(req.params.id);
  const before = quizzes.length;
  quizzes = quizzes.filter((q) => q.id !== id);
  if (quizzes.length === before) {
    return res.status(404).json({ message: "Quiz not found." });
  }
  res.json({ message: "Quiz deleted." });
});

// activity
app.post("/api/activity/start", (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ message: "Email required." });
  const key = email.toLowerCase();
  if (!activityByEmail[key]) {
    activityByEmail[key] = {
      email: key,
      name: name || "",
      totalMs: 0,
      sessionsCount: 0,
      lastStart: null,
      lastSeen: null,
      isActive: false,
    };
  }
  const entry = activityByEmail[key];
  entry.name = name || entry.name;
  entry.lastStart = Date.now();
  entry.lastSeen = Date.now();
  entry.isActive = true;
  entry.sessionsCount += 1;
  res.json({ message: "Session started." });
});

app.post("/api/activity/stop", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required." });
  const key = email.toLowerCase();
  const entry = activityByEmail[key];
  if (!entry || !entry.lastStart) {
    return res.json({ message: "No active session." });
  }
  const now = Date.now();
  const diff = now - entry.lastStart;
  if (diff > 0) entry.totalMs += diff;
  entry.lastStart = null;
  entry.lastSeen = now;
  entry.isActive = false;
  res.json({ message: "Session stopped." });
});

app.get("/api/admin/activity", checkAdmin, (req, res) => {
  const list = Object.values(activityByEmail).map((a) => ({
    email: a.email,
    name: a.name,
    totalMinutes: Math.round((a.totalMs / 60000) * 10) / 10,
    sessionsCount: a.sessionsCount,
    lastSeen: a.lastSeen,
    isActive: a.isActive,
  }));
  res.json(list);
});

// streak
app.post("/api/streak/ping", (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ message: "Email required." });
  const key = email.toLowerCase();
  const today = todayStr();
  const yesterday = yesterdayStr();

  if (!streaksByEmail[key]) {
    streaksByEmail[key] = {
      email: key,
      name: name || "",
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalDays: 0,
      points: 0,
    };
  }

  const s = streaksByEmail[key];
  s.name = name || s.name;

  if (s.lastActiveDate !== today) {
    s.totalDays += 1;
    if (s.lastActiveDate === yesterday) s.currentStreak += 1;
    else s.currentStreak = 1;

    if (s.currentStreak > s.longestStreak) s.longestStreak = s.currentStreak;
    s.lastActiveDate = today;

    let gain = 10;
    if (s.currentStreak === 3) gain += 10;
    if (s.currentStreak === 7) gain += 20;
    if (s.currentStreak % 30 === 0) gain += 50;
    s.points += gain;
  }

  const level = computeLevel(s.points);

  res.json({
    email: s.email,
    name: s.name,
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    lastActiveDate: s.lastActiveDate,
    totalDays: s.totalDays,
    points: s.points,
    level,
  });
});

app.get("/api/admin/streaks", checkAdmin, (req, res) => {
  const list = Object.values(streaksByEmail).map((s) => ({
    email: s.email,
    name: s.name,
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    totalDays: s.totalDays,
    points: s.points,
    level: computeLevel(s.points),
  }));
  res.json(list);
});

// quiz attempts
app.post("/api/quiz/attempt", (req, res) => {
  const { email, name, quizId, selectedIndex, correct } = req.body;
  if (!email || typeof quizId !== "number" || typeof selectedIndex !== "number") {
    return res.status(400).json({ message: "Invalid attempt payload." });
  }
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found." });
  }
  const now = new Date().toISOString();
  const entry = {
    id: Date.now(),
    email: email.toLowerCase(),
    name: name || "",
    quizId: quiz.id,
    quizTitle: quiz.title,
    selectedIndex,
    correct: !!correct,
    createdAt: now,
  };
  quizActivity.push(entry);

  const key = email.toLowerCase();
  if (!streaksByEmail[key]) {
    streaksByEmail[key] = {
      email: key,
      name: name || "",
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalDays: 0,
      points: 0,
    };
  }
  const s = streaksByEmail[key];
  s.name = name || s.name;

  let gain = correct ? 15 : 5;
  s.points += gain;
  const level = computeLevel(s.points);

  res.json({
    message: "Attempt recorded.",
    pointsGain: gain,
    totalPoints: s.points,
    level,
  });
});

app.get("/api/admin/quiz-activity", checkAdmin, (req, res) => {
  const list = quizActivity.slice(-200).reverse();
  res.json(list);
});

// ---------- START SERVER ----------

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Admin key: ${ADMIN_KEY}`);
});
