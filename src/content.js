function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CHAT_ARCHIVE_CONTENT_RUNTIME_VERSION = '2026-03-06-chatgpt-runtime-3';

function randomInt(min, max) {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function sleepRange(minMs, maxMs) {
  return sleep(randomInt(minMs, maxMs));
}

function chance(probability) {
  return Math.random() < probability;
}

async function logDebug(event, message, data = null, level = 'info') {
  try {
    await chrome.runtime.sendMessage({
      action: 'APPEND_DEBUG_LOG',
      entry: {
        level,
        scope: 'content',
        event,
        message,
        data
      }
    });
  } catch {
    // Ignore logging failures so they don't affect crawling.
  }
}

function trunc(text, size = 120) {
  const value = (text || '').trim();
  if (value.length <= size) {
    return value;
  }
  return `${value.slice(0, size - 1)}…`;
}

function queryOptional(selector) {
  return selector ? document.querySelector(selector) : null;
}

function isScrollable(node) {
  if (!node || node === document.body || node === document.documentElement) {
    return false;
  }

  const style = window.getComputedStyle(node);
  const overflowY = style?.overflowY || '';
  if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
    return true;
  }

  return (node.scrollHeight || 0) > (node.clientHeight || 0) + 1;
}

function findScrollableAncestor(node) {
  let current = node;
  while (current && current !== document.body && current !== document.documentElement) {
    if (isScrollable(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function getListStrategy(adapter) {
  return {
    itemSelector: '',
    scrollContainerSelector: '',
    nextPageSelector: '',
    endSelector: '',
    maxRounds: 200,
    idleRounds: 4,
    stepDelayMs: 800,
    ...(adapter.getListStrategy ? adapter.getListStrategy() : {})
  };
}

function getMessageStrategy(adapter) {
  return {
    scrollContainerSelector: '',
    maxRounds: 40,
    stableRounds: 3,
    stepDelayMs: 600,
    ...(adapter.getMessageStrategy ? adapter.getMessageStrategy() : {})
  };
}

function getScrollContainer(selector) {
  const node = queryOptional(selector);
  if (node) {
    return findScrollableAncestor(node) || node;
  }
  return document.scrollingElement || document.documentElement;
}

function getContainerViewportHeight(container) {
  if (container === document.body || container === document.documentElement || container === document.scrollingElement) {
    return window.innerHeight || container.clientHeight || 0;
  }
  return container.clientHeight || 0;
}

function getContainerScrollTop(container) {
  if (container === document.body || container === document.documentElement || container === document.scrollingElement) {
    return window.scrollY || container.scrollTop || 0;
  }
  return container.scrollTop || 0;
}

function getContainerMaxScrollTop(container) {
  return Math.max(0, (container.scrollHeight || 0) - getContainerViewportHeight(container));
}

function setContainerScrollTop(container, top) {
  const nextTop = Math.max(0, top);
  if (typeof container.scrollTo === 'function') {
    container.scrollTo({ top: nextTop, behavior: 'auto' });
  } else {
    container.scrollTop = nextTop;
  }

  if (container === document.body || container === document.documentElement || container === document.scrollingElement) {
    window.scrollTo(0, nextTop);
  }
}

function getAdapterMessageSelector(adapter) {
  return adapter.getDebugConfig?.().effective?.messageSelector || '';
}

function isDisabledControl(node) {
  if (!node) {
    return true;
  }
  return Boolean(
    node.disabled ||
    node.getAttribute('disabled') !== null ||
    node.getAttribute('aria-disabled') === 'true'
  );
}

async function performListLoadStep(strategy) {
  const container = getScrollContainer(strategy.scrollContainerSelector);
  const beforeCount = strategy.itemSelector ? document.querySelectorAll(strategy.itemSelector).length : 0;
  const beforeHeight = container.scrollHeight || 0;
  const beforeTop = getContainerScrollTop(container);
  const viewportHeight = Math.max(getContainerViewportHeight(container), 1);
  const maxTop = getContainerMaxScrollTop(container);
  const stepSize = Math.max(420, Math.round(viewportHeight * (0.7 + Math.random() * 0.75)));
  const targetTop = Math.min(maxTop, beforeTop + stepSize);

  setContainerScrollTop(container, targetTop);
  if (chance(0.18) && targetTop > beforeTop + 120) {
    await sleepRange(90, 240);
    setContainerScrollTop(container, Math.max(beforeTop, targetTop - randomInt(50, 180)));
    await sleepRange(70, 180);
    setContainerScrollTop(container, targetTop);
  }
  await sleepRange(Math.max(450, strategy.stepDelayMs - 220), strategy.stepDelayMs + 650);

  let afterCount = strategy.itemSelector ? document.querySelectorAll(strategy.itemSelector).length : 0;
  let progressed = afterCount > beforeCount || (container.scrollHeight || 0) > beforeHeight;

  if (!progressed && strategy.nextPageSelector) {
    const nextButton = queryOptional(strategy.nextPageSelector);
    if (nextButton && !isDisabledControl(nextButton)) {
      nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await sleepRange(Math.max(500, strategy.stepDelayMs - 120), strategy.stepDelayMs + 900);
      afterCount = strategy.itemSelector ? document.querySelectorAll(strategy.itemSelector).length : 0;
      progressed = afterCount > beforeCount;
    }
  }

  const endReached = Boolean(strategy.endSelector && queryOptional(strategy.endSelector));
  return { progressed, endReached };
}

async function loadConversationMessages(adapter) {
  const strategy = getMessageStrategy(adapter);
  const container = getScrollContainer(strategy.scrollContainerSelector);
  const messageSelector = getAdapterMessageSelector(adapter);
  let stable = 0;
  let lastSignature = '';

  for (let step = 0; step < strategy.maxRounds; step += 1) {
    const beforeTop = getContainerScrollTop(container);
    const beforeHeight = container.scrollHeight || 0;
    const beforeCount = messageSelector ? document.querySelectorAll(messageSelector).length : 0;
    const viewportHeight = Math.max(getContainerViewportHeight(container), 1);
    const stepSize = Math.max(360, Math.round(viewportHeight * (0.55 + Math.random() * 0.65)));
    const targetTop = Math.max(0, beforeTop - stepSize);

    setContainerScrollTop(container, targetTop);
    if (chance(0.14) && beforeTop - targetTop > 180) {
      await sleepRange(90, 220);
      setContainerScrollTop(container, Math.min(beforeTop, targetTop + randomInt(40, 140)));
      await sleepRange(70, 180);
      setContainerScrollTop(container, targetTop);
    }
    await sleepRange(Math.max(420, strategy.stepDelayMs - 180), strategy.stepDelayMs + 820);

    const afterTop = getContainerScrollTop(container);
    const afterHeight = container.scrollHeight || 0;
    const afterCount = messageSelector ? document.querySelectorAll(messageSelector).length : beforeCount;
    const reachedTop = afterTop <= 2;

    if (reachedTop) {
      await sleepRange(850, 1900);
    }

    const signature = `${Math.round(afterTop)}:${afterHeight}:${afterCount}`;
    const unchanged = afterHeight === beforeHeight && afterCount === beforeCount && Math.abs(afterTop - beforeTop) < 4;
    const exhausted = reachedTop && afterHeight === beforeHeight && afterCount === beforeCount;

    if (signature === lastSignature || unchanged || exhausted) {
      stable += 1;
    } else {
      stable = 0;
    }
    lastSignature = signature;

    if (stable >= strategy.stableRounds) {
      break;
    }
  }
}

function uniqueConversationRefs(items) {
  const map = new Map();
  for (const item of items) {
    if (!item?.conversation_id) {
      continue;
    }
    if (!map.has(item.conversation_id)) {
      map.set(item.conversation_id, item);
    }
  }
  return Array.from(map.values());
}

async function scrapeConversationList(adapter) {
  const strategy = getListStrategy(adapter);
  await logDebug('list_scrape_started', `Started collecting the ${adapter.platform} conversation list.`, {
    platform: adapter.platform,
    strategy,
    config: adapter.getDebugConfig ? adapter.getDebugConfig() : null
  });
  const found = new Map();
  let stagnantRounds = 0;

  for (let round = 0; round < strategy.maxRounds; round += 1) {
    const refs = uniqueConversationRefs(adapter.getConversationRefs());
    const before = found.size;
    for (const ref of refs) {
      found.set(ref.conversation_id, ref);
    }

    if (found.size === before) {
      stagnantRounds += 1;
    } else {
      stagnantRounds = 0;
    }

    const stepResult = await performListLoadStep(strategy);
    if (stepResult.endReached && stagnantRounds >= 1) {
      break;
    }

    if (!stepResult.progressed && stagnantRounds >= Math.max(2, strategy.idleRounds - 1)) {
      break;
    }

    if (stagnantRounds >= strategy.idleRounds) {
      break;
    }

    await sleep(500);
  }

  const result = Array.from(found.values());
  await logDebug('list_scrape_completed', `Completed collecting the ${adapter.platform} conversation list.`, {
    platform: adapter.platform,
    total: result.length
  });
  return result;
}

async function scrapeActiveConversation(adapter, fallbackConversationId, fallbackTitle) {
  const ready = await adapter.waitConversationReady();
  if (!ready) {
    return null;
  }

  await loadConversationMessages(adapter);
  const messages = adapter.getMessages();
  const conversationId = adapter.getActiveConversationId() || fallbackConversationId;

  if (!conversationId) {
    return null;
  }

  return {
    conversation_id: conversationId,
    title: fallbackTitle || conversationId,
    messages
  };
}

function inspectSelectors(adapter) {
  const cfg = adapter.getDebugConfig ? adapter.getDebugConfig() : {};
  const refs = uniqueConversationRefs(adapter.getConversationRefs());
  const messages = adapter.getMessages().slice(0, 5).map((msg) => ({
    role: msg.role,
    content: trunc(msg.content, 80)
  }));

  return {
    platform: adapter.platform,
    config: cfg,
    counts: {
      conversationLinks: cfg.conversationLinkSelector ? document.querySelectorAll(cfg.conversationLinkSelector).length : 0,
      listContainerFound: Boolean(queryOptional(cfg.listContainerSelector)),
      readySelectorFound: Boolean(queryOptional(cfg.readySelector)),
      messageNodes: cfg.messageSelector ? document.querySelectorAll(cfg.messageSelector).length : 0,
      userMessageNodes: cfg.userMessageSelector ? document.querySelectorAll(cfg.userMessageSelector).length : 0
    },
    activeConversationId: adapter.getActiveConversationId(),
    conversationPreview: refs.slice(0, 5),
    messagePreview: messages
  };
}

async function previewActiveConversation(adapter) {
  const conversation = await scrapeActiveConversation(adapter, adapter.getActiveConversationId(), document.title);
  if (!conversation) {
    await logDebug('preview_failed', `Could not preview the current ${adapter.platform} conversation.`, {
      platform: adapter.platform
    }, 'warn');
    return null;
  }

  await logDebug('preview_completed', `Previewed the current ${adapter.platform} conversation.`, {
    platform: adapter.platform,
    conversationId: conversation.conversation_id,
    messageCount: conversation.messages.length
  });
  return {
    conversation_id: conversation.conversation_id,
    title: conversation.title,
    messageCount: conversation.messages.length,
    messages: conversation.messages.slice(0, 6).map((msg) => ({
      role: msg.role,
      content: trunc(msg.content, 120)
    }))
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const run = async () => {
    const selectorConfig = window.ArchiveSelectorConfigStore;
    if (selectorConfig?.ensureLoaded) {
      await selectorConfig.ensureLoaded();
    }

    const adapterGetter = window.getArchiveAdapterByLocation;
    const adapter = typeof adapterGetter === 'function' ? adapterGetter(window.location) : null;
    const type = message?.type;

    if (type === 'GET_RUNTIME_INFO') {
      return {
        ok: true,
        version: CHAT_ARCHIVE_CONTENT_RUNTIME_VERSION,
        url: window.location.href,
        platform: adapter?.platform || null
      };
    }

    if (type === 'DETECT_PLATFORM') {
      if (!adapter) {
        return { ok: false, platform: null };
      }
      return { ok: true, platform: adapter.platform };
    }

    if (!adapter) {
      throw new Error('This page is not supported.');
    }

    if (type === 'SCRAPE_LIST_FULL') {
      const conversations = await scrapeConversationList(adapter);
      return { ok: true, conversations };
    }

    if (type === 'OPEN_CONVERSATION') {
      const conversationId = message?.payload?.conversationId;
      if (!conversationId) {
        throw new Error('conversationId is required.');
      }
      const ok = await adapter.openConversationById(conversationId);
      return { ok };
    }

    if (type === 'SCRAPE_ACTIVE_CONVERSATION') {
      const conversationId = message?.payload?.conversationId || null;
      const title = message?.payload?.title || null;
      const conversation = await scrapeActiveConversation(adapter, conversationId, title);
      return { ok: Boolean(conversation), conversation };
    }

    if (type === 'RUN_SELECTOR_SELF_CHECK') {
      const inspection = inspectSelectors(adapter);
      await logDebug('selector_self_check', `Completed selector self-check for ${adapter.platform}.`, {
        platform: adapter.platform,
        ...inspection
      });
      return { ok: true, inspection };
    }

    if (type === 'PREVIEW_ACTIVE_CONVERSATION') {
      const preview = await previewActiveConversation(adapter);
      return { ok: Boolean(preview), preview };
    }

    throw new Error(`Unknown message type: ${type}`);
  };

  run()
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));

  return true;
});
