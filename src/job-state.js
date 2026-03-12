const CRAWL_JOBS_KEY = 'crawl_jobs_v1';

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function uniqueIds(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function mergeConversationRefs(existingRefs, nextRefs) {
  const map = new Map();
  for (const ref of existingRefs || []) {
    if (ref?.conversation_id) {
      map.set(ref.conversation_id, ref);
    }
  }
  for (const ref of nextRefs || []) {
    if (ref?.conversation_id) {
      const previous = map.get(ref.conversation_id) || {};
      map.set(ref.conversation_id, {
        ...previous,
        ...ref,
        title: ref.title || previous.title || ref.conversation_id
      });
    }
  }
  return Array.from(map.values());
}

export function createEmptyJob(platform) {
  return {
    platform,
    targetTabId: null,
    status: 'idle',
    running: false,
    abortRequested: false,
    done: 0,
    total: 0,
    currentConversationId: null,
    lastError: null,
    lastRunAt: 0,
    nextAllowedRunAt: 0,
    policyPauseReason: null,
    crawlPolicyMode: 'conservative',
    updatedAt: nowSeconds(),
    discoveredConversationRefs: [],
    pendingConversationIds: [],
    completedConversationIds: [],
    failedConversationIds: [],
    stats: {
      newMessages: 0,
      skippedMessages: 0,
      failedConversations: 0
    }
  };
}

export async function getAllJobs() {
  const store = await chrome.storage.local.get([CRAWL_JOBS_KEY]);
  return store[CRAWL_JOBS_KEY] || {};
}

export async function getJob(platform) {
  if (!platform) {
    return null;
  }
  const jobs = await getAllJobs();
  return jobs[platform] || null;
}

export async function saveJob(job) {
  const jobs = await getAllJobs();
  const nextJob = {
    ...createEmptyJob(job.platform),
    ...job,
    targetTabId: typeof job.targetTabId === 'number' ? job.targetTabId : null,
    updatedAt: nowSeconds(),
    done: (job.completedConversationIds || []).length,
    total: job.total || (job.discoveredConversationRefs || []).length,
    pendingConversationIds: uniqueIds(job.pendingConversationIds),
    completedConversationIds: uniqueIds(job.completedConversationIds),
    failedConversationIds: uniqueIds(job.failedConversationIds)
  };
  jobs[nextJob.platform] = nextJob;
  await chrome.storage.local.set({ [CRAWL_JOBS_KEY]: jobs });
  return nextJob;
}

export async function updateJob(platform, updater) {
  const current = (await getJob(platform)) || createEmptyJob(platform);
  const next = updater({ ...current, stats: { ...(current.stats || {}) } }) || current;
  return saveJob(next);
}

export function rebuildJobFromList(platform, previousJob, freshRefs) {
  const base = previousJob || createEmptyJob(platform);
  const discoveredConversationRefs = mergeConversationRefs(base.discoveredConversationRefs, freshRefs);
  const completedSet = new Set(base.completedConversationIds || []);
  const failedSet = new Set(base.failedConversationIds || []);
  const carriedPending = uniqueIds(base.pendingConversationIds || []);
  const freshIds = discoveredConversationRefs.map((ref) => ref.conversation_id).filter(Boolean);
  const pendingConversationIds = uniqueIds([...carriedPending, ...freshIds]).filter((id) => !completedSet.has(id));

  return {
    ...base,
    platform,
    discoveredConversationRefs,
    pendingConversationIds,
    completedConversationIds: Array.from(completedSet),
    failedConversationIds: Array.from(failedSet).filter((id) => !completedSet.has(id)),
    total: discoveredConversationRefs.length,
    done: (base.completedConversationIds || []).length,
    lastError: null
  };
}

export function shouldPreserveJobProgress(job) {
  const status = job?.status || 'idle';
  return status === 'running' || status === 'waiting';
}
