export const CRAWL_POLICY_KEY = 'crawl_policy_v1';

export const CRAWL_POLICY_DEFAULTS = {
  mode: 'conservative',
  maxConversationsPerRun: '20',
  maxRunMinutes: '25',
  failureStreakThreshold: '3',
  cooldownMinutes: '15'
};

function clampInteger(value, fallback, min = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

export function normalizeCrawlPolicy(policy) {
  const raw = policy || {};
  return {
    mode: raw.mode === 'standard' ? 'standard' : 'conservative',
    maxConversationsPerRun: String(clampInteger(raw.maxConversationsPerRun, clampInteger(CRAWL_POLICY_DEFAULTS.maxConversationsPerRun, 20))),
    maxRunMinutes: String(clampInteger(raw.maxRunMinutes, clampInteger(CRAWL_POLICY_DEFAULTS.maxRunMinutes, 25))),
    failureStreakThreshold: String(clampInteger(raw.failureStreakThreshold, clampInteger(CRAWL_POLICY_DEFAULTS.failureStreakThreshold, 3), 1)),
    cooldownMinutes: String(clampInteger(raw.cooldownMinutes, clampInteger(CRAWL_POLICY_DEFAULTS.cooldownMinutes, 15), 1))
  };
}

export function getEffectiveCrawlPolicy(policy) {
  const normalized = normalizeCrawlPolicy(policy);
  return {
    ...normalized,
    maxConversationsPerRunValue: clampInteger(normalized.maxConversationsPerRun, 20),
    maxRunMinutesValue: clampInteger(normalized.maxRunMinutes, 25),
    failureStreakThresholdValue: clampInteger(normalized.failureStreakThreshold, 3, 1),
    cooldownMinutesValue: clampInteger(normalized.cooldownMinutes, 15, 1),
    pacingProfile: normalized.mode === 'standard'
      ? {
          startupDelay: [900, 2200, 0.18],
          beforeOpenDelay: [700, 1800, 0.12],
          afterOpenDelay: [900, 2200, 0.14],
          failedOpenDelay: [1500, 3200, 0.18],
          failedScrapeDelay: [1700, 3600, 0.2],
          betweenConversationDelay: [1100, 2600, 0.14],
          batchPauseMs: [30000, 70000],
          timeLimitPauseMs: [45000, 90000],
          batchLimitJitter: [0.7, 1.15],
          timeLimitJitter: [0.75, 1.1],
          breakEveryMin: 5,
          breakEveryMax: 9,
          longBreakMinMs: 5000,
          longBreakMaxMs: 11000
        }
      : {
          startupDelay: [1400, 3200, 0.26],
          beforeOpenDelay: [1200, 3000, 0.2],
          afterOpenDelay: [1600, 3800, 0.24],
          failedOpenDelay: [2800, 5600, 0.32],
          failedScrapeDelay: [3200, 6200, 0.34],
          betweenConversationDelay: [1800, 4400, 0.25],
          batchPauseMs: [60000, 150000],
          timeLimitPauseMs: [90000, 180000],
          batchLimitJitter: [0.65, 1.2],
          timeLimitJitter: [0.7, 1.15],
          breakEveryMin: 3,
          breakEveryMax: 5,
          longBreakMinMs: 12000,
          longBreakMaxMs: 26000
        }
  };
}

export async function loadCrawlPolicy(storageArea = chrome.storage.local) {
  const store = await storageArea.get([CRAWL_POLICY_KEY]);
  return normalizeCrawlPolicy(store[CRAWL_POLICY_KEY] || {});
}

export async function saveCrawlPolicy(policy, storageArea = chrome.storage.local) {
  const normalized = normalizeCrawlPolicy(policy);
  await storageArea.set({ [CRAWL_POLICY_KEY]: normalized });
  return normalized;
}

export async function resetCrawlPolicy(storageArea = chrome.storage.local) {
  const normalized = normalizeCrawlPolicy(CRAWL_POLICY_DEFAULTS);
  await storageArea.set({ [CRAWL_POLICY_KEY]: normalized });
  return normalized;
}