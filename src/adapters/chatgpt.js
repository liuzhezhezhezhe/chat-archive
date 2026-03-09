(() => {
const { createAdapter, collectConversationRefs, normalizePlainText, serializeDomToMarkdown, waitForSelector } = window.ArchiveAdapterBase;

const CHATGPT_DEFAULT_CFG = {
  conversationLinkSelector: '#history a[data-sidebar-item="true"][href*="/c/"]',
  listContainerSelector: '#history',
  readySelector: '#thread article[data-testid^="conversation-turn-"] [data-message-author-role][data-message-id]',
  messageSelector: '#thread article[data-testid^="conversation-turn-"] [data-message-author-role][data-message-id]',
  messageContainerSelector: '#thread'
};

const CHATGPT_SELECTOR_CANDIDATES = {
  conversationLinkSelector: [
    '#history a[data-sidebar-item="true"][href*="/c/"]',
    'a[data-sidebar-item="true"][href*="/c/"]',
    'a[href*="/c/"]'
  ],
  listContainerSelector: [
    '#history',
    '[id="history"]',
    '.group\/sidebar-expando-section #history'
  ],
  readySelector: [
    '#thread article[data-testid^="conversation-turn-"] [data-message-author-role][data-message-id]',
    '#thread [data-message-author-role][data-message-id]',
    '[data-message-author-role][data-message-id]'
  ],
  messageSelector: [
    '#thread article[data-testid^="conversation-turn-"] [data-message-author-role][data-message-id]',
    '#thread [data-message-author-role][data-message-id]',
    '[data-message-author-role][data-message-id]'
  ],
  messageContainerSelector: [
    '#thread',
    '[id="thread"]',
    'main'
  ]
};

function getCfg() {
  const manager = window.ArchiveSelectorConfigStore;
  const loaded = manager?.getPlatformConfig ? manager.getPlatformConfig('chatgpt') : CHATGPT_DEFAULT_CFG;
  return resolveEffectiveCfg(loaded || CHATGPT_DEFAULT_CFG);
}

function getRawCfg() {
  const manager = window.ArchiveSelectorConfigStore;
  return manager?.getPlatformConfig ? manager.getPlatformConfig('chatgpt') : CHATGPT_DEFAULT_CFG;
}

function normalizeConversationIdFromHref(href) {
  if (!href) {
    return null;
  }
  const match = href.match(/\/c\/([^/?#]+)/);
  return match?.[1] || null;
}

function queryCount(selector) {
  if (!selector) {
    return 0;
  }
  try {
    return document.querySelectorAll(selector).length;
  } catch {
    return 0;
  }
}

function queryExists(selector) {
  if (!selector) {
    return false;
  }
  try {
    return Boolean(document.querySelector(selector));
  } catch {
    return false;
  }
}

function queryNodes(selector) {
  if (!selector) {
    return [];
  }
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function getConversationLinkMatches(selector) {
  return queryNodes(selector).filter((node) => {
    if (!(node instanceof HTMLAnchorElement)) {
      return false;
    }
    return Boolean(normalizeConversationIdFromHref(node.getAttribute('href') || ''));
  });
}

function isValidConversationLinkSelector(selector) {
  return getConversationLinkMatches(selector).length > 0;
}

function isValidListContainerSelector(selector, itemSelector) {
  if (!selector) {
    return false;
  }
  try {
    const container = document.querySelector(selector);
    if (!container) {
      return false;
    }
    const links = getConversationLinkMatches(itemSelector);
    return links.some((link) => container === link || container.contains(link));
  } catch {
    return false;
  }
}

function isValidMessageSelector(selector) {
  return queryNodes(selector).some((node) => {
    return node.getAttribute('data-message-author-role') && node.getAttribute('data-message-id');
  });
}

function resolveSelector(configuredSelector, candidates, matcher) {
  if (configuredSelector && matcher(configuredSelector)) {
    return configuredSelector;
  }

  for (const selector of candidates) {
    if (matcher(selector)) {
      return selector;
    }
  }

  return configuredSelector || candidates[0] || '';
}

function resolveEffectiveCfg(loadedCfg) {
  const cfg = {
    ...CHATGPT_DEFAULT_CFG,
    ...(loadedCfg || {})
  };

  const conversationLinkSelector = resolveSelector(
    cfg.conversationLinkSelector,
    CHATGPT_SELECTOR_CANDIDATES.conversationLinkSelector,
    (selector) => isValidConversationLinkSelector(selector)
  );

  const listContainerSelector = resolveSelector(
    cfg.listContainerSelector,
    CHATGPT_SELECTOR_CANDIDATES.listContainerSelector,
    (selector) => isValidListContainerSelector(selector, conversationLinkSelector)
  );

  return {
    ...cfg,
    conversationLinkSelector,
    listContainerSelector,
    readySelector: resolveSelector(
      cfg.readySelector,
      CHATGPT_SELECTOR_CANDIDATES.readySelector,
      (selector) => isValidMessageSelector(selector)
    ),
    messageSelector: resolveSelector(
      cfg.messageSelector,
      CHATGPT_SELECTOR_CANDIDATES.messageSelector,
      (selector) => isValidMessageSelector(selector)
    ),
    messageContainerSelector: resolveSelector(
      cfg.messageContainerSelector,
      CHATGPT_SELECTOR_CANDIDATES.messageContainerSelector,
      (selector) => queryExists(selector)
    )
  };
}

function getConversationTitle(anchor, fallbackTitle) {
  if (!anchor) {
    return fallbackTitle || '';
  }

  const titleNode = anchor.querySelector('span[dir="auto"]');
  const title = (titleNode?.textContent || '').trim() || (anchor.textContent || '').trim();
  return title || fallbackTitle || '';
}

function getMessageContentRoot(node, role) {
  if (role === 'user') {
    return node.querySelector('.whitespace-pre-wrap') || node;
  }

  return node.querySelector('.markdown') || node;
}

function extractMessageContent(node, role) {
  const contentRoot = getMessageContentRoot(node, role);
  if (role === 'user') {
    return normalizePlainText(contentRoot.textContent || '');
  }

  return serializeDomToMarkdown(contentRoot, {
    removableSelectors: [
      'button',
      'svg',
      'script',
      'style',
      'textarea',
      'input',
      '.sr-only',
      '[aria-hidden="true"]',
      '[data-testid$="action-button"]',
      '[data-message-model-slug] .sticky',
      '.pointer-events-none.absolute',
      '[id="code-block-viewer"] ~ *'
    ]
  });
}

window.ChatGptArchiveAdapter = createAdapter({
  platform: 'chatgpt',
  matches(locationLike) {
    const host = locationLike?.host || '';
    return host.includes('chatgpt.com') || host.includes('chat.openai.com');
  },
  getCfg,
  normalizeConversationIdFromHref,
  getConversationTitle,
  getConversationRefs() {
    return collectConversationRefs({
      getCfg,
      normalizeConversationIdFromHref,
      getConversationTitle
    });
  },
  getDebugConfig() {
    return {
      raw: getRawCfg(),
      effective: getCfg()
    };
  },
  async waitConversationReady() {
    return waitForSelector(getCfg().readySelector, 15000);
  },
  getMessages() {
    const cfg = getCfg();
    const nodes = Array.from(document.querySelectorAll(cfg.messageSelector));
    const messages = [];
    for (const node of nodes) {
      const roleAttr = node.getAttribute('data-message-author-role') || '';
      const role = roleAttr === 'user' ? 'user' : 'assistant';
      const content = extractMessageContent(node, role);
      if (!content) {
        continue;
      }
      messages.push({
        role,
        content,
        created_at: Math.floor(Date.now() / 1000)
      });
    }
    return messages;
  }
});
})();
