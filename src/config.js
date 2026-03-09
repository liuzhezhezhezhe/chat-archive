(() => {
  const STORAGE_KEY = 'selector_config';

  const DEFAULTS = {
    chatgpt: {
      conversationLinkSelector: '#history a[data-sidebar-item="true"][href*="/c/"]',
      listContainerSelector: '#history',
      nextPageSelector: '',
      endOfListSelector: '',
      readySelector: '#thread article[data-testid^="conversation-turn-"] [data-message-author-role][data-message-id]',
      messageSelector: '#thread article[data-testid^="conversation-turn-"] [data-message-author-role][data-message-id]',
      messageContainerSelector: '#thread',
      userMessageSelector: '',
      userRoleKeyword: '',
      listMaxRounds: '200',
      listIdleRounds: '4',
      messageMaxRounds: '40',
      messageStableRounds: '3'
    },
    gemini: {
      conversationLinkSelector: 'a[data-test-id="conversation"][href*="/app/"]',
      listContainerSelector: '.conversations-container, #conversations-list-0, nav, aside',
      nextPageSelector: '',
      endOfListSelector: '',
      readySelector: '.conversation-container model-response structured-content-container .markdown, .conversation-container model-response .markdown, model-response',
      messageSelector: '.conversation-container',
      messageContainerSelector: 'main',
      userMessageSelector: 'user-query',
      userRoleKeyword: '',
      listMaxRounds: '200',
      listIdleRounds: '4',
      messageMaxRounds: '40',
      messageStableRounds: '3'
    }
  };

  const state = {
    loaded: false,
    config: {}
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function mergePlatform(defaultCfg, customCfg) {
    return {
      ...defaultCfg,
      ...(customCfg || {})
    };
  }

  async function ensureLoaded() {
    if (state.loaded) {
      return;
    }
    const store = await chrome.storage.local.get([STORAGE_KEY]);
    state.config = store[STORAGE_KEY] || {};
    state.loaded = true;
  }

  async function saveConfig(newConfig) {
    state.config = newConfig || {};
    state.loaded = true;
    await chrome.storage.local.set({ [STORAGE_KEY]: state.config });
  }

  async function resetConfig() {
    state.config = {};
    state.loaded = true;
    await chrome.storage.local.set({ [STORAGE_KEY]: {} });
  }

  function getPlatformConfig(platform) {
    const defaults = DEFAULTS[platform] || {};
    const custom = state.config?.[platform] || {};
    return mergePlatform(defaults, custom);
  }

  function getAllConfigMerged() {
    return {
      chatgpt: getPlatformConfig('chatgpt'),
      gemini: getPlatformConfig('gemini')
    };
  }

  window.ArchiveSelectorConfigStore = {
    STORAGE_KEY,
    DEFAULTS: deepClone(DEFAULTS),
    ensureLoaded,
    saveConfig,
    resetConfig,
    getPlatformConfig,
    getAllConfigMerged
  };
})();
