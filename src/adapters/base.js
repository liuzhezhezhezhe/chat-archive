(() => {
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

async function clickLikeUser(element) {
  element.scrollIntoView({ block: 'center', inline: 'nearest' });
  await sleep(randomInt(120, 320));

  const rect = element.getBoundingClientRect();
  const clientX = rect.left + Math.max(8, Math.min(rect.width - 8, rect.width * 0.5));
  const clientY = rect.top + Math.max(8, Math.min(rect.height - 8, rect.height * 0.5));
  const init = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX,
    clientY,
    button: 0
  };

  element.dispatchEvent(new MouseEvent('mouseover', init));
  element.dispatchEvent(new MouseEvent('mousemove', init));
  await sleep(randomInt(60, 180));
  element.dispatchEvent(new MouseEvent('mousedown', init));
  element.focus?.();
  await sleep(randomInt(40, 140));
  element.dispatchEvent(new MouseEvent('mouseup', init));
  element.dispatchEvent(new MouseEvent('click', init));
}

async function waitForSelector(selector, timeoutMs = 15000, returnNode = false) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const node = selector ? document.querySelector(selector) : null;
    if (node) {
      return returnNode ? node : true;
    }
    await sleep(250);
  }
  return returnNode ? null : false;
}

function resolveCfg(getCfg) {
  return typeof getCfg === 'function' ? getCfg() : (getCfg || {});
}

function getListScrollContainer(cfg) {
  const node = cfg.listContainerSelector ? document.querySelector(cfg.listContainerSelector) : null;
  return node || document.scrollingElement || document.documentElement;
}

function getScrollMetrics(container) {
  const isDocument = container === document.body || container === document.documentElement || container === document.scrollingElement;
  return {
    top: isDocument ? (window.scrollY || container.scrollTop || 0) : (container.scrollTop || 0),
    height: isDocument ? (window.innerHeight || container.clientHeight || 0) : (container.clientHeight || 0),
    maxTop: Math.max(0, (container.scrollHeight || 0) - (isDocument ? (window.innerHeight || container.clientHeight || 0) : (container.clientHeight || 0))),
    isDocument
  };
}

function setScrollTop(container, top) {
  const { isDocument } = getScrollMetrics(container);
  const nextTop = Math.max(0, top);
  if (typeof container.scrollTo === 'function') {
    container.scrollTo({ top: nextTop, behavior: 'auto' });
  } else {
    container.scrollTop = nextTop;
  }
  if (isDocument) {
    window.scrollTo(0, nextTop);
  }
}

async function bringConversationTargetIntoView(target, cfg) {
  const container = getListScrollContainer(cfg);
  const metrics = getScrollMetrics(container);

  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  await sleep(randomInt(90, 220));

  const rect = target.getBoundingClientRect();
  const targetCenter = rect.top + rect.height / 2;
  const viewportCenter = Math.max(120, metrics.height * (0.35 + Math.random() * 0.3));
  const delta = targetCenter - viewportCenter;
  const desiredTop = clamp(metrics.top + delta, 0, metrics.maxTop);
  const overshoot = randomInt(-120, 160);
  const firstTop = clamp(desiredTop + overshoot, 0, metrics.maxTop);

  setScrollTop(container, firstTop);
  await sleep(randomInt(120, 320));

  if (Math.abs(firstTop - desiredTop) > 24) {
    setScrollTop(container, desiredTop);
    await sleep(randomInt(90, 240));
  }

  if (Math.random() < 0.28) {
    const microAdjust = clamp(desiredTop + randomInt(-48, 56), 0, metrics.maxTop);
    setScrollTop(container, microAdjust);
    await sleep(randomInt(70, 180));
    setScrollTop(container, desiredTop);
    await sleep(randomInt(70, 160));
  }

  target.scrollIntoView({ block: 'center', inline: 'nearest' });
  await sleep(randomInt(80, 180));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildListStrategy(cfg) {
  return {
    itemSelector: cfg.conversationLinkSelector,
    scrollContainerSelector: cfg.listContainerSelector,
    nextPageSelector: cfg.nextPageSelector || '',
    endSelector: cfg.endOfListSelector || '',
    maxRounds: Number(cfg.listMaxRounds) || 200,
    idleRounds: Number(cfg.listIdleRounds) || 4,
    stepDelayMs: 900
  };
}

function buildMessageStrategy(cfg) {
  return {
    scrollContainerSelector: cfg.messageContainerSelector || '',
    maxRounds: Number(cfg.messageMaxRounds) || 40,
    stableRounds: Number(cfg.messageStableRounds) || 3,
    stepDelayMs: 600
  };
}

function normalizePlainText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeMarkdownOutput(text) {
  const chunks = String(text || '').split(/(```[\s\S]*?```)/g);
  return chunks
    .map((chunk) => {
      if (chunk.startsWith('```')) {
        return chunk.trim();
      }
      return chunk
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    })
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function sanitizeInlineText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ');
}

function escapeInlineCode(text) {
  return String(text || '').replace(/`/g, '\\`');
}

function escapeTableCell(text) {
  return String(text || '').replace(/\|/g, '\\|');
}

function findCodeLanguage(node) {
  let current = node.parentElement;
  for (let depth = 0; current && depth < 6; depth += 1) {
    const label = current.querySelector('.text-sm.font-medium, .code-block-decoration span');
    const value = normalizePlainText(label?.textContent || '');
    if (value && value.length <= 30 && !/copy/i.test(value)) {
      return value.toLowerCase();
    }
    current = current.parentElement;
  }
  return '';
}

function isHiddenNode(node) {
  if (!(node instanceof Element)) {
    return false;
  }

  return node.matches('button, svg, script, style, textarea, input, .sr-only, [aria-hidden="true"]');
}

function serializeChildren(node, state = {}) {
  return Array.from(node.childNodes)
    .map((child) => serializeNode(child, state))
    .join('');
}

function serializeList(listNode, state = {}) {
  const ordered = listNode.tagName.toLowerCase() === 'ol';
  const items = Array.from(listNode.children).filter((child) => child.tagName?.toLowerCase() === 'li');
  const output = items.map((item, index) => serializeListItem(item, ordered, index, state)).join('');
  return `${output}\n`;
}

function serializeListItem(itemNode, ordered, index, state = {}) {
  const depth = state.listDepth || 0;
  const indent = '  '.repeat(depth);
  const prefix = ordered ? `${index + 1}. ` : '- ';
  const contentParts = [];
  const nestedParts = [];

  for (const child of Array.from(itemNode.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        nestedParts.push(serializeList(child, { ...state, listDepth: depth + 1 }).trimEnd());
        continue;
      }
    }
    contentParts.push(serializeNode(child, { ...state, listDepth: depth }));
  }

  const normalized = normalizeMarkdownOutput(contentParts.join(''));
  const lines = normalized ? normalized.split('\n') : [''];
  let result = `${indent}${prefix}${lines[0] || ''}`.trimEnd();

  for (const line of lines.slice(1)) {
    result += `\n${indent}${' '.repeat(prefix.length)}${line}`.trimEnd();
  }

  if (nestedParts.length) {
    result += `\n${nestedParts.join('\n')}`;
  }

  return `${result}\n`;
}

function serializeTable(tableNode) {
  const rows = Array.from(tableNode.querySelectorAll('tr'))
    .map((row) => Array.from(row.querySelectorAll('th, td')))
    .filter((cells) => cells.length > 0)
    .map((cells) => cells.map((cell) => {
      const value = normalizeMarkdownOutput(serializeChildren(cell));
      return escapeTableCell(value.replace(/\n/g, '<br>')) || ' ';
    }));

  if (!rows.length) {
    return '';
  }

  const header = rows[0];
  const divider = header.map(() => '---');
  const body = rows.slice(1);
  const lines = [header, divider, ...body].map((row) => `| ${row.join(' | ')} |`);
  return `${lines.join('\n')}\n\n`;
}

function serializeBlockquote(node, state = {}) {
  const content = normalizeMarkdownOutput(serializeChildren(node, state));
  if (!content) {
    return '';
  }

  return `${content.split('\n').map((line) => `> ${line}`).join('\n')}\n\n`;
}

function serializeNode(node, state = {}) {
  if (!node) {
    return '';
  }

  if (node.nodeType === Node.TEXT_NODE) {
    if (state.inPre) {
      return String(node.nodeValue || '').replace(/\r/g, '');
    }
    return sanitizeInlineText(node.nodeValue || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE || isHiddenNode(node)) {
    return '';
  }

  const tag = node.tagName.toLowerCase();

  if (tag === 'br') {
    return '\n';
  }

  if (tag === 'hr') {
    return '\n---\n\n';
  }

  if (tag === 'pre') {
    const language = findCodeLanguage(node);
    const code = String(node.querySelector('.cm-content, code')?.textContent || node.textContent || '')
      .replace(/\r/g, '')
      .trimEnd();
    if (!code) {
      return '';
    }
    return `\n\n\0\0\0${language}\n${code}\n\0\0\0\n\n`.replace(/\u0006/g, '`');
  }

  if (tag === 'code') {
    if (state.inPre) {
      return String(node.textContent || '');
    }
    const content = normalizePlainText(node.textContent || '');
    return content ? `\`${escapeInlineCode(content)}\`` : '';
  }

  if (tag === 'a') {
    const text = normalizeMarkdownOutput(serializeChildren(node, state)) || normalizePlainText(node.textContent || '');
    const href = node.getAttribute('href') || '';
    return href ? `[${text || href}](${href})` : text;
  }

  if (tag === 'strong' || tag === 'b') {
    const content = normalizeMarkdownOutput(serializeChildren(node, state));
    return content ? `**${content}**` : '';
  }

  if (tag === 'em' || tag === 'i') {
    const content = normalizeMarkdownOutput(serializeChildren(node, state));
    return content ? `*${content}*` : '';
  }

  if (tag === 'del' || tag === 's' || tag === 'strike') {
    const content = normalizeMarkdownOutput(serializeChildren(node, state));
    return content ? `~~${content}~~` : '';
  }

  if (tag === 'img') {
    const alt = normalizePlainText(node.getAttribute('alt') || 'image');
    const src = node.getAttribute('src') || '';
    return src ? `![${alt}](${src})` : '';
  }

  if (tag === 'blockquote') {
    return serializeBlockquote(node, state);
  }

  if (tag === 'ul' || tag === 'ol') {
    return serializeList(node, state);
  }

  if (tag === 'table') {
    return serializeTable(node);
  }

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1));
    const content = normalizeMarkdownOutput(serializeChildren(node, state));
    return content ? `${'#'.repeat(level)} ${content}\n\n` : '';
  }

  if (tag === 'p') {
    const content = normalizeMarkdownOutput(serializeChildren(node, state));
    return content ? `${content}\n\n` : '';
  }

  return serializeChildren(node, state);
}

function serializeDomToMarkdown(rootNode, options = {}) {
  if (!rootNode) {
    return '';
  }

  const clone = rootNode.cloneNode(true);
  const removableSelectors = options.removableSelectors || [];
  for (const selector of removableSelectors) {
    for (const element of Array.from(clone.querySelectorAll(selector))) {
      element.remove();
    }
  }

  return normalizeMarkdownOutput(serializeChildren(clone, options.state || {}));
}

function collectConversationRefs({ getCfg, normalizeConversationIdFromHref, getConversationTitle }) {
  const cfg = resolveCfg(getCfg);
  const anchors = Array.from(document.querySelectorAll(cfg.conversationLinkSelector || ''));
  const refs = [];

  for (const anchor of anchors) {
    const href = anchor.getAttribute('href') || '';
    const conversationId = normalizeConversationIdFromHref(href);
    if (!conversationId) {
      continue;
    }

    const title = typeof getConversationTitle === 'function'
      ? getConversationTitle(anchor, conversationId)
      : ((anchor.textContent || '').trim() || conversationId);

    refs.push({ conversation_id: conversationId, title });
  }

  return refs;
}

async function loadMoreConversationListDefault(getCfg) {
  const cfg = resolveCfg(getCfg);
  const container = document.querySelector(cfg.listContainerSelector) || document.body;
  const before = document.querySelectorAll(cfg.conversationLinkSelector || '').length;
  container.scrollTop = container.scrollHeight;
  window.scrollTo(0, document.body.scrollHeight);
  await sleep(900);
  const after = document.querySelectorAll(cfg.conversationLinkSelector || '').length;
  return after > before;
}

async function openConversationByIdDefault({ getCfg, normalizeConversationIdFromHref, conversationId, timeoutMs = 15000 }) {
  const cfg = resolveCfg(getCfg);
  const activeConversationId = typeof normalizeConversationIdFromHref === 'function'
    ? normalizeConversationIdFromHref(location.pathname)
    : null;

  if (activeConversationId === conversationId) {
    return waitForSelector(cfg.readySelector, timeoutMs);
  }

  const target = Array.from(document.querySelectorAll(cfg.conversationLinkSelector || '')).find((anchor) => {
    const href = anchor.getAttribute('href') || '';
    return normalizeConversationIdFromHref(href) === conversationId;
  });

  if (!target) {
    return false;
  }

  await bringConversationTargetIntoView(target, cfg);
  await clickLikeUser(target);
  return waitForSelector(cfg.readySelector, timeoutMs);
}

function openConversationByHrefDefault(conversationHref) {
  if (!conversationHref) {
    return false;
  }

  const targetUrl = new URL(conversationHref, location.origin);
  if (targetUrl.href === location.href) {
    return true;
  }

  setTimeout(() => {
    location.assign(targetUrl.href);
  }, 0);
  return true;
}

async function waitConversationReadyDefault(getCfg, timeoutMs = 15000) {
  const cfg = resolveCfg(getCfg);
  return waitForSelector(cfg.readySelector, timeoutMs);
}

async function loadAllMessagesDefault(getCfg) {
  const cfg = resolveCfg(getCfg);
  const scrollContainer = document.querySelector(cfg.messageContainerSelector || '') || document.scrollingElement || document.documentElement;
  let stable = 0;
  let lastSignature = '';

  for (let i = 0; i < 40; i += 1) {
    const beforeTop = scrollContainer.scrollTop || 0;
    const viewportHeight = Math.max(scrollContainer.clientHeight || window.innerHeight || 0, 1);
    const targetTop = Math.max(0, beforeTop - Math.max(360, Math.round(viewportHeight * (0.55 + Math.random() * 0.65))));
    scrollContainer.scrollTop = targetTop;
    await sleep(randomInt(450, 1300));

    const afterTop = scrollContainer.scrollTop || 0;
    const signature = `${Math.round(afterTop)}:${scrollContainer.scrollHeight}`;
    if (signature === lastSignature) {
      stable += 1;
    } else {
      stable = 0;
    }
    lastSignature = signature;

    if (afterTop <= 2) {
      await sleep(randomInt(900, 1800));
    }

    if (stable >= 3) {
      break;
    }
  }
}

function collectTextMessages({ nodes, roleResolver, contentResolver }) {
  const messages = [];

  for (const node of nodes) {
    const content = typeof contentResolver === 'function'
      ? contentResolver(node)
      : ((node.textContent || '').trim());

    if (!content) {
      continue;
    }

    const role = typeof roleResolver === 'function' ? roleResolver(node) : 'assistant';
    messages.push({
      role,
      content,
      created_at: Math.floor(Date.now() / 1000)
    });
  }

  return messages;
}

function getPlainTextMessages({ getCfg, roleResolver, contentResolver }) {
  const cfg = resolveCfg(getCfg);
  const nodes = Array.from(document.querySelectorAll(cfg.messageSelector || ''));
  return collectTextMessages({ nodes, roleResolver: (node) => roleResolver(node, cfg), contentResolver });
}

function createAdapter(spec) {
  const getCfg = spec.getCfg;
  return {
    platform: spec.platform,
    matches: spec.matches,
    getConversationRefs: spec.getConversationRefs || (() => collectConversationRefs({
      getCfg,
      normalizeConversationIdFromHref: spec.normalizeConversationIdFromHref,
      getConversationTitle: spec.getConversationTitle
    })),
    getListStrategy: spec.getListStrategy || (() => buildListStrategy(resolveCfg(getCfg))),
    getMessageStrategy: spec.getMessageStrategy || (() => buildMessageStrategy(resolveCfg(getCfg))),
    getDebugConfig: spec.getDebugConfig || (() => resolveCfg(getCfg)),
    loadMoreConversationList: spec.loadMoreConversationList || (() => loadMoreConversationListDefault(getCfg)),
    openConversationById: spec.openConversationById || ((conversationId) => openConversationByIdDefault({
      getCfg,
      normalizeConversationIdFromHref: spec.normalizeConversationIdFromHref,
      conversationId,
      timeoutMs: spec.readyTimeoutMs || 15000
    })),
    openConversationByHref: spec.openConversationByHref || openConversationByHrefDefault,
    waitConversationReady: spec.waitConversationReady || (() => waitConversationReadyDefault(getCfg, spec.readyTimeoutMs || 15000)),
    loadAllMessages: spec.loadAllMessages || (() => loadAllMessagesDefault(getCfg)),
    getMessages: spec.getMessages,
    getActiveConversationId: spec.getActiveConversationId || (() => {
      return spec.normalizeConversationIdFromHref ? spec.normalizeConversationIdFromHref(location.pathname) : null;
    })
  };
}

window.ArchiveAdapterBase = {
  sleep,
  randomInt,
  clickLikeUser,
  waitForSelector,
  buildListStrategy,
  buildMessageStrategy,
  collectConversationRefs,
  loadMoreConversationListDefault,
  openConversationByIdDefault,
  waitConversationReadyDefault,
  loadAllMessagesDefault,
  normalizePlainText,
  serializeDomToMarkdown,
  collectTextMessages,
  getPlainTextMessages,
  createAdapter
};
})();