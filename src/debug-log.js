const DEBUG_LOGS_KEY = 'debug_logs_v1';
const MAX_DEBUG_LOGS = 200;

function nowIso() {
  return new Date().toISOString();
}

export async function getDebugLogs() {
  const store = await chrome.storage.local.get([DEBUG_LOGS_KEY]);
  return store[DEBUG_LOGS_KEY] || [];
}

export async function appendDebugLog(entry) {
  const logs = await getDebugLogs();
  const next = [
    ...logs,
    {
      timestamp: nowIso(),
      level: entry?.level || 'info',
      scope: entry?.scope || 'system',
      event: entry?.event || 'unknown',
      message: entry?.message || '',
      data: entry?.data || null
    }
  ].slice(-MAX_DEBUG_LOGS);
  await chrome.storage.local.set({ [DEBUG_LOGS_KEY]: next });
  return next;
}

export async function clearDebugLogs() {
  await chrome.storage.local.set({ [DEBUG_LOGS_KEY]: [] });
}
