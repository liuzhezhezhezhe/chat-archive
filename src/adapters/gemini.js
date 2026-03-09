(() => {
const { createAdapter, collectConversationRefs, normalizePlainText, serializeDomToMarkdown } = window.ArchiveAdapterBase;

const GEMINI_DEFAULT_CFG = {
  conversationLinkSelector: 'a[data-test-id="conversation"][href*="/app/"]',
  listContainerSelector: '.conversations-container, #conversations-list-0, nav, aside',
  readySelector: '.conversation-container model-response structured-content-container .markdown, .conversation-container model-response .markdown, model-response',
  messageSelector: '.conversation-container',
  messageContainerSelector: 'main',
  userMessageSelector: 'user-query'
};

const GEMINI_SELECTOR_CANDIDATES = {
  conversationLinkSelector: [
    'a[data-test-id="conversation"][href*="/app/"]',
    'a.conversation[href*="/app/"]',
    'a[href*="/app/"]'
  ],
  listContainerSelector: [
    '.conversations-container',
    '#conversations-list-0',
    'nav',
    'aside'
  ],
  readySelector: [
    '.conversation-container model-response structured-content-container .markdown',
    '.conversation-container model-response .markdown',
    'model-response'
  ],
  messageSelector: [
    '.conversation-container',
    '.conversation-container.message-actions-hover-boundary'
  ],
  messageContainerSelector: [
    'main',
    'chat-window',
    '.chat-window'
  ],
  userMessageSelector: [
    'user-query',
    'user-query .query-text'
  ]
};

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

function isValidConversationLinkSelector(selector) {
  return queryNodes(selector).some((node) => {
    const href = node.getAttribute?.('href') || '';
    return Boolean(normalizeConversationIdFromHref(href));
  });
}

function isValidListContainerSelector(selector, itemSelector) {
  const containers = queryNodes(selector);
  const links = queryNodes(itemSelector);
  return containers.some((container) => links.some((link) => container === link || container.contains(link)));
}

function isValidReadySelector(selector) {
  return queryExists(selector);
}

function isValidMessageSelector(selector) {
  return queryNodes(selector).some((node) => {
    return Boolean(node.querySelector('user-query') || node.querySelector('model-response'));
  });
}

function getConversationTitle(anchor, fallbackTitle) {
  const titleNode = anchor?.querySelector('.conversation-title');
  const title = (titleNode?.textContent || anchor?.textContent || '').trim();
  return title || fallbackTitle || '';
}

function getRawCfg() {
  const manager = window.ArchiveSelectorConfigStore;
  return manager?.getPlatformConfig ? manager.getPlatformConfig('gemini') : GEMINI_DEFAULT_CFG;
}

function getCfg() {
  const manager = window.ArchiveSelectorConfigStore;
  const loaded = manager?.getPlatformConfig ? manager.getPlatformConfig('gemini') : GEMINI_DEFAULT_CFG;
  const cfg = {
    ...GEMINI_DEFAULT_CFG,
    ...(loaded || {})
  };

  const conversationLinkSelector = resolveSelector(
    cfg.conversationLinkSelector,
    GEMINI_SELECTOR_CANDIDATES.conversationLinkSelector,
    (selector) => isValidConversationLinkSelector(selector)
  );

  return {
    ...cfg,
    conversationLinkSelector,
    listContainerSelector: resolveSelector(
      cfg.listContainerSelector,
      GEMINI_SELECTOR_CANDIDATES.listContainerSelector,
      (selector) => isValidListContainerSelector(selector, conversationLinkSelector)
    ),
    readySelector: resolveSelector(
      cfg.readySelector,
      GEMINI_SELECTOR_CANDIDATES.readySelector,
      (selector) => isValidReadySelector(selector)
    ),
    messageSelector: resolveSelector(
      cfg.messageSelector,
      GEMINI_SELECTOR_CANDIDATES.messageSelector,
      (selector) => isValidMessageSelector(selector)
    ),
    messageContainerSelector: resolveSelector(
      cfg.messageContainerSelector,
      GEMINI_SELECTOR_CANDIDATES.messageContainerSelector,
      (selector) => queryExists(selector)
    ),
    userMessageSelector: resolveSelector(
      cfg.userMessageSelector,
      GEMINI_SELECTOR_CANDIDATES.userMessageSelector,
      (selector) => queryExists(selector)
    )
  };
}

function normalizeConversationIdFromHref(href) {
  if (!href) {
    return null;
  }
  const match = href.match(/\/app\/([^/?#]+)/);
  return match?.[1] || null;
}

function extractGeminiUserContent(container, cfg) {
  const userNode = container.querySelector(cfg.userMessageSelector);
  if (!userNode) {
    return '';
  }

  const contentRoot = userNode.querySelector('.query-content, .user-query-bubble-with-background, .query-text') || userNode;
  const userLines = Array.from(contentRoot.querySelectorAll('.query-text-line'));
  if (userLines.length) {
    return normalizePlainText(userLines.map((line) => line.textContent || '').join('\n'));
  }

  const markdownContent = serializeDomToMarkdown(contentRoot, {
    removableSelectors: [
      'button',
      'svg',
      'script',
      'style',
      'textarea',
      'input',
      '.sr-only',
      '.cdk-visually-hidden',
      '[aria-hidden="true"]',
      '[data-test-id="prompt-edit-button"]',
      '.action-button',
      '.expand-button',
      '.file-preview-container'
    ]
  });

  if (markdownContent) {
    return markdownContent;
  }

  return normalizePlainText(contentRoot.textContent || '');
}

window.GeminiArchiveAdapter = createAdapter({
  platform: 'gemini',
  matches(locationLike) {
    const host = locationLike?.host || '';
    return host.includes('gemini.google.com');
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
  getMessages() {
    const cfg = getCfg();
    const containers = Array.from(document.querySelectorAll(cfg.messageSelector));
    const messages = [];

    for (const container of containers) {
      const userContent = extractGeminiUserContent(container, cfg);
      if (userContent) {
        messages.push({
          role: 'user',
          content: userContent,
          created_at: Math.floor(Date.now() / 1000)
        });
      }

      const assistantNode = container.querySelector('model-response structured-content-container .markdown, model-response .markdown');
      if (assistantNode) {
        const assistantContent = serializeDomToMarkdown(assistantNode, {
          removableSelectors: [
            'button',
            'svg',
            'script',
            'style',
            'textarea',
            'input',
            '.sr-only',
            '[aria-hidden="true"]',
            '[data-test-id="copy-button"]',
            '[data-test-id="more-menu-button"]',
            '.response-container-header',
            '.response-container-footer',
            'message-actions',
            'model-thoughts',
            '.thoughts-container'
          ]
        });
        if (assistantContent) {
          messages.push({
            role: 'assistant',
            content: assistantContent,
            created_at: Math.floor(Date.now() / 1000)
          });
        }
      }
    }

    return messages;
  }
});
})();
