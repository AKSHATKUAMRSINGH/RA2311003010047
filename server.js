const express = require("express");
const axios = require("axios");
const { Log, setAuthToken } = require("../logging_middleware/logger");

const app = express();
app.use(express.json());
const PORT = 3002;
const NOTIF_API_URL = "http://20.207.122.201/evaluation-service/notifications";
let AUTH_TOKEN = "";

app.use((req, res, next) => {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  AUTH_TOKEN = auth.split(" ")[1];
  setAuthToken(AUTH_TOKEN);
  next();
});

async function fetchNotifications() {
  const res = await axios.get(NOTIF_API_URL, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  return res.data.notifications;
}

app.get("/notifications", async (req, res) => {
  await Log("backend", "info", "handler", "GET /notifications - fetching all notifications");
  try {
    const notifications = await fetchNotifications();
    await Log("backend", "info", "service", `Fetched ${notifications.length} notifications`);
    res.status(200).json({ notifications });
  } catch (err) {
    await Log("backend", "error", "handler", `GET /notifications failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.get("/notifications/filter", async (req, res) => {
  const { type } = req.query;
  await Log("backend", "info", "handler", `GET /notifications/filter?type=${type}`);
  if (!type) return res.status(400).json({ error: "Query param 'type' is required" });
  try {
    const notifications = await fetchNotifications();
    const filtered = notifications.filter(n => n.Type.toLowerCase() === type.toLowerCase());
    await Log("backend", "info", "service", `Filtered ${filtered.length} notifications of type=${type}`);
    res.status(200).json({ notifications: filtered, count: filtered.length });
  } catch (err) {
    await Log("backend", "error", "handler", `GET /notifications/filter failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.get("/notifications/priority", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  await Log("backend", "info", "handler", `GET /notifications/priority - top ${limit}`);
  const TYPE_WEIGHT = { Placement: 3, Result: 2, Event: 1 };
  try {
    const notifications = await fetchNotifications();
    const scored = notifications.map(n => {
      const ageHours = (Date.now() - new Date(n.Timestamp).getTime()) / 3600000;
      return { ...n, _score: (TYPE_WEIGHT[n.Type] || 1) * (1 / (1 + ageHours)) };
    });
    scored.sort((a, b) => b._score - a._score);
    const top = scored.slice(0, limit).map(({ _score, ...n }) => n);
    await Log("backend", "info", "service", `Returning top ${top.length} priority notifications`);
    res.status(200).json({ notifications: top });
  } catch (err) {
    await Log("backend", "error", "handler", `GET /notifications/priority failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post("/notifications/notify-all", async (req, res) => {
  const { student_ids, message } = req.body;
  await Log("backend", "info", "handler", `POST /notifications/notify-all - ${student_ids?.length} students`);
  if (!Array.isArray(student_ids) || !message) {
    return res.status(400).json({ error: "student_ids array and message required" });
  }
  try {
    const results = [];
    for (const id of student_ids) {
      await Log("backend", "info", "service", `Sending notification to student ${id}: ${message}`);
      results.push({ studentId: id, status: "notified", message });
    }
    await Log("backend", "info", "service", `Notified ${results.length} students successfully`);
    res.status(200).json({ success: true, notified: results.length, results });
  } catch (err) {
    await Log("backend", "error", "handler", `POST /notifications/notify-all failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  console.log(`Notification App BE running on http://localhost:${PORT}`);
  await Log("backend", "info", "service", `Campus Notification Microservice started on port ${PORT}`);
});