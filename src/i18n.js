export const UI_LANGUAGE_KEY = 'ui_language_v1';

export const SUPPORTED_LANGUAGES = ['en', 'zh'];

const PLATFORM_LABELS = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini'
};

const STATUS_LABELS = {
  en: {
    idle: 'Idle',
    running: 'Running',
    waiting: 'Auto Paused',
    aborting: 'Aborting',
    aborted: 'Aborted',
    completed: 'Completed',
    error: 'Error'
  },
  zh: {
    idle: '空闲',
    running: '运行中',
    waiting: '自动暂停中',
    aborting: '正在中止',
    aborted: '已中止',
    completed: '已完成',
    error: '错误'
  }
};

const POLICY_MODE_LABELS = {
  en: {
    conservative: 'Conservative',
    standard: 'Standard'
  },
  zh: {
    conservative: '保守',
    standard: '标准'
  }
};

const COPY = {
  en: {
    popup: {
      title: 'Chat Archive',
      platformLabel: 'Platform',
      statusLabel: 'Job Status',
      progressLabel: 'Progress',
      controlsTitle: 'Task Controls',
      conversationsTitle: 'Conversation Selection',
      logsTitle: 'Recent Events',
      viewGuide: 'Guide',
      updateSelected: 'Update Selected',
      abort: 'Abort Task',
      exportJson: 'Export JSON',
      toggleAll: 'Toggle All',
      refresh: 'Refresh',
      clear: 'Clear',
      noConversations: 'No captured conversations yet.',
      noEvents: 'No recent events.',
      pending: 'Pending',
      failed: 'Failed',
      autoResume: 'Auto resume',
      pauseReason: 'Pause',
      cooldown: 'Cooldown',
      mode: 'Mode',
      error: 'Error',
      startRunning: 'Crawling In Progress',
      start: 'Start Crawling',
      unsupportedPage: 'Unsupported page',
      unknownError: 'Unknown error',
      startFailed: 'Failed to start crawling.',
      updateSelectedEmpty: 'Select at least one conversation first.',
      updateSelectedFailed: 'Failed to update the selected conversations.',
      selectionSummaryHeader: 'Will update {matched} selected conversation(s) on {platform}.',
      selectionOtherPlatforms: '{count} selected item(s) belong to other platforms. Update them from the corresponding platform page:',
      selectionMissingCurrent: '{count} selected item(s) were not found in the current platform list:',
      exportFailed: 'Failed to export JSON.',
      complianceTitle: 'Authorized Use Only',
      complianceBody: 'Use this extension only when you are allowed to access, export, and retain the target conversation data under platform rules and applicable law.'
    },
    options: {
      title: 'Chat Archive Export Guide',
      description: 'Chat Archive currently supports ChatGPT and Gemini, with more platforms planned over time for authorized, policy-compliant archival use.',
      complianceLead: {
        title: 'Authorized Use Only',
        body: 'Use Chat Archive only when you are authorized to capture and retain the relevant conversation data under platform rules and applicable law.'
      },
      heroCards: [
        {
          title: 'Fully Local',
          body: 'All crawling, storage, and export work happens inside the browser extension.'
        },
        {
          title: 'Revision Aware',
          body: 'Each conversation keeps a current snapshot plus a revision tree for historical branches.'
        },
        {
          title: 'Archive Ready',
          body: 'Exports are written as JSON packages for archiving, search, and downstream processing.'
        }
      ],
      sections: {
        uses: {
          title: 'What It Does',
          cards: [
            {
              title: 'Collects conversation lists',
              body: 'The extension walks the supported sidebar or list UI and records discoverable conversations.'
            },
            {
              title: 'Loads full conversation content',
              body: 'Each selected conversation is opened and scraped into a stable JSON snapshot.'
            },
            {
              title: 'Resumes interrupted runs',
              body: 'Job state is stored locally so a later run can continue pending work.'
            }
          ]
        },
        structure: {
          title: 'Export Structure',
          paragraphs: [
            'Exports contain one package object with export metadata and a conversations array.',
            'Each conversation stores the active snapshot at the root plus a revision history in revisions[].'
          ],
          schemaPreview: `{
  "export_info": {
    "format": "chat-archive-export",
    "schema_version": 2
  },
  "conversations": [
    {
      "platform": "platform-a",
      "conversation_id": "...",
      "messages": [],
      "revisions": []
    }
  ]
}`
        },
        variants: {
          title: 'Platform Coverage',
          description: 'The current build supports ChatGPT and Gemini today, with broader platform support planned.',
          cards: [
            {
              title: 'ChatGPT',
              body: 'Supports chatgpt.com and chat.openai.com in the current public build.'
            },
            {
              title: 'Gemini',
              body: 'Supports gemini.google.com in the current public build.'
            }
          ]
        },
        usage: {
          title: 'Recommended Workflow',
          description: 'Use the popup for runtime actions and this page as a format reference.',
          cards: [
            {
              title: '1. Open a supported chat page',
              body: 'Sign in first, then navigate to a currently supported conversation page before opening the popup.'
            },
            {
              title: '2. Start crawling from the popup',
              body: 'The popup shows platform detection, job status, progress, and recent events.'
            },
            {
              title: '3. Export when ready',
              body: 'Use Export JSON to download the currently stored conversations.'
            }
          ]
        },
        compliance: {
          title: 'Compliance Notice',
          description: 'Use this extension only when you are authorized to capture and retain the relevant conversation data.',
          cards: [
            {
              title: 'Follow platform rules',
              body: 'Check the target platform terms, acceptable-use rules, and any restrictions on automation or export before using the extension.'
            },
            {
              title: 'Respect privacy and law',
              body: 'Only collect data when you have a lawful basis and any required consent under the rules that apply to you.'
            },
            {
              title: 'Do not bypass safeguards',
              body: 'Do not use Chat Archive to evade access controls, rate limits, account restrictions, or other platform protections.'
            }
          ]
        }
      }
    }
  },
  zh: {
    popup: {
      title: 'Chat Archive',
      platformLabel: '平台',
      statusLabel: '任务状态',
      progressLabel: '进度',
      controlsTitle: '任务控制',
      conversationsTitle: '会话选择',
      logsTitle: '最近事件',
      viewGuide: '指南',
      updateSelected: '更新所选',
      abort: '中止任务',
      exportJson: '导出 JSON',
      toggleAll: '全选/全不选',
      refresh: '刷新',
      clear: '清空',
      noConversations: '暂无已捕获会话。',
      noEvents: '暂无最近事件。',
      pending: '待处理',
      failed: '失败',
      autoResume: '自动恢复',
      pauseReason: '暂停',
      cooldown: '冷却',
      mode: '模式',
      error: '错误',
      startRunning: '抓取进行中',
      start: '开始抓取',
      unsupportedPage: '不支持的页面',
      unknownError: '未知错误',
      startFailed: '启动抓取失败。',
      updateSelectedEmpty: '请先勾选至少一个会话。',
      updateSelectedFailed: '更新所选会话失败。',
      selectionSummaryHeader: '当前将在 {platform} 上更新 {matched} 个已选会话。',
      selectionOtherPlatforms: '有 {count} 个已选项属于其他平台，请切换到对应平台页面后再操作：',
      selectionMissingCurrent: '有 {count} 个已选项未在当前平台列表中找到：',
      exportFailed: '导出 JSON 失败。',
      complianceTitle: '仅限授权使用',
      complianceBody: '仅当你有权依据平台规则和适用法律访问、导出并保存相关会话数据时，才可使用此扩展。'
    },
    options: {
      title: 'Chat Archive 导出指南',
      description: 'Chat Archive 当前支持 ChatGPT 和 Gemini，并会逐步扩展到更多平台，仅面向已获授权且符合平台规则的归档用途。',
      complianceLead: {
        title: '仅限授权使用',
        body: '仅当你有权依据平台规则和适用法律抓取并保存相关会话数据时，才应使用 Chat Archive。'
      },
      heroCards: [
        {
          title: '完全本地',
          body: '所有抓取、存储和导出流程都在浏览器扩展内部完成。'
        },
        {
          title: '保留修订历史',
          body: '每个会话都保存当前快照以及用于记录历史分支的修订树。'
        },
        {
          title: '适合归档',
          body: '导出结果是 JSON 包，方便归档、检索和后续处理。'
        }
      ],
      sections: {
        uses: {
          title: '功能说明',
          cards: [
            {
              title: '收集会话列表',
              body: '扩展会遍历支持平台的侧边栏或列表界面，并记录可发现的会话。'
            },
            {
              title: '加载完整会话内容',
              body: '每个被选中的会话都会被打开并抓取为稳定的 JSON 快照。'
            },
            {
              title: '支持断点续跑',
              body: '任务状态保存在本地，后续运行可以继续处理未完成的内容。'
            }
          ]
        },
        structure: {
          title: '导出结构',
          paragraphs: [
            '导出内容包含一个包对象，其中有导出元数据和 conversations 数组。',
            '每个会话在根级保存当前快照，同时在 revisions[] 中保存修订历史。'
          ],
          schemaPreview: `{
  "export_info": {
    "format": "chat-archive-export",
    "schema_version": 2
  },
  "conversations": [
    {
      "platform": "platform-a",
      "conversation_id": "...",
      "messages": [],
      "revisions": []
    }
  ]
}`
        },
        variants: {
          title: '平台覆盖范围',
          description: '当前版本支持 ChatGPT 和 Gemini，后续会继续扩展更多平台支持。',
          cards: [
            {
              title: 'ChatGPT',
              body: '当前公开版本支持 chatgpt.com 和 chat.openai.com。'
            },
            {
              title: 'Gemini',
              body: '当前公开版本支持 gemini.google.com。'
            }
          ]
        },
        usage: {
          title: '推荐流程',
          description: '运行操作在弹窗中执行，此页面用于查看格式说明。',
          cards: [
            {
              title: '1. 打开支持的聊天页面',
              body: '先登录，然后进入一个当前受支持的会话页面，再打开扩展弹窗。'
            },
            {
              title: '2. 在弹窗中开始抓取',
              body: '弹窗会显示平台识别、任务状态、进度以及最近事件。'
            },
            {
              title: '3. 准备好后导出',
              body: '点击 Export JSON 下载当前已存储的会话数据。'
            }
          ]
        },
        compliance: {
          title: '合规说明',
          description: '仅当你有权访问、抓取和保存相关会话数据时，才应使用此扩展。',
          cards: [
            {
              title: '遵守平台规则',
              body: '使用前请确认目标平台的服务条款、可接受使用规则，以及对自动化或导出的限制。'
            },
            {
              title: '遵守隐私与法律要求',
              body: '只有在你具备合法依据并已满足所适用的同意或合规要求时，才应收集相关数据。'
            },
            {
              title: '不要绕过保护机制',
              body: '不要使用 Chat Archive 规避访问控制、频率限制、账号限制或其他平台保护措施。'
            }
          ]
        }
      }
    }
  }
};

const EN_LOG_TEMPLATES = {
  list_scrape_started: (log) => `Started collecting the ${formatPlatformLabel('en', log?.data?.platform)} conversation list.`,
  list_scrape_completed: (log) => `Completed collecting the ${formatPlatformLabel('en', log?.data?.platform)} conversation list.`,
  preview_failed: (log) => `Could not preview the current ${formatPlatformLabel('en', log?.data?.platform)} conversation.`,
  preview_completed: (log) => `Previewed the current ${formatPlatformLabel('en', log?.data?.platform)} conversation.`,
  selector_self_check: (log) => `Completed selector self-check for ${formatPlatformLabel('en', log?.data?.platform)}.`,
  crawl_started: (log) => `Started crawling ${formatPlatformLabel('en', log?.data?.platform)}.`,
  crawl_completed: (log) => `Completed crawling ${formatPlatformLabel('en', log?.data?.platform)}.`,
  crawl_error: (log) => `Crawling failed: ${localizeError('en', log?.data?.error || log?.message || '')}`,
  crawl_aborted: (log) => `Aborted crawling ${formatPlatformLabel('en', log?.data?.platform)}.`,
  queue_refreshed: (log) => `Refreshed the ${formatPlatformLabel('en', log?.data?.platform)} conversation queue.`,
  crawl_auto_pause: (log) => `Triggered an automatic pause for ${formatPlatformLabel('en', log?.data?.platform)}.`,
  crawl_auto_resume: (log) => `Automatic pause finished. Resuming ${formatPlatformLabel('en', log?.data?.platform)}.`,
  crawl_auto_resume_failed: (log) => `Automatic resume failed for ${formatPlatformLabel('en', log?.data?.platform)}.`,
  crawl_policy_loaded: (log) => `Loaded the ${formatPolicyMode('en', log?.data?.mode)} crawl policy.`,
  crawl_pause_threshold: (log) => localizeLegacyMessage('en', log?.message || 'Reached a crawl threshold and paused.'),
  crawl_cycle_reseeded: (log) => `Reset thresholds for the next ${formatPlatformLabel('en', log?.data?.platform)} cycle.`,
  conversation_picked: (log) => `Picked next conversation ${log?.data?.conversationId || 'unknown'}.`,
  open_conversation_failed: (log) => `Failed to open conversation ${log?.data?.conversationId || 'unknown'}.`,
  crawl_cooldown_started: (log) => `Too many consecutive failures for ${formatPlatformLabel('en', log?.data?.platform)}. Starting cooldown.`,
  scrape_conversation_failed: (log) => `Failed to scrape conversation ${log?.data?.conversationId || 'unknown'}.`,
  conversation_saved: (log) => `Saved conversation ${log?.data?.conversationId || log?.data?.title || 'unknown'}.`,
  crawl_human_break: (log) => `Inserted a human-like pause while crawling ${formatPlatformLabel('en', log?.data?.platform)}.`,
  content_runtime_ready: () => 'Content runtime check passed.',
  crawl_resume_requested: (log) => `Ignored a duplicate start request because ${formatPlatformLabel('en', log?.data?.platform)} is already running.`,
  abort_requested: (log) => `Received abort request for ${formatPlatformLabel('en', log?.data?.platform)}.`,
  abort_state_updated: (log) => `Updated abort state for ${formatPlatformLabel('en', log?.data?.platform)}.`,
  export_json: () => 'Exported JSON.'
};

const ZH_LOG_TEMPLATES = {
  list_scrape_started: (log) => `开始收集${formatPlatformLabel('zh', log?.data?.platform)}会话列表。`,
  list_scrape_completed: (log) => `已完成${formatPlatformLabel('zh', log?.data?.platform)}会话列表收集。`,
  preview_failed: (log) => `无法预览当前${formatPlatformLabel('zh', log?.data?.platform)}会话。`,
  preview_completed: (log) => `已预览当前${formatPlatformLabel('zh', log?.data?.platform)}会话。`,
  selector_self_check: (log) => `已完成${formatPlatformLabel('zh', log?.data?.platform)}选择器自检。`,
  crawl_started: (log) => `已开始${formatPlatformLabel('zh', log?.data?.platform)}抓取。`,
  crawl_completed: (log) => `已完成${formatPlatformLabel('zh', log?.data?.platform)}抓取。`,
  crawl_error: (log) => `抓取失败：${localizeError('zh', log?.data?.error || log?.message || '')}`,
  crawl_aborted: (log) => `已中止${formatPlatformLabel('zh', log?.data?.platform)}抓取。`,
  queue_refreshed: (log) => `${formatPlatformLabel('zh', log?.data?.platform)}会话队列已刷新。`,
  crawl_auto_pause: (log) => `已为${formatPlatformLabel('zh', log?.data?.platform)}触发自动暂停。`,
  crawl_auto_resume: (log) => `自动暂停结束，继续${formatPlatformLabel('zh', log?.data?.platform)}抓取。`,
  crawl_auto_resume_failed: (log) => `${formatPlatformLabel('zh', log?.data?.platform)}自动恢复失败。`,
  crawl_policy_loaded: (log) => `已加载${formatPolicyMode('zh', log?.data?.mode)}抓取策略。`,
  crawl_pause_threshold: (log) => localizeLegacyMessage('zh', log?.message || '已达到抓取阈值并暂停。'),
  crawl_cycle_reseeded: (log) => `已重置下一轮${formatPlatformLabel('zh', log?.data?.platform)}抓取阈值。`,
  conversation_picked: (log) => `已随机选中下一条会话 ${log?.data?.conversationId || 'unknown'}。`,
  open_conversation_failed: (log) => `打开会话失败 ${log?.data?.conversationId || 'unknown'}。`,
  crawl_cooldown_started: (log) => `连续失败次数过多，${formatPlatformLabel('zh', log?.data?.platform)}进入冷却。`,
  scrape_conversation_failed: (log) => `抓取会话失败 ${log?.data?.conversationId || 'unknown'}。`,
  conversation_saved: (log) => `已保存会话 ${log?.data?.conversationId || log?.data?.title || 'unknown'}。`,
  crawl_human_break: (log) => `已为${formatPlatformLabel('zh', log?.data?.platform)}插入一次人工式暂停。`,
  content_runtime_ready: () => '内容脚本运行时检查通过。',
  crawl_resume_requested: (log) => `${formatPlatformLabel('zh', log?.data?.platform)}已在运行，忽略重复启动请求。`,
  abort_requested: (log) => `收到中止请求 ${formatPlatformLabel('zh', log?.data?.platform)}。`,
  abort_state_updated: (log) => `已更新${formatPlatformLabel('zh', log?.data?.platform)}中止状态。`,
  export_json: () => '已导出 JSON。'
};

const ZH_ERROR_SUBSTRINGS = [
  ['Content script is unavailable. Refresh the page and try again.', '内容脚本不可用。请刷新页面后重试。'],
  ['This page is still running an outdated content script. Refresh the page and try again.', '当前页面仍在运行旧版内容脚本。请刷新页面后重试。'],
  ['Failed to scrape the conversation list.', '抓取会话列表失败。'],
  ['Could not detect the current platform.', '无法识别当前平台。'],
  ['Target tab was not found.', '未找到目标标签页。'],
  ['This platform is on cooldown. Try again in ', '当前平台正在冷却中，请在 '],
  ['Crawling is on cooldown. Try again in ', '当前抓取任务正在冷却中，请在 '],
  [' min.', ' 分钟后重试。'],
  ['Reached the single-run batch limit', '已达到单轮批次上限'],
  ['Reached the single-run time limit', '已达到单轮时长上限'],
  ['Resume after ', '将于 '],
  [' sec', ' 秒后自动继续'],
  [' min', ' 分钟后自动继续'],
  ['Automatic resume failed because the target tab is no longer available.', '自动恢复失败：目标标签页已不可用。'],
  ['Automatic resume failed for ', '自动恢复失败：'],
  ['Too many consecutive failures (', '连续失败次数过多（'],
  ['). Cooling down for ', '），进入冷却，时长 '],
  ['Failed to open conversation: ', '打开会话失败：'],
  ['Failed to scrape conversation: ', '抓取会话失败：'],
  ['Crawling was aborted during the automatic pause.', '任务已在自动暂停期间被中止。'],
  ['Crawling was aborted.', '抓取任务已中止。'],
  ['Failed to start crawling.', '启动抓取失败。'],
  ['Failed to export JSON.', '导出 JSON 失败。'],
  ['Unsupported page', '不支持的页面'],
  ['Unknown error', '未知错误'],
  ['Refresh the page and try again.', '请刷新页面后重试。']
];

const EN_ERROR_SUBSTRINGS = [
  ['内容脚本不可用。请刷新页面后重试。', 'Content script is unavailable. Refresh the page and try again.'],
  ['当前页面仍在运行旧版内容脚本。请刷新页面后重试。', 'This page is still running an outdated content script. Refresh the page and try again.'],
  ['抓取会话列表失败。', 'Failed to scrape the conversation list.'],
  ['无法识别当前平台。', 'Could not detect the current platform.'],
  ['未找到目标标签页。', 'Target tab was not found.'],
  ['当前平台正在冷却中，请在 ', 'This platform is on cooldown. Try again in '],
  ['当前抓取任务正在冷却中，请在 ', 'Crawling is on cooldown. Try again in '],
  [' 分钟后重试。', ' min.'],
  ['已达到单轮批次上限', 'Reached the single-run batch limit'],
  ['已达到单轮时长上限', 'Reached the single-run time limit'],
  ['将于 ', 'Resume after '],
  [' 秒后自动继续', ' sec'],
  [' 分钟后自动继续', ' min'],
  ['自动恢复失败：目标标签页已不可用。', 'Automatic resume failed because the target tab is no longer available.'],
  ['自动恢复失败：', 'Automatic resume failed for '],
  ['连续失败次数过多（', 'Too many consecutive failures ('],
  ['），进入冷却，时长 ', '). Cooling down for '],
  ['打开会话失败：', 'Failed to open conversation: '],
  ['抓取会话失败：', 'Failed to scrape conversation: '],
  ['任务已在自动暂停期间被中止。', 'Crawling was aborted during the automatic pause.'],
  ['抓取任务已中止。', 'Crawling was aborted.'],
  ['启动抓取失败。', 'Failed to start crawling.'],
  ['导出 JSON 失败。', 'Failed to export JSON.'],
  ['不支持的页面', 'Unsupported page'],
  ['未知错误', 'Unknown error'],
  ['请刷新页面后重试。', 'Refresh the page and try again.']
];

const EN_LOG_SUBSTRINGS = [
  ['收到中止请求', 'Received abort request'],
  ['已随机选中下一条会话', 'Picked next conversation'],
  ['已保存会话', 'Saved conversation'],
  ['已开始', 'Started crawling'],
  ['已完成', 'Completed crawling'],
  ['开始收集', 'Started collecting'],
  ['会话列表', 'conversation list'],
  ['会话队列已刷新', 'Conversation queue refreshed'],
  ['内容脚本运行时检查通过', 'Content runtime check passed'],
  ['自动暂停结束', 'Automatic pause finished'],
  ['自动恢复失败', 'Automatic resume failed'],
  ['触发自动暂停', 'Triggered automatic pause'],
  ['进入冷却', 'Entered cooldown'],
  ['抓取失败', 'Crawling failed'],
  ['打开会话失败', 'Failed to open conversation'],
  ['抓取会话失败', 'Failed to scrape conversation'],
  ['已导出 JSON', 'Exported JSON']
];

const ZH_LOG_SUBSTRINGS = [
  ['Received abort request', '收到中止请求'],
  ['Picked next conversation', '已随机选中下一条会话'],
  ['Saved conversation', '已保存会话'],
  ['Started crawling', '已开始抓取'],
  ['Completed crawling', '已完成抓取'],
  ['Started collecting', '开始收集'],
  ['conversation list', '会话列表'],
  ['Content runtime check passed', '内容脚本运行时检查通过'],
  ['Automatic pause finished', '自动暂停结束'],
  ['Automatic resume failed', '自动恢复失败'],
  ['Triggered automatic pause', '触发自动暂停'],
  ['Failed to open conversation', '打开会话失败'],
  ['Failed to scrape conversation', '抓取会话失败'],
  ['Exported JSON', '已导出 JSON']
];

function replaceSubstrings(text, replacements) {
  let result = String(text || '');
  for (const [needle, translated] of replacements) {
    if (result.includes(needle)) {
      result = result.replaceAll(needle, translated);
    }
  }
  return result;
}

function localizeLegacyMessage(language, message) {
  const text = String(message || '').trim();
  if (!text) {
    return text;
  }

  if (normalizeLanguage(language) === 'zh') {
    return replaceSubstrings(text, ZH_LOG_SUBSTRINGS);
  }

  return replaceSubstrings(text, EN_LOG_SUBSTRINGS);
}

function deepGet(obj, key) {
  return String(key || '')
    .split('.')
    .filter(Boolean)
    .reduce((value, part) => (value && typeof value === 'object' ? value[part] : undefined), obj);
}

function titleCase(value) {
  return String(value || '')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

export function getAlternateLanguage(language) {
  return normalizeLanguage(language) === 'zh' ? 'en' : 'zh';
}

export function getLanguageToggleLabel(language) {
  return normalizeLanguage(language) === 'zh' ? 'English' : '中文';
}

export async function getLanguage() {
  try {
    const store = await chrome.storage.local.get([UI_LANGUAGE_KEY]);
    if (store?.[UI_LANGUAGE_KEY]) {
      return normalizeLanguage(store[UI_LANGUAGE_KEY]);
    }
  } catch {
    // Ignore storage errors and fall back to the browser locale.
  }

  const browserLanguage = typeof chrome?.i18n?.getUILanguage === 'function'
    ? chrome.i18n.getUILanguage()
    : (navigator.language || 'en');
  return normalizeLanguage(browserLanguage);
}

export async function setLanguage(language) {
  const normalized = normalizeLanguage(language);
  await chrome.storage.local.set({ [UI_LANGUAGE_KEY]: normalized });
  return normalized;
}

export function t(language, key, params = null) {
  const normalized = normalizeLanguage(language);
  const template = deepGet(COPY[normalized], key) ?? deepGet(COPY.en, key) ?? key;
  if (!params || typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token) => {
    return Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : `{${token}}`;
  });
}

export function getOptionsCopy(language) {
  return COPY[normalizeLanguage(language)].options;
}

export function formatPlatformLabel(language, platform) {
  if (!platform) {
    return normalizeLanguage(language) === 'zh' ? '未知平台' : 'Unknown';
  }
  return PLATFORM_LABELS[platform] || titleCase(platform);
}

export function formatStatusLabel(language, status) {
  const normalized = normalizeLanguage(language);
  return STATUS_LABELS[normalized][status] || STATUS_LABELS.en[status] || titleCase(status);
}

export function formatPolicyMode(language, mode) {
  const normalized = normalizeLanguage(language);
  return POLICY_MODE_LABELS[normalized][mode] || POLICY_MODE_LABELS.en[mode] || titleCase(mode);
}

export function formatTimestamp(language, value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat(normalizeLanguage(language) === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function formatMinutes(language, minutes) {
  const safeMinutes = Math.max(1, Number(minutes) || 1);
  if (normalizeLanguage(language) === 'zh') {
    return `${safeMinutes} 分钟`;
  }
  return `${safeMinutes} min`;
}

export function localizeError(language, message) {
  const text = String(message || '').trim();
  if (!text) {
    return text;
  }

  if (normalizeLanguage(language) === 'zh') {
    return replaceSubstrings(text, ZH_ERROR_SUBSTRINGS);
  }

  return replaceSubstrings(text, EN_ERROR_SUBSTRINGS);
}

export function localizeLog(language, log) {
  const normalized = normalizeLanguage(language);
  const templates = normalized === 'zh' ? ZH_LOG_TEMPLATES : EN_LOG_TEMPLATES;
  const template = templates[log?.event];

  if (template) {
    return template(log);
  }

  if (normalized === 'zh') {
    return localizeLegacyMessage('zh', localizeError('zh', log?.message || titleCase(log?.event || 'event')));
  }

  return localizeLegacyMessage('en', localizeError('en', log?.message || titleCase(log?.event || 'event')));
}