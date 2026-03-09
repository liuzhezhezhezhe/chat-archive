function buildJsonExport(conversations) {
  const exportedAt = new Date().toISOString();
  return JSON.stringify({
    export_info: {
      format: 'chat-archive-export',
      schema_version: 2,
      exported_at: exportedAt,
      conversation_count: Array.isArray(conversations) ? conversations.length : 0,
      structure_type: 'conversation-snapshot-plus-revision-tree',
      description: [
        'Each conversation stores one current snapshot at the root level and a revision tree in revisions[].',
        'The tree is built from conversation revisions, not from message nodes.',
        'current_revision_id points to the active revision, while messages contains the active snapshot for convenient reading and export.',
        'Revision nodes are linked by parent_revision_id. divergence_index indicates the first message position where a child revision diverges from its parent.',
        'Messages are duplicated between the root snapshot and the active revision on purpose so common readers can access current content without reconstructing the tree.'
      ],
      field_guide: {
        conversation: {
          platform: 'Source platform, such as chatgpt or gemini.',
          conversation_id: 'Platform conversation identifier. Together with platform, this is the stable conversation key.',
          title: 'Current display title of the conversation.',
          tree_root_id: 'Stable root identifier for the conversation revision tree.',
          current_revision_id: 'Revision id currently considered active.',
          conversation_hash: 'Hash of the active snapshot message sequence.',
          messages: 'Active snapshot messages. This is the current readable conversation view.',
          revisions: 'Revision tree nodes for the same conversation.',
          updated_at: 'Last time the active snapshot record was updated.',
          last_checked_at: 'Last time the conversation was re-scraped and checked.',
          last_changed_at: 'Last time the conversation content actually changed.'
        },
        revision: {
          revision_id: 'Unique id of a revision node.',
          parent_revision_id: 'Parent revision node. null means the initial revision.',
          change_type: 'Why this revision was created, such as created, append, branch, switch_revision or imported.',
          divergence_index: 'Zero-based index of the first message that differs from the parent revision.',
          conversation_hash: 'Hash of this revision snapshot.',
          messages: 'Full message snapshot for this revision.',
          message_count: 'Number of messages in this revision.',
          created_at: 'Time when this revision node was created.'
        },
        message: {
          role: 'Message author role, typically user or assistant.',
          content: 'Captured message body as text content. It may contain Markdown-style formatting from the scraper layer.',
          hash: 'Hash of role plus content, used for comparison and deduplication.',
          created_at: 'Capture-time timestamp stored by Chat Archive for this message snapshot.'
        }
      }
    },
    conversations: Array.isArray(conversations) ? conversations : []
  }, null, 2);
}

async function triggerDownload(filename, mimeType, content) {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  const base64 = btoa(binary);
  const url = `data:${mimeType};base64,${base64}`;
  await chrome.downloads.download({
    url,
    filename,
    saveAs: true
  });
}

export async function exportJson(conversations) {
  const content = buildJsonExport(conversations);
  const filename = `chat-archive-${Date.now()}.json`;
  await triggerDownload(filename, 'application/json', content);
}
