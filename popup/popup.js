import {
  formatMinutes,
  formatPlatformLabel,
  formatPolicyMode,
  formatStatusLabel,
  formatTimestamp,
  getAlternateLanguage,
  getLanguage,
  getLanguageToggleLabel,
  localizeError,
  localizeLog,
  setLanguage,
  t
} from '../src/i18n.js';

async function queryActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

const selectedConversationKeys = new Set();

let currentLanguage = 'en';
let currentPlatform = null;
let currentState = null;
let currentLogs = [];
let currentConversations = [];

function conversationSelectionKey(platform, conversationId) {
  return `${platform || 'unknown'}::${conversationId || 'unknown'}`;
}

function trunc(text, n = 42) {
  if (!text) {
    return '';
  }
  return text.length <= n ? text : `${text.slice(0, n - 1)}...`;
}

async function send(action, payload = {}) {
  return chrome.runtime.sendMessage({ action, ...payload });
}

function selectedConversationRefs() {
  return Array.from(selectedConversationKeys).map((key) => {
    const separatorIndex = key.indexOf('::');
    return {
      platform: key.slice(0, separatorIndex),
      conversation_id: key.slice(separatorIndex + 2)
    };
  });
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

async function detectPlatform(tabId) {
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: 'DETECT_PLATFORM', payload: {} });
    if (result?.ok) {
      return result.platform;
    }
  } catch {
    return null;
  }
  return null;
}

function setButtonsEnabled(platformSupported) {
  for (const id of ['startBtn', 'abortBtn']) {
    document.getElementById(id).disabled = !platformSupported;
  }
  document.getElementById('exportJsonBtn').disabled = false;
}

function renderConversationList(conversations) {
  const root = document.getElementById('conversationList');
  root.innerHTML = '';
  currentConversations = conversations || [];

  if (!currentConversations.length) {
    root.textContent = t(currentLanguage, 'popup.noConversations');
    return;
  }

  for (const conv of currentConversations) {
    const row = document.createElement('div');
    row.className = 'item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'conv-check';
    checkbox.dataset.platform = conv.platform;
    checkbox.dataset.conversationId = conv.conversation_id;
    checkbox.value = conversationSelectionKey(conv.platform, conv.conversation_id);
    checkbox.checked = selectedConversationKeys.has(checkbox.value);

    const label = document.createElement('label');
    label.textContent = `[${formatPlatformLabel(currentLanguage, conv.platform)}] ${trunc(conv.title || conv.conversation_id)} (${conv.message_count})`;

    row.appendChild(checkbox);
    row.appendChild(label);
    root.appendChild(row);
  }
}

function renderLogs(logs) {
  const root = document.getElementById('debugLogList');
  root.innerHTML = '';
  currentLogs = logs || [];
  const items = currentLogs.slice(-20).reverse();

  if (!items.length) {
    root.textContent = t(currentLanguage, 'popup.noEvents');
    return;
  }

  for (const log of items) {
    const row = document.createElement('div');
    row.className = 'log-item';

    const meta = document.createElement('div');
    meta.className = 'log-meta';
    meta.textContent = formatTimestamp(currentLanguage, log.timestamp);

    const body = document.createElement('div');
    body.textContent = localizeLog(currentLanguage, log);

    row.appendChild(meta);
    row.appendChild(body);
    root.appendChild(row);
  }
}

function buildDetailText(state) {
  const pending = Math.max(0, (state?.pendingConversationIds || []).length);
  const failed = (state?.failedConversationIds || []).length;
  const parts = [
    `${t(currentLanguage, 'popup.pending')}: ${pending}`,
    `${t(currentLanguage, 'popup.failed')}: ${failed}`
  ];

  if (state?.cooldownRemainingSeconds > 0) {
    const minutes = formatMinutes(currentLanguage, Math.ceil(state.cooldownRemainingSeconds / 60));
    const label = state?.status === 'waiting'
      ? t(currentLanguage, 'popup.autoResume')
      : t(currentLanguage, 'popup.cooldown');
    parts.push(`${label}: ${minutes}`);
  }

  if (state?.crawlPolicyMode) {
    parts.push(`${t(currentLanguage, 'popup.mode')}: ${formatPolicyMode(currentLanguage, state.crawlPolicyMode)}`);
  }

  if (state?.lastError) {
    parts.push(`${t(currentLanguage, 'popup.error')}: ${trunc(localizeError(currentLanguage, state.lastError), 42)}`);
  }

  return parts.join(' | ');
}

function updateStatus(state) {
  currentState = state || null;
  const done = state?.done || 0;
  const total = state?.total || 0;
  const running = Boolean(state?.running);
  const statusValue = state?.status || (running ? 'running' : 'idle');
  const statusText = document.getElementById('statusText');

  statusText.textContent = formatStatusLabel(currentLanguage, statusValue);
  statusText.dataset.status = statusValue;
  document.getElementById('progressText').textContent = `${done} / ${total}`;
  document.getElementById('progress').max = total || 100;
  document.getElementById('progress').value = done;
  document.getElementById('detailText').textContent = buildDetailText(state);
  document.getElementById('startBtn').textContent = running
    ? t(currentLanguage, 'popup.startRunning')
    : t(currentLanguage, 'popup.start');
  document.getElementById('startBtn').disabled = running;
}

function setTransientError(message) {
  document.getElementById('statusText').textContent = formatStatusLabel(currentLanguage, 'error');
  document.getElementById('statusText').dataset.status = 'error';
  document.getElementById('detailText').textContent = trunc(localizeError(currentLanguage, message || t(currentLanguage, 'popup.unknownError')), 120);
}

function applyStaticCopy() {
  document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
  document.title = t(currentLanguage, 'popup.title');
  document.getElementById('platformLabel').textContent = t(currentLanguage, 'popup.platformLabel');
  document.getElementById('statusLabel').textContent = t(currentLanguage, 'popup.statusLabel');
  document.getElementById('progressLabel').textContent = t(currentLanguage, 'popup.progressLabel');
  document.getElementById('controlsTitle').textContent = t(currentLanguage, 'popup.controlsTitle');
  document.getElementById('conversationsTitle').textContent = t(currentLanguage, 'popup.conversationsTitle');
  document.getElementById('logsTitle').textContent = t(currentLanguage, 'popup.logsTitle');
  document.getElementById('openOptionsBtn').textContent = t(currentLanguage, 'popup.viewGuide');
  document.getElementById('abortBtn').textContent = t(currentLanguage, 'popup.abort');
  document.getElementById('exportJsonBtn').textContent = t(currentLanguage, 'popup.exportJson');
  document.getElementById('toggleAllBtn').textContent = t(currentLanguage, 'popup.toggleAll');
  document.getElementById('refreshLogsBtn').textContent = t(currentLanguage, 'popup.refresh');
  document.getElementById('clearLogsBtn').textContent = t(currentLanguage, 'popup.clear');
  document.getElementById('complianceNoticeTitle').textContent = t(currentLanguage, 'popup.complianceTitle');
  document.getElementById('complianceNoticeBody').textContent = t(currentLanguage, 'popup.complianceBody');
  document.getElementById('languageToggleBtn').textContent = getLanguageToggleLabel(currentLanguage);
}

function rerender() {
  applyStaticCopy();
  document.getElementById('platform').textContent = currentPlatform
    ? formatPlatformLabel(currentLanguage, currentPlatform)
    : t(currentLanguage, 'popup.unsupportedPage');
  renderConversationList(currentConversations);
  renderLogs(currentLogs);
  updateStatus(currentState);
}

async function refresh(tabId, platform) {
  const statusRes = await send('GET_STATUS', { tabId, platform });
  if (statusRes?.ok) {
    updateStatus(statusRes.state);
  }

  const listRes = await send('LIST_CONVERSATIONS', { platform: null });
  if (listRes?.ok) {
    renderConversationList(listRes.conversations || []);
  }

  const logsRes = await send('GET_DEBUG_LOGS');
  if (logsRes?.ok) {
    renderLogs(logsRes.logs || []);
  }
}

async function boot() {
  currentLanguage = await getLanguage();
  applyStaticCopy();

  const activeTab = await queryActiveTab();
  if (!activeTab?.id) {
    return;
  }

  const tabId = activeTab.id;
  currentPlatform = (await detectPlatform(tabId)) || inferPlatformFromUrl(activeTab.url || '');
  document.getElementById('platform').textContent = currentPlatform
    ? formatPlatformLabel(currentLanguage, currentPlatform)
    : t(currentLanguage, 'popup.unsupportedPage');
  setButtonsEnabled(Boolean(currentPlatform));

  document.getElementById('conversationList').addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.classList.contains('conv-check')) {
      return;
    }

    if (target.checked) {
      selectedConversationKeys.add(target.value);
    } else {
      selectedConversationKeys.delete(target.value);
    }
  });

  document.getElementById('startBtn').addEventListener('click', async () => {
    const result = await send('START_CRAWL', { tabId });
    if (!result?.ok) {
      setTransientError(result?.error || t(currentLanguage, 'popup.startFailed'));
      return;
    }
    await refresh(tabId, currentPlatform);
  });

  document.getElementById('abortBtn').addEventListener('click', async () => {
    await send('ABORT_CRAWL', { tabId, platform: currentPlatform });
    await refresh(tabId, currentPlatform);
  });

  document.getElementById('openOptionsBtn').addEventListener('click', async () => {
    await chrome.runtime.openOptionsPage();
  });

  document.getElementById('exportJsonBtn').addEventListener('click', async () => {
    const refs = selectedConversationRefs();
    const result = await send('EXPORT_JSON', {
      platform: null,
      conversationRefs: refs,
      conversationIds: []
    });
    if (!result?.ok) {
      setTransientError(result?.error || t(currentLanguage, 'popup.exportFailed'));
    }
  });

  document.getElementById('toggleAllBtn').addEventListener('click', () => {
    const checks = Array.from(document.querySelectorAll('.conv-check'));
    const allChecked = checks.length > 0 && checks.every((item) => item.checked);
    for (const item of checks) {
      item.checked = !allChecked;
      if (item.checked) {
        selectedConversationKeys.add(item.value);
      } else {
        selectedConversationKeys.delete(item.value);
      }
    }
  });

  document.getElementById('refreshLogsBtn').addEventListener('click', async () => {
    const logsRes = await send('GET_DEBUG_LOGS');
    if (logsRes?.ok) {
      renderLogs(logsRes.logs || []);
    }
  });

  document.getElementById('clearLogsBtn').addEventListener('click', async () => {
    await send('CLEAR_DEBUG_LOGS');
    renderLogs([]);
  });

  document.getElementById('languageToggleBtn').addEventListener('click', async () => {
    currentLanguage = await setLanguage(getAlternateLanguage(currentLanguage));
    rerender();
  });

  await refresh(tabId, currentPlatform);
  setInterval(() => {
    refresh(tabId, currentPlatform);
  }, 1500);
}

boot();
