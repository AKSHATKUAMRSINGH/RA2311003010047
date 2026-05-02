const axios = require("axios");
const { Log, setAuthToken } = require("../logging_middleware/logger");

const BASE_URL = "http://20.207.122.201/evaluation-service";
let AUTH_TOKEN = "";

function setToken(token) {
  AUTH_TOKEN = token;
  setAuthToken(token);
}

function authHeaders() {
  return { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } };
}

async function fetchDepots() {
  await Log("backend", "info", "service", "Fetching depots from evaluation service");
  try {
    const res = await axios.get(`${BASE_URL}/depots`, authHeaders());
    await Log("backend", "info", "repository", `Fetched ${res.data.depots.length} depots successfully`);
    return res.data.depots;
  } catch (err) {
    await Log("backend", "error", "repository", `Failed to fetch depots: ${err.message}`);
    throw err;
  }
}

async function fetchVehicles() {
  await Log("backend", "info", "service", "Fetching vehicles from evaluation service");
  try {
    const res = await axios.get(`${BASE_URL}/vehicles`, authHeaders());
    await Log("backend", "info", "repository", `Fetched ${res.data.vehicles.length} vehicles successfully`);
    return res.data.vehicles;
  } catch (err) {
    await Log("backend", "error", "repository", `Failed to fetch vehicles: ${err.message}`);
    throw err;
  }
}

function knapsack(capacity, vehicles) {
  const n = vehicles.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { Duration, Impact } = vehicles[i - 1];
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w];
      if (Duration <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - Duration] + Impact);
      }
    }
  }

  const selectedTasks = [];
  let w = capacity;
  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selectedTasks.push(vehicles[i - 1]);
      w -= vehicles[i - 1].Duration;
    }
  }

  return {
    selectedTasks: selectedTasks.reverse(),
    totalImpact: dp[n][capacity],
    totalDuration: selectedTasks.reduce((sum, v) => sum + v.Duration, 0),
  };
}

async function runScheduler() {
  await Log("backend", "info", "service", "Vehicle Maintenance Scheduler started");
  const depots = await fetchDepots();
  const vehicles = await fetchVehicles();
  await Log("backend", "info", "service", `Processing ${depots.length} depots with ${vehicles.length} vehicles`);

  const results = [];
  for (const depot of depots) {
    const capacity = depot.MechanicHours;
    await Log("backend", "debug", "service", `Running knapsack for depot ${depot.ID} with ${capacity} mechanic-hours`);
    const { selectedTasks, totalImpact, totalDuration } = knapsack(capacity, vehicles);
    await Log("backend", "info", "service",
      `Depot ${depot.ID}: selected ${selectedTasks.length} tasks, totalImpact=${totalImpact}, usedHours=${totalDuration}/${capacity}`
    );
    results.push({
      depotID: depot.ID,
      mechanicHours: capacity,
      selectedTasks: selectedTasks.map((v) => v.TaskID),
      totalImpact,
      totalDuration,
    });
  }

  await Log("backend", "info", "service", "Vehicle Maintenance Scheduler completed successfully");
  return results;
}

module.exports = { runScheduler, setToken, fetchDepots, fetchVehicles, knapsack };