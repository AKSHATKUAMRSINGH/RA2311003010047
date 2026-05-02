const express = require("express");
const { runScheduler, setToken, fetchDepots, fetchVehicles, knapsack } = require("./index");
const { Log } = require("../logging_middleware/logger");

const app = express();
app.use(express.json());
const PORT = 3001;

app.use((req, res, next) => {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  setToken(auth.split(" ")[1]);
  next();
});

app.get("/scheduler/run", async (req, res) => {
  await Log("backend", "info", "handler", "GET /scheduler/run - running vehicle maintenance scheduler");
  try {
    const results = await runScheduler();
    res.status(200).json({ success: true, results });
  } catch (err) {
    await Log("backend", "error", "handler", `GET /scheduler/run failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.get("/scheduler/depots", async (req, res) => {
  await Log("backend", "info", "handler", "GET /scheduler/depots");
  try {
    const depots = await fetchDepots();
    res.status(200).json({ depots });
  } catch (err) {
    await Log("backend", "error", "handler", `GET /scheduler/depots failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.get("/scheduler/vehicles", async (req, res) => {
  await Log("backend", "info", "handler", "GET /scheduler/vehicles");
  try {
    const vehicles = await fetchVehicles();
    res.status(200).json({ vehicles });
  } catch (err) {
    await Log("backend", "error", "handler", `GET /scheduler/vehicles failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post("/scheduler/optimize", async (req, res) => {
  const { mechanicHours, vehicles } = req.body;
  await Log("backend", "info", "handler", `POST /scheduler/optimize - capacity=${mechanicHours}`);
  if (!mechanicHours || !Array.isArray(vehicles)) {
    return res.status(400).json({ error: "mechanicHours and vehicles array required" });
  }
  try {
    const result = knapsack(mechanicHours, vehicles);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    await Log("backend", "error", "handler", `POST /scheduler/optimize failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  console.log(`Vehicle Maintenance Scheduler running on http://localhost:${PORT}`);
  await Log("backend", "info", "service", `Vehicle Maintenance Scheduler server started on port ${PORT}`);
});