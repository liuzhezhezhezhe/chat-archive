const CONVERSATIONS_KEY = 'conversations';

async function sha256(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function conversationStorageKey(platform, conversationId) {
  return `${platform}::${conversationId}`;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function getTreeRootId(platform, conversationId) {
  return `root::${conversationStorageKey(platform, conversationId)}`;
}

function createEmptyConversationRecord(platform, conversationId, title = '') {
  return {
    platform,
    conversation_id: conversationId,
    title: title || conversationId,
    messages: [],
    message_count: 0,
    conversation_hash: '',
    tree_root_id: getTreeRootId(platform, conversationId),
    current_revision_id: null,
    revisions: [],
    updated_at: 0,
    last_checked_at: 0,
    last_changed_at: 0
  };
}

function createRevisionId(platform, conversationId) {
  if (globalThis.crypto?.randomUUID) {
    return `rev::${platform}::${conversationId}::${globalThis.crypto.randomUUID()}`;
  }
  return `rev::${platform}::${conversationId}::${Date.now()}::${Math.random().toString(16).slice(2, 10)}`;
}

async function normalizeMessages(messages) {
  const normalized = [];
  for (const msg of messages || []) {
    const role = msg.role || 'assistant';
    const content = String(msg.content || '').trim();
    if (!content) {
      continue;
    }
    const hash = msg.hash || await sha256(`${role}::${content}`);
    normalized.push({
      role,
      content,
      created_at: msg.created_at || nowSeconds(),
      hash
    });
  }
  return normalized;
}

async function buildConversationHash(messages) {
  if (!messages.length) {
    return '';
  }
  return sha256(messages.map((msg) => msg.hash).join('\n'));
}

function getCurrentRevision(record) {
  if (!Array.isArray(record?.revisions) || !record.revisions.length) {
    return null;
  }
  return record.revisions.find((revision) => revision.revision_id === record.current_revision_id)
    || record.revisions[record.revisions.length - 1]
    || null;
}

function findCommonPrefixLength(previousMessages, nextMessages) {
  const max = Math.min(previousMessages.length, nextMessages.length);
  let index = 0;
  while (index < max && previousMessages[index]?.hash === nextMessages[index]?.hash) {
    index += 1;
  }
  return index;
}

function findRevisionByHash(revisions, conversationHash) {
  return (revisions || []).find((revision) => revision.conversation_hash === conversationHash) || null;
}

function findBestParentRevision(revisions, incomingMessages) {
  let bestRevision = null;
  let bestPrefixLength = 0;

  for (const revision of revisions || []) {
    const prefixLength = findCommonPrefixLength(revision.messages || [], incomingMessages);
    if (prefixLength > bestPrefixLength) {
      bestRevision = revision;
      bestPrefixLength = prefixLength;
      continue;
    }
    if (prefixLength === bestPrefixLength && prefixLength > 0) {
      const currentSize = Array.isArray(bestRevision?.messages) ? bestRevision.messages.length : 0;
      const nextSize = Array.isArray(revision?.messages) ? revision.messages.length : 0;
      if (nextSize > currentSize) {
        bestRevision = revision;
      }
    }
  }

  return {
    revision: bestRevision,
    prefixLength: bestPrefixLength
  };
}

async function migrateConversationRecord(record, platform, conversationId, fallbackTitle = '') {
  const base = {
    ...createEmptyConversationRecord(platform, conversationId, fallbackTitle),
    ...(record || {})
  };

  if (Array.isArray(base.revisions) && base.revisions.length) {
    const currentRevision = base.revisions.find((revision) => revision.revision_id === base.current_revision_id)
      || base.revisions[base.revisions.length - 1]
      || null;
    return {
      ...base,
      title: base.title || fallbackTitle || conversationId,
      tree_root_id: base.tree_root_id || getTreeRootId(platform, conversationId),
      messages: Array.isArray(base.messages) && base.messages.length ? base.messages : (currentRevision?.messages || []),
      message_count: Number(base.message_count) || (Array.isArray(base.messages) ? base.messages.length : 0) || (currentRevision?.message_count || 0),
      conversation_hash: base.conversation_hash || currentRevision?.conversation_hash || '',
      current_revision_id: base.current_revision_id || currentRevision?.revision_id || null,
      last_checked_at: Number(base.last_checked_at) || 0,
      last_changed_at: Number(base.last_changed_at) || Number(base.updated_at) || 0
    };
  }

  const messages = await normalizeMessages(base.messages || []);
  const conversationHash = await buildConversationHash(messages);
  const createdAt = Number(base.updated_at) || nowSeconds();
  const initialRevision = messages.length ? {
    revision_id: createRevisionId(platform, conversationId),
    parent_revision_id: null,
    created_at: createdAt,
    change_type: 'imported',
    divergence_index: 0,
    message_count: messages.length,
    conversation_hash: conversationHash,
    messages
  } : null;

  return {
    ...createEmptyConversationRecord(platform, conversationId, base.title || fallbackTitle),
    ...base,
    title: base.title || fallbackTitle || conversationId,
    messages,
    message_count: messages.length,
    conversation_hash: conversationHash,
    tree_root_id: base.tree_root_id || getTreeRootId(platform, conversationId),
    current_revision_id: initialRevision?.revision_id || null,
    revisions: initialRevision ? [initialRevision] : [],
    updated_at: createdAt,
    last_checked_at: Number(base.last_checked_at) || createdAt,
    last_changed_at: Number(base.last_changed_at) || createdAt
  };
}

export async function getAllConversations() {
  const store = await chrome.storage.local.get([CONVERSATIONS_KEY]);
  return store[CONVERSATIONS_KEY] || {};
}

export async function listConversationMetas(platform) {
  const all = await getAllConversations();
  return Object.values(all)
    .filter((item) => !platform || item.platform === platform)
    .map((item) => ({
      platform: item.platform,
      conversation_id: item.conversation_id,
      title: item.title || item.conversation_id,
      updated_at: item.updated_at || 0,
      message_count: Array.isArray(item.messages) ? item.messages.length : 0,
      revision_count: Array.isArray(item.revisions) ? item.revisions.length : 0,
      current_revision_id: item.current_revision_id || null,
      last_checked_at: item.last_checked_at || 0,
      last_changed_at: item.last_changed_at || item.updated_at || 0
    }))
    .sort((a, b) => b.updated_at - a.updated_at);
}

export async function upsertConversation(conversation) {
  const all = await getAllConversations();
  const key = conversationStorageKey(conversation.platform, conversation.conversation_id);
  const existing = await migrateConversationRecord(
    all[key],
    conversation.platform,
    conversation.conversation_id,
    conversation.title || conversation.conversation_id
  );
  const incomingMessages = await normalizeMessages(conversation.messages || []);
  const incomingHash = await buildConversationHash(incomingMessages);
  const currentRevision = getCurrentRevision(existing);
  const currentMessages = currentRevision?.messages || existing.messages || [];
  const checkedAt = nowSeconds();

  let nextRecord = {
    ...existing,
    title: conversation.title || existing.title,
    last_checked_at: checkedAt
  };

  let stats = {
    addedCount: 0,
    skippedCount: incomingMessages.length,
    replacedCount: 0,
    changeType: 'unchanged',
    divergenceIndex: incomingMessages.length,
    revisionCreated: false,
    revisionId: existing.current_revision_id || null
  };

  if (!incomingMessages.length) {
    const safeRecord = {
      ...nextRecord,
      messages: currentMessages,
      message_count: currentMessages.length,
      conversation_hash: currentRevision?.conversation_hash || existing.conversation_hash || '',
      current_revision_id: currentRevision?.revision_id || existing.current_revision_id || null
    };

    all[key] = safeRecord;
    await chrome.storage.local.set({ [CONVERSATIONS_KEY]: all });

    return {
      ...safeRecord,
      stats: {
        ...stats,
        skippedCount: currentMessages.length,
        changeType: currentMessages.length ? 'empty_scrape_skipped' : 'empty',
        divergenceIndex: currentMessages.length
      }
    };
  }

  const exactRevision = incomingHash ? findRevisionByHash(existing.revisions, incomingHash) : null;

  if (incomingHash && currentRevision?.conversation_hash === incomingHash) {
    nextRecord = {
      ...nextRecord,
      messages: currentMessages,
      message_count: currentMessages.length,
      conversation_hash: incomingHash
    };
  } else if (exactRevision) {
    nextRecord = {
      ...nextRecord,
      messages: exactRevision.messages || [],
      message_count: exactRevision.message_count || (exactRevision.messages || []).length,
      conversation_hash: exactRevision.conversation_hash || incomingHash,
      current_revision_id: exactRevision.revision_id,
      updated_at: checkedAt,
      last_changed_at: checkedAt
    };
    stats = {
      ...stats,
      skippedCount: 0,
      changeType: 'switch_revision',
      divergenceIndex: findCommonPrefixLength(currentMessages, exactRevision.messages || []),
      revisionId: exactRevision.revision_id
    };
  } else {
    const { revision: parentRevision, prefixLength } = findBestParentRevision(existing.revisions, incomingMessages);
    const addedCount = Math.max(0, incomingMessages.length - prefixLength);
    const replacedCount = Math.max(0, currentMessages.length - prefixLength);
    const changeType = !existing.revisions.length
      ? 'created'
      : prefixLength === currentMessages.length && incomingMessages.length >= currentMessages.length
        ? 'append'
        : 'branch';

    const nextRevision = {
      revision_id: createRevisionId(conversation.platform, conversation.conversation_id),
      parent_revision_id: parentRevision?.revision_id || null,
      created_at: checkedAt,
      change_type: changeType,
      divergence_index: prefixLength,
      message_count: incomingMessages.length,
      conversation_hash: incomingHash,
      messages: incomingMessages
    };

    nextRecord = {
      ...nextRecord,
      messages: incomingMessages,
      message_count: incomingMessages.length,
      conversation_hash: incomingHash,
      current_revision_id: nextRevision.revision_id,
      revisions: [...(existing.revisions || []), nextRevision],
      updated_at: checkedAt,
      last_changed_at: checkedAt
    };

    stats = {
      addedCount,
      skippedCount: prefixLength,
      replacedCount,
      changeType,
      divergenceIndex: prefixLength,
      revisionCreated: true,
      revisionId: nextRevision.revision_id
    };
  }

  all[key] = nextRecord;

  await chrome.storage.local.set({ [CONVERSATIONS_KEY]: all });
  return {
    ...nextRecord,
    stats
  };
}

export async function getConversationsByIds(platform, conversationIds) {
  const all = await getAllConversations();
  const idSet = new Set(conversationIds || []);
  return Object.values(all).filter((item) => {
    if (platform && item.platform !== platform) {
      return false;
    }
    if (idSet.size === 0) {
      return true;
    }
    return idSet.has(item.conversation_id);
  });
}

export async function getConversationsByRefs(conversationRefs) {
  const all = await getAllConversations();
  const refs = Array.isArray(conversationRefs) ? conversationRefs : [];
  if (!refs.length) {
    return Object.values(all);
  }

  const keySet = new Set(
    refs
      .filter((ref) => ref?.platform && ref?.conversation_id)
      .map((ref) => conversationStorageKey(ref.platform, ref.conversation_id))
  );

  return Object.entries(all)
    .filter(([key]) => keySet.has(key))
    .map(([, conversation]) => conversation);
}

export async function clearAllConversations() {
  await chrome.storage.local.set({ [CONVERSATIONS_KEY]: {} });
}
