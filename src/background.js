import { listConversationMetas, upsertConversation, getConversationsByIds, getConversationsByRefs } from './storage.js';
import { exportJson } from './exporters.js';
import { createEmptyJob, getJob, saveJob, rebuildJobFromList } from './job-state.js';
import { appendDebugLog, getDebugLogs, clearDebugLogs } from './debug-log.js';
import { getEffectiveCrawlPolicy, loadCrawlPolicy } from './crawl-policy.js';

const activeRuns = new Map();
const EXPECTED_CONTENT_RUNTIME_VERSION = '2026-03-06-chatgpt-runtime-3';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function sleepRange(minMs, maxMs) {
  return sleep(randomInt(minMs, maxMs));
}

async function sleepHuman(minMs, maxMs, extraPauseChance = 0.15) {
  await sleepRange(minMs, maxMs);
  if (Math.random() < extraPauseChance) {
    await sleepRange(900, 2600);
  }
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function nextBreakThreshold(policy) {
  return randomInt(policy.pacingProfile.breakEveryMin, policy.pacingProfile.breakEveryMax);
}

function randomFloat(min, max) {
  return Math.random() * (Math.max(min, max) - Math.min(min, max)) + Math.min(min, max);
}

function remainingCooldownSeconds(job) {
  const nextAllowedRunAt = Number(job?.nextAllowedRunAt || 0);
  return Math.max(0, nextAllowedRunAt - nowSeconds());
}

function formatCooldownMinutes(seconds) {
  return Math.max(1, Math.ceil(seconds / 60));
}

function formatWaitSeconds(seconds) {
  if (seconds < 60) {
    return `${Math.max(1, seconds)} sec`;
  }
  return `${formatCooldownMinutes(seconds)} min`;
}

function buildCycleThresholds(policy) {
  const batchBase = policy.maxConversationsPerRunValue;
  const timeBaseMinutes = policy.maxRunMinutesValue;
  const batchJitter = policy.pacingProfile.batchLimitJitter || [1, 1];
  const timeJitter = policy.pacingProfile.timeLimitJitter || [1, 1];
  const conversationLimit = batchBase > 0
    ? Math.max(1, Math.round(batchBase * randomFloat(batchJitter[0], batchJitter[1])))
    : 0;
  const timeLimitMinutes = timeBaseMinutes > 0
    ? Math.max(1, Math.round(timeBaseMinutes * randomFloat(timeJitter[0], timeJitter[1])))
    : 0;

  return {
    conversationLimit,
    timeLimitMinutes,
    timeLimitMs: timeLimitMinutes > 0 ? timeLimitMinutes * 60 * 1000 : 0
  };
}

async function applyPolicySleep(delayTuple) {
  await sleepHuman(delayTuple[0], delayTuple[1], delayTuple[2]);
}

function shouldPauseForConversationLimit(cycleThresholds, processedCount) {
  return cycleThresholds.conversationLimit > 0 && processedCount >= cycleThresholds.conversationLimit;
}

function shouldPauseForTimeLimit(cycleThresholds, startedAtMs) {
  if (cycleThresholds.timeLimitMs <= 0) {
    return false;
  }
  return Date.now() - startedAtMs >= cycleThresholds.timeLimitMs;
}

async function savePolicyPausedJob(job, status, lastError, extra = {}) {
  return saveJob({
    ...job,
    status,
    running: false,
    abortRequested: false,
    currentConversationId: null,
    lastError,
    ...extra
  });
}

async function sleepInterruptibly(totalMs, runControl, stepMs = 1000) {
  let remainingMs = Math.max(0, totalMs);
  while (remainingMs > 0) {
    if (runControl.abortRequested) {
      return false;
    }
    const nextStep = Math.min(stepMs, remainingMs);
    await sleep(nextStep);
    remainingMs -= nextStep;
  }
  return !runControl.abortRequested;
}

async function sendToTab(tabId, type, payload = {}) {
  return chrome.tabs.sendMessage(tabId, { type, payload });
}

async function ensureFreshContentRuntime(tabId) {
  const runtimeInfo = await sendToTab(tabId, 'GET_RUNTIME_INFO');
  if (!runtimeInfo?.ok) {
    throw new Error('Content script is unavailable. Refresh the page and try again.');
  }

  if (runtimeInfo.version !== EXPECTED_CONTENT_RUNTIME_VERSION) {
    throw new Error('This page is still running an outdated content script. Refresh the page and try again.');
  }

  return runtimeInfo;
}

async function logDebug(level, scope, event, message, data = null) {
  await appendDebugLog({ level, scope, event, message, data });
}

function createRunControl(platform) {
  return {
    platform,
    abortRequested: false,
    abortLogged: false,
    lastPickedIndexHint: null,
    nearbyPickBudget: 0
  };
}

function buildConversationRefMap(job) {
  return new Map((job.discoveredConversationRefs || []).map((ref) => [ref.conversation_id, ref]));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildIndexPool(start, end, excludeStart = null, excludeEnd = null) {
  const indices = [];
  for (let index = start; index <= end; index += 1) {
    if (excludeStart !== null && excludeEnd !== null && index >= excludeStart && index <= excludeEnd) {
      continue;
    }
    indices.push(index);
  }
  return indices;
}

function pickRandomFromPool(pool, fallbackMax) {
  if (pool.length) {
    return pool[randomInt(0, pool.length - 1)];
  }
  return randomInt(0, fallbackMax);
}

function buildBrowsePattern(length) {
  if (length <= 4) {
    return {
      farJumpChance: 0.08,
      adjacentClusterChance: 0.72,
      nearbyBudgetMin: 1,
      nearbyBudgetMax: 2
    };
  }

  if (length <= 12) {
    return {
      farJumpChance: 0.16,
      adjacentClusterChance: 0.62,
      nearbyBudgetMin: 1,
      nearbyBudgetMax: 2
    };
  }

  if (length <= 30) {
    return {
      farJumpChance: 0.26,
      adjacentClusterChance: 0.52,
      nearbyBudgetMin: 1,
      nearbyBudgetMax: 3
    };
  }

  return {
    farJumpChance: 0.34,
    adjacentClusterChance: 0.44,
    nearbyBudgetMin: 1,
    nearbyBudgetMax: 3
  };
}

function pickNextConversation(job, conversationRefMap, runControl) {
  const pendingIds = Array.isArray(job?.pendingConversationIds) ? job.pendingConversationIds.filter(Boolean) : [];
  if (!pendingIds.length) {
    return null;
  }

  const browsePattern = buildBrowsePattern(pendingIds.length);

  if (pendingIds.length === 1) {
    const conversationId = pendingIds[0];
    runControl.lastPickedIndexHint = 0;
    runControl.nearbyPickBudget = 0;
    return {
      conversationId,
      pickedIndex: 0,
      strategy: 'single',
      conversationRef: conversationRefMap.get(conversationId) || {
        conversation_id: conversationId,
        title: conversationId
      }
    };
  }

  const maxIndex = pendingIds.length - 1;
  const anchorIndex = Number.isInteger(runControl.lastPickedIndexHint)
    ? clamp(runControl.lastPickedIndexHint, 0, maxIndex)
    : null;
  let pickedIndex = randomInt(0, maxIndex);
  let strategy = 'random';

  if (anchorIndex !== null) {
    const nearStart = clamp(anchorIndex - 2, 0, maxIndex);
    const nearEnd = clamp(anchorIndex + 2, 0, maxIndex);
    const nearPool = buildIndexPool(nearStart, nearEnd);
    const farPool = buildIndexPool(0, maxIndex, nearStart, nearEnd);

    if (runControl.nearbyPickBudget > 0 && nearPool.length) {
      pickedIndex = pickRandomFromPool(nearPool, maxIndex);
      runControl.nearbyPickBudget -= 1;
      strategy = 'nearby_followup';
    } else {
      const roll = Math.random();
      if (farPool.length >= 2 && roll < browsePattern.farJumpChance) {
        pickedIndex = pickRandomFromPool(farPool, maxIndex);
        runControl.nearbyPickBudget = 0;
        strategy = 'far_jump';
      } else if (nearPool.length >= 2 && roll < browsePattern.farJumpChance + browsePattern.adjacentClusterChance) {
        pickedIndex = pickRandomFromPool(nearPool, maxIndex);
        runControl.nearbyPickBudget = randomInt(browsePattern.nearbyBudgetMin, browsePattern.nearbyBudgetMax);
        strategy = 'adjacent_cluster';
      } else {
        pickedIndex = randomInt(0, maxIndex);
        runControl.nearbyPickBudget = 0;
        strategy = 'random';
      }
    }
  }

  const conversationId = pendingIds[pickedIndex];
  runControl.lastPickedIndexHint = pickedIndex;
  return {
    conversationId,
    pickedIndex,
    strategy,
    conversationRef: conversationRefMap.get(conversationId) || {
      conversation_id: conversationId,
      title: conversationId
    }
  };
}

function inferPlatformFromUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.host || '';
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
      return 'chatgpt';
    }
    if (host.includes('gemini.google.com')) {
      return 'gemini';
    }
  } catch {
    return null;
  }
  return null;
}

async function getStatusForPlatform(platform) {
  if (!platform) {
    return createEmptyJob('unknown');
  }

  const stored = (await getJob(platform)) || createEmptyJob(platform);
  const running = Array.from(activeRuns.values()).some((run) => run.platform === platform);
  const abortRequested = Array.from(activeRuns.values()).some((run) => run.platform === platform && run.abortRequested);
  const effectiveStatus = abortRequested && running
    ? 'aborting'
    : running && ['idle', 'aborted', 'completed', 'error'].includes(stored.status)
      ? 'running'
      : stored.status;

  return {
    ...stored,
    status: effectiveStatus,
    running,
    abortRequested,
    cooldownRemainingSeconds: remainingCooldownSeconds(stored),
    done: (stored.completedConversationIds || []).length,
    total: stored.total || (stored.discoveredConversationRefs || []).length
  };
}

async function finalizeAbortIfRequested(job, runControl, platform) {
  if (!runControl.abortRequested) {
    return null;
  }

  if (!runControl.abortLogged) {
    await logDebug('warn', 'background', 'crawl_aborted', `Aborted crawling ${platform}.`, {
      pending: job.pendingConversationIds.length
    });
    runControl.abortLogged = true;
  }

  return saveJob({
    ...job,
    status: 'aborted',
    running: false,
    abortRequested: true,
    currentConversationId: null,
    nextAllowedRunAt: 0,
    policyPauseReason: null,
    lastError: job.lastError || 'Crawling was aborted.'
  });
}

async function refreshJobQueue(tabId, platform) {
  const stored = (await getJob(platform)) || createEmptyJob(platform);
  const previous = stored.status === 'completed' || stored.status === 'idle'
    ? createEmptyJob(platform)
    : stored;
  const list = await sendToTab(tabId, 'SCRAPE_LIST_FULL');
  if (!list?.ok || !Array.isArray(list.conversations)) {
    throw new Error('Failed to scrape the conversation list.');
  }

  const nextJob = rebuildJobFromList(platform, previous, list.conversations);
  await logDebug('info', 'background', 'queue_refreshed', `Refreshed the ${platform} conversation queue.`, {
    total: nextJob.discoveredConversationRefs.length,
    pending: nextJob.pendingConversationIds.length,
    completed: nextJob.completedConversationIds.length
  });
  nextJob.status = nextJob.pendingConversationIds.length ? 'queued' : 'completed';
  nextJob.running = false;
  nextJob.abortRequested = false;
  return saveJob(nextJob);
}

async function autoPauseRun(job, runControl, policy, reason) {
  const pauseRange = reason === 'time_limit'
    ? policy.pacingProfile.timeLimitPauseMs
    : policy.pacingProfile.batchPauseMs;
  const pauseMs = randomInt(pauseRange[0], pauseRange[1]);
  const resumeAt = nowSeconds() + Math.ceil(pauseMs / 1000);
  const reasonText = reason === 'time_limit'
    ? 'Reached the single-run time limit'
    : 'Reached the single-run batch limit';

  const pausedJob = await saveJob({
    ...job,
    status: 'waiting',
    running: true,
    abortRequested: false,
    currentConversationId: null,
    nextAllowedRunAt: resumeAt,
    policyPauseReason: reason,
    lastError: `${reasonText}. Resume after ${formatWaitSeconds(Math.ceil(pauseMs / 1000))}.`
  });

  await logDebug('info', 'background', 'crawl_auto_pause', `Triggered an automatic pause for ${job.platform}.`, {
    platform: job.platform,
    reason,
    pauseMs,
    resumeAt
  });

  const completed = await sleepInterruptibly(pauseMs, runControl);
  if (!completed) {
    const abortedJob = await saveJob({
      ...pausedJob,
      status: 'aborted',
      running: false,
      abortRequested: true,
      currentConversationId: null,
      nextAllowedRunAt: 0,
      policyPauseReason: null,
      lastError: 'Crawling was aborted during the automatic pause.'
    });
    return {
      aborted: true,
      job: abortedJob
    };
  }

  const resumedJob = await saveJob({
    ...pausedJob,
    status: 'running',
    running: true,
    abortRequested: false,
    currentConversationId: null,
    nextAllowedRunAt: 0,
    policyPauseReason: null,
    lastError: null
  });

  await logDebug('info', 'background', 'crawl_auto_resume', `Automatic pause finished. Resuming ${job.platform}.`, {
    platform: job.platform,
    reason
  });

  return {
    aborted: false,
    job: resumedJob
  };
}

async function runCrawl(tabId, platform) {
  const runControl = createRunControl(platform);
  activeRuns.set(tabId, runControl);
  await logDebug('info', 'background', 'crawl_started', `Started crawling ${platform}.`, { tabId, platform });

  try {
    const policy = getEffectiveCrawlPolicy(await loadCrawlPolicy());
    let job = await refreshJobQueue(tabId, platform);
    const cooldownSeconds = remainingCooldownSeconds(job);
    if (cooldownSeconds > 0) {
      throw new Error(`Crawling is on cooldown. Try again in ${formatCooldownMinutes(cooldownSeconds)} min.`);
    }

    let conversationRefMap = buildConversationRefMap(job);
    let cycleThresholds = buildCycleThresholds(policy);
    let processedSinceBreak = 0;
    let nextBreakAfter = nextBreakThreshold(policy);
    let processedThisRun = 0;
    let consecutiveFailures = 0;
    let startedAtMs = Date.now();

    job = await saveJob({
      ...job,
      status: job.pendingConversationIds.length ? 'running' : 'completed',
      running: true,
      abortRequested: false,
      lastRunAt: Math.floor(Date.now() / 1000),
      currentConversationId: null,
      lastError: null,
      nextAllowedRunAt: 0,
      policyPauseReason: null,
      crawlPolicyMode: policy.mode
    });

    await logDebug('info', 'background', 'crawl_policy_loaded', `Loaded the ${policy.mode} crawl policy.`, {
      mode: policy.mode,
      maxConversationsPerRun: policy.maxConversationsPerRunValue,
      maxRunMinutes: policy.maxRunMinutesValue,
      cycleConversationLimit: cycleThresholds.conversationLimit,
      cycleTimeLimitMinutes: cycleThresholds.timeLimitMinutes,
      failureStreakThreshold: policy.failureStreakThresholdValue,
      cooldownMinutes: policy.cooldownMinutesValue
    });

    await applyPolicySleep(policy.pacingProfile.startupDelay);

    while (job.pendingConversationIds.length > 0) {
      if (shouldPauseForConversationLimit(cycleThresholds, processedThisRun)) {
        await logDebug('info', 'background', 'crawl_pause_threshold', `Reached the conversation limit for this cycle. Pausing ${platform}.`, {
          processedThisRun,
          limit: cycleThresholds.conversationLimit,
          configuredBaseLimit: policy.maxConversationsPerRunValue
        });
        const pauseResult = await autoPauseRun(job, runControl, policy, 'conversation_limit');
        if (pauseResult.aborted) {
          return pauseResult.job;
        }
        job = await refreshJobQueue(tabId, platform);
        conversationRefMap = buildConversationRefMap(job);
        cycleThresholds = buildCycleThresholds(policy);
        processedThisRun = 0;
        processedSinceBreak = 0;
        nextBreakAfter = nextBreakThreshold(policy);
        startedAtMs = Date.now();
        await logDebug('info', 'background', 'crawl_cycle_reseeded', `Reset thresholds for the next ${platform} cycle.`, {
          platform,
          cycleConversationLimit: cycleThresholds.conversationLimit,
          cycleTimeLimitMinutes: cycleThresholds.timeLimitMinutes
        });
        continue;
      }

      if (shouldPauseForTimeLimit(cycleThresholds, startedAtMs)) {
        await logDebug('info', 'background', 'crawl_pause_threshold', `Reached the time limit for this cycle. Pausing ${platform}.`, {
          elapsedMs: Date.now() - startedAtMs,
          limitMinutes: cycleThresholds.timeLimitMinutes,
          configuredBaseLimitMinutes: policy.maxRunMinutesValue
        });
        const pauseResult = await autoPauseRun(job, runControl, policy, 'time_limit');
        if (pauseResult.aborted) {
          return pauseResult.job;
        }
        job = await refreshJobQueue(tabId, platform);
        conversationRefMap = buildConversationRefMap(job);
        cycleThresholds = buildCycleThresholds(policy);
        processedThisRun = 0;
        processedSinceBreak = 0;
        nextBreakAfter = nextBreakThreshold(policy);
        startedAtMs = Date.now();
        await logDebug('info', 'background', 'crawl_cycle_reseeded', `Reset thresholds for the next ${platform} cycle.`, {
          platform,
          cycleConversationLimit: cycleThresholds.conversationLimit,
          cycleTimeLimitMinutes: cycleThresholds.timeLimitMinutes
        });
        continue;
      }

      if (runControl.abortRequested) {
        return finalizeAbortIfRequested(job, runControl, platform);
      }

      const nextConversation = pickNextConversation(job, conversationRefMap, runControl);
      if (!nextConversation) {
        break;
      }

      const { conversationId, pickedIndex, strategy, conversationRef } = nextConversation;

      await logDebug('info', 'background', 'conversation_picked', `Picked the next conversation ${conversationId}.`, {
        platform,
        conversationId,
        pickedIndex,
        strategy,
        pendingCount: job.pendingConversationIds.length,
        remainingPending: job.pendingConversationIds.length
      });

      job = await saveJob({
        ...job,
        status: 'running',
        running: true,
        abortRequested: false,
        currentConversationId: conversationId,
        lastError: null
      });

      await applyPolicySleep(policy.pacingProfile.beforeOpenDelay);

      const abortedBeforeOpen = await finalizeAbortIfRequested(job, runControl, platform);
      if (abortedBeforeOpen) {
        return abortedBeforeOpen;
      }

      const opened = await sendToTab(tabId, 'OPEN_CONVERSATION', { conversationId });
      const abortedAfterOpen = await finalizeAbortIfRequested(job, runControl, platform);
      if (abortedAfterOpen) {
        return abortedAfterOpen;
      }
      if (!opened?.ok) {
        await logDebug('warn', 'background', 'open_conversation_failed', `Failed to open conversation ${conversationId}.`, {
          platform,
          conversationId
        });
        job = await saveJob({
          ...job,
          running: true,
          currentConversationId: null,
          pendingConversationIds: job.pendingConversationIds.filter((id) => id !== conversationId),
          failedConversationIds: [...(job.failedConversationIds || []), conversationId],
          stats: {
            ...(job.stats || {}),
            failedConversations: (job.stats?.failedConversations || 0) + 1
          },
          lastError: `Failed to open conversation: ${conversationId}`
        });
        processedSinceBreak += 1;
        processedThisRun += 1;
        consecutiveFailures += 1;

        if (consecutiveFailures >= policy.failureStreakThresholdValue) {
          const nextAllowedRunAt = nowSeconds() + policy.cooldownMinutesValue * 60;
          await logDebug('warn', 'background', 'crawl_cooldown_started', `Too many consecutive failures for ${platform}. Starting cooldown.`, {
            consecutiveFailures,
            cooldownMinutes: policy.cooldownMinutesValue,
            nextAllowedRunAt
          });
          return savePolicyPausedJob(job, 'cooldown', `Too many consecutive failures (${consecutiveFailures}). Cooling down for ${policy.cooldownMinutesValue} min.`, {
            nextAllowedRunAt,
            policyPauseReason: 'failure_cooldown'
          });
        }

        await applyPolicySleep(policy.pacingProfile.failedOpenDelay);
        continue;
      }

      await applyPolicySleep(policy.pacingProfile.afterOpenDelay);

      const abortedBeforeScrape = await finalizeAbortIfRequested(job, runControl, platform);
      if (abortedBeforeScrape) {
        return abortedBeforeScrape;
      }

      const scraped = await sendToTab(tabId, 'SCRAPE_ACTIVE_CONVERSATION', {
        conversationId,
        title: conversationRef.title
      });
      const abortedAfterScrape = await finalizeAbortIfRequested(job, runControl, platform);
      if (abortedAfterScrape) {
        return abortedAfterScrape;
      }

      const scrapedMessages = Array.isArray(scraped?.conversation?.messages) ? scraped.conversation.messages : [];

      if (!scraped?.ok || !scraped.conversation || !scrapedMessages.length) {
        await logDebug('warn', 'background', 'scrape_conversation_failed', `Failed to scrape conversation ${conversationId}.`, {
          platform,
          conversationId,
          emptyMessages: scraped?.ok && scraped?.conversation ? scrapedMessages.length === 0 : false
        });
        job = await saveJob({
          ...job,
          running: true,
          currentConversationId: null,
          pendingConversationIds: job.pendingConversationIds.filter((id) => id !== conversationId),
          failedConversationIds: [...(job.failedConversationIds || []), conversationId],
          stats: {
            ...(job.stats || {}),
            failedConversations: (job.stats?.failedConversations || 0) + 1
          },
          lastError: `Failed to scrape conversation: ${conversationId}`
        });
        processedSinceBreak += 1;
        processedThisRun += 1;
        consecutiveFailures += 1;

        if (consecutiveFailures >= policy.failureStreakThresholdValue) {
          const nextAllowedRunAt = nowSeconds() + policy.cooldownMinutesValue * 60;
          await logDebug('warn', 'background', 'crawl_cooldown_started', `Too many consecutive failures for ${platform}. Starting cooldown.`, {
            consecutiveFailures,
            cooldownMinutes: policy.cooldownMinutesValue,
            nextAllowedRunAt
          });
          return savePolicyPausedJob(job, 'cooldown', `Too many consecutive failures (${consecutiveFailures}). Cooling down for ${policy.cooldownMinutesValue} min.`, {
            nextAllowedRunAt,
            policyPauseReason: 'failure_cooldown'
          });
        }

        await applyPolicySleep(policy.pacingProfile.failedScrapeDelay);
        continue;
      }

      consecutiveFailures = 0;

      const savedConversation = await upsertConversation({
        platform,
        conversation_id: scraped.conversation.conversation_id,
        title: scraped.conversation.title || conversationRef.title,
        messages: scrapedMessages,
        updated_at: Math.floor(Date.now() / 1000)
      });

      await logDebug('info', 'background', 'conversation_saved', `Saved conversation ${conversationId}.`, {
        platform,
        conversationId,
        added: savedConversation.stats?.addedCount || 0,
        skipped: savedConversation.stats?.skippedCount || 0,
        replaced: savedConversation.stats?.replacedCount || 0,
        changeType: savedConversation.stats?.changeType || 'unknown',
        divergenceIndex: savedConversation.stats?.divergenceIndex ?? -1,
        revisionId: savedConversation.stats?.revisionId || null
      });

      job = await saveJob({
        ...job,
        running: true,
        currentConversationId: null,
        pendingConversationIds: job.pendingConversationIds.filter((id) => id !== conversationId),
        completedConversationIds: [...(job.completedConversationIds || []), conversationId],
        failedConversationIds: (job.failedConversationIds || []).filter((id) => id !== conversationId),
        discoveredConversationRefs: (job.discoveredConversationRefs || []).map((ref) => {
          if (ref.conversation_id !== conversationId) {
            return ref;
          }
          return {
            ...ref,
            title: savedConversation.title || ref.title
          };
        }),
        stats: {
          ...(job.stats || {}),
          newMessages: (job.stats?.newMessages || 0) + (savedConversation.stats?.addedCount || 0),
          skippedMessages: (job.stats?.skippedMessages || 0) + (savedConversation.stats?.skippedCount || 0)
        },
        lastError: null
      });

      processedSinceBreak += 1;
      processedThisRun += 1;

      if (processedSinceBreak >= nextBreakAfter) {
        await logDebug('info', 'background', 'crawl_human_break', `Inserted a human-like pause while crawling ${platform}.`, {
          processedSinceBreak,
          nextBreakAfter
        });
        await sleepRange(policy.pacingProfile.longBreakMinMs, policy.pacingProfile.longBreakMaxMs);
        processedSinceBreak = 0;
        nextBreakAfter = nextBreakThreshold(policy);
      } else {
        await applyPolicySleep(policy.pacingProfile.betweenConversationDelay);
      }
    }

    await logDebug('info', 'background', 'crawl_completed', `Completed crawling ${platform}.`, {
      completed: job.completedConversationIds.length,
      failed: job.failedConversationIds.length,
      newMessages: job.stats?.newMessages || 0,
      skippedMessages: job.stats?.skippedMessages || 0
    });
    return saveJob({
      ...job,
      status: 'completed',
      running: false,
      abortRequested: false,
      currentConversationId: null,
      lastError: null
    });
  } catch (error) {
    await logDebug('error', 'background', 'crawl_error', `Crawling ${platform} failed.`, {
      error: error instanceof Error ? error.message : String(error)
    });
    const current = (await getJob(platform)) || createEmptyJob(platform);
    return saveJob({
      ...current,
      status: 'error',
      running: false,
      currentConversationId: null,
      lastError: error instanceof Error ? error.message : String(error)
    });
  } finally {
    activeRuns.delete(tabId);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const run = async () => {
    const action = message?.action;

    if (action === 'START_CRAWL') {
      const tabId = message?.tabId ?? sender?.tab?.id;
      if (typeof tabId !== 'number') {
        throw new Error('Target tab was not found.');
      }

      const runtimeInfo = await ensureFreshContentRuntime(tabId);
      await logDebug('info', 'background', 'content_runtime_ready', 'Content runtime check passed.', runtimeInfo);

      const detected = await sendToTab(tabId, 'DETECT_PLATFORM');
      const tab = await chrome.tabs.get(tabId);
      const platform = detected?.ok && detected.platform ? detected.platform : inferPlatformFromUrl(tab?.url || '');
      if (!platform) {
        throw new Error('Could not detect the current platform.');
      }

      const currentJob = (await getJob(platform)) || createEmptyJob(platform);
      const cooldownSeconds = remainingCooldownSeconds(currentJob);
      if (cooldownSeconds > 0) {
        throw new Error(`This platform is on cooldown. Try again in ${formatCooldownMinutes(cooldownSeconds)} min.`);
      }

      if (!activeRuns.has(tabId)) {
        await saveJob({
          ...currentJob,
          platform,
          status: 'running',
          running: true,
          abortRequested: false,
          lastRunAt: nowSeconds(),
          currentConversationId: null,
          lastError: null,
          nextAllowedRunAt: 0,
          policyPauseReason: null
        });
        void runCrawl(tabId, platform);
      } else {
        await logDebug('info', 'background', 'crawl_resume_requested', `Ignored a duplicate start request because ${platform} is already running.`, {
          tabId,
          platform
        });
      }

      const state = await getStatusForPlatform(platform);
      return { ok: true, state };
    }

    if (action === 'ABORT_CRAWL') {
      const tabId = message?.tabId;
      const platform = message?.platform || null;
      const active = typeof tabId === 'number' ? activeRuns.get(tabId) : null;
      const hasActiveRun = Boolean(active);
      if (active) {
        active.abortRequested = true;
      }

      await logDebug('warn', 'background', 'abort_requested', `Received an abort request for ${platform || 'unknown'}.`, {
        tabId,
        platform
      });

      if (platform) {
        const current = (await getJob(platform)) || createEmptyJob(platform);
        const nextStatus = hasActiveRun ? 'aborting' : 'aborted';
        await saveJob({
          ...current,
          status: nextStatus,
          running: hasActiveRun,
          abortRequested: hasActiveRun,
          currentConversationId: hasActiveRun ? current.currentConversationId : null,
          lastError: hasActiveRun ? current.lastError : (current.lastError || 'Crawling was aborted.'),
          nextAllowedRunAt: hasActiveRun ? current.nextAllowedRunAt : 0,
          policyPauseReason: hasActiveRun ? current.policyPauseReason : null
        });

        await logDebug('info', 'background', 'abort_state_updated', `Updated abort state for ${platform}.`, {
          tabId,
          platform,
          hasActiveRun,
          nextStatus
        });
      }

      return { ok: true };
    }

    if (action === 'GET_STATUS') {
      const platform = message?.platform || null;
      const state = await getStatusForPlatform(platform);
      return { ok: true, state };
    }

    if (action === 'GET_CRAWL_POLICY') {
      const policy = await loadCrawlPolicy();
      return { ok: true, policy };
    }

    if (action === 'LIST_CONVERSATIONS') {
      const platform = message?.platform || null;
      const conversations = await listConversationMetas(platform);
      return { ok: true, conversations };
    }

    if (action === 'EXPORT_JSON') {
      const platform = message?.platform || null;
      const conversationIds = message?.conversationIds || [];
      const conversationRefs = message?.conversationRefs || [];
      const conversations = conversationRefs.length
        ? await getConversationsByRefs(conversationRefs)
        : await getConversationsByIds(platform, conversationIds);
      await exportJson(conversations);
      await logDebug('info', 'background', 'export_json', 'Exported JSON.', {
        platform,
        count: conversations.length
      });
      return { ok: true, count: conversations.length };
    }

    if (action === 'APPEND_DEBUG_LOG') {
      await logDebug(
        message?.entry?.level || 'info',
        message?.entry?.scope || 'external',
        message?.entry?.event || 'custom',
        message?.entry?.message || '',
        message?.entry?.data || null
      );
      return { ok: true };
    }

    if (action === 'GET_DEBUG_LOGS') {
      const logs = await getDebugLogs();
      return { ok: true, logs };
    }

    if (action === 'CLEAR_DEBUG_LOGS') {
      await clearDebugLogs();
      return { ok: true };
    }

    throw new Error(`Unknown action: ${action}`);
  };

  run()
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});
