(() => {
const { createAdapter, collectConversationRefs, normalizePlainText, serializeDomToMarkdown } = window.ArchiveAdapterBase;

const PLATFORM_DEFAULT_CFG = {
  conversationLinkSelector: 'a[href*="/conversation/"]',
  listContainerSelector: 'nav, aside',
  readySelector: 'main .message, main [role="article"]',
  messageSelector: '.conversation-turn',
  messageContainerSelector: 'main',
  userMessageSelector: '.message-user',
  userRoleKeyword: ''
};

function getCfg() {
  const manager = window.ArchiveSelectorConfigStore;
  return manager?.getPlatformConfig ? manager.getPlatformConfig('platform-key') : PLATFORM_DEFAULT_CFG;
}

function normalizeConversationIdFromHref(href) {
  if (!href) {
    return null;
  }
  const match = href.match(/\/conversation\/([^/?#]+)/);
  return match?.[1] || null;
}

function getConversationTitle(anchor, fallbackTitle) {
  const titleNode = anchor?.querySelector('.conversation-title');
  const title = (titleNode?.textContent || anchor?.textContent || '').trim();
  return title || fallbackTitle || '';
}

function extractUserContent(container, cfg) {
  const userNode = container.querySelector(cfg.userMessageSelector);
  if (!userNode) {
    return '';
  }

  return normalizePlainText(userNode.textContent || '');
}

function extractAssistantContent(container) {
  const assistantRoot = container.querySelector('.assistant-body, .markdown, [data-role="assistant"]');
  if (!assistantRoot) {
    return '';
  }

  return serializeDomToMarkdown(assistantRoot, {
    removableSelectors: [
      'button',
      'svg',
      'script',
      'style',
      'textarea',
      'input',
      '.sr-only',
      '[aria-hidden="true"]'
    ]
  });
}

window.PlatformArchiveTemplateAdapter = createAdapter({
  platform: 'platform-key',
  matches(locationLike) {
    const host = locationLike?.host || '';
    return host.includes('example.com');
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
  getMessages() {
    const cfg = getCfg();
    const containers = Array.from(document.querySelectorAll(cfg.messageSelector));
    const messages = [];

    for (const container of containers) {
      const userContent = extractUserContent(container, cfg);
      if (userContent) {
        messages.push({
          role: 'user',
          content: userContent,
          created_at: Math.floor(Date.now() / 1000)
        });
      }

      const assistantContent = extractAssistantContent(container);
      if (assistantContent) {
        messages.push({
          role: 'assistant',
          content: assistantContent,
          created_at: Math.floor(Date.now() / 1000)
        });
      }
    }

    return messages;
  }
});
})();