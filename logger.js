const axios = require("axios");

const LOG_API_URL = "http://20.207.122.201/evaluation-service/logs";
let AUTH_TOKEN = "";

function setAuthToken(token) {
  AUTH_TOKEN = token;
}

const VALID_STACKS = ["backend", "frontend"];
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];
const VALID_PACKAGES = [
  "cache", "controller", "cron_job", "db", "domain",
  "handler", "repository", "route", "service",
  "api", "component", "hook", "page", "state", "style",
  "auth", "config", "middleware", "utils"
];

async function Log(stack, level, pkg, message) {
  if (!VALID_STACKS.includes(stack)) return console.error(`[Logger] Invalid stack: "${stack}"`);
  if (!VALID_LEVELS.includes(level)) return console.error(`[Logger] Invalid level: "${level}"`);
  if (!VALID_PACKAGES.includes(pkg)) return console.error(`[Logger] Invalid package: "${pkg}"`);

  try {
    const response = await axios.post(LOG_API_URL,
      { stack, level, package: pkg, message },
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" } }
    );
    console.log(`[Logger] Log created: ${response.data.logID} — ${response.data.message}`);
    return response.data;
  } catch (err) {
    console.error(`[Logger] Failed:`, err.response?.data || err.message);
  }
}

module.exports = { Log, setAuthToken };