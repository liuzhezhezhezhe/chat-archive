# Chat Archive

[English](./README.md) | [简体中文](./README.zh-CN.md)

> Warning
> Chat Archive is only for authorized, lawful archiving of conversation data that you are permitted to access, export, retain, and process. You must follow the target platform's terms, automation rules, privacy obligations, and all applicable laws and regulations.

Chat Archive is a local-first browser extension for exporting AI chat histories as revision-aware JSON archives.

It is deliberately specialized for people who need durable, inspectable conversation records instead of one-off copy/paste exports. The project focuses on structured archiving, reproducible local storage, and a stable JSON model that can be indexed, diffed, or imported into downstream tools.

## Positioning

Chat Archive is not a generic browser automation tool.

It is specifically designed for:

- personal archiving of AI conversations
- local research datasets
- revision-aware conversation history tracking
- JSON export for search, analysis, and ingestion pipelines

It intentionally does not try to be:

- a cloud sync product
- a hosted SaaS service
- a prompt manager
- a multi-user team platform

## Core Characteristics

- Fully local: no backend service, no remote storage, no telemetry pipeline in this repository.
- Revision-aware: each conversation stores a current snapshot plus a revision tree.
- Resume-friendly: crawl state persists in `chrome.storage.local`.
- Platform-specific: adapters are written for supported chat products rather than using a generic scraper.
- Bilingual UI: popup and guide surfaces support English and Chinese.

## Supported Platforms

- ChatGPT: `chatgpt.com`, `chat.openai.com`
- Gemini: `gemini.google.com`

## Privacy Model

- Conversation capture, state, and export all happen locally in the browser extension.
- Exported JSON files are written through the browser download API to a location you choose.
- This repository does not include any server-side component.

That said, the extension necessarily interacts with the DOM of supported chat pages in your logged-in browser session. Review the source before using it with sensitive data.

## Compliance And Responsible Use

This project is intended for lawful, authorized archiving of conversation data that you are permitted to access and retain.

- You are responsible for complying with the terms of service, acceptable-use policies, export restrictions, and automation rules of the platform you use.
- You are responsible for complying with privacy law, data-protection law, employment rules, contract duties, and any internal compliance requirements that apply to your use case.
- Do not use this extension to capture data that you do not have the right to access, export, retain, or process.
- Do not use this project to bypass rate limits, access controls, consent requirements, account restrictions, or platform safeguards.
- If a platform disallows the workflow you want, do not use this tool for that workflow.

This repository provides software only. It does not grant permission to violate platform rules or applicable law.

## Quick Start

1. Install Node.js 20 or later.
2. Run `npm run doctor`.
3. Run `npm run build`.
4. Open `chrome://extensions` or the equivalent Edge page.
5. Enable developer mode.
6. Load the unpacked extension from `dist/`.
7. Open ChatGPT or Gemini in the same browser profile.
8. Open the extension popup and start crawling.
9. Export JSON when the crawl reaches the conversations you want.

Before real use, confirm that your target platform and your jurisdiction allow the specific collection and retention behavior you intend.

## Development Commands

- `npm run doctor`: validate local prerequisites and project structure
- `npm run build`: build the unpacked extension into `dist/`
- `npm run dev`: watch and sync source changes into `dist/`
- `npm run clean`: remove `dist/` and `release/`
- `npm run package`: build and create a ZIP package in `release/`

## Repository Layout

- `manifest.json`: extension manifest
- `chat-archive.config.json`: build and packaging config
- `src/background.js`: crawl scheduler, pacing, export entry points
- `src/content.js`: page-side crawl runtime and DOM orchestration
- `src/storage.js`: local conversation persistence and revision maintenance
- `src/job-state.js`: saved crawl job state
- `src/exporters.js`: JSON export generation and download handoff
- `src/adapters/`: platform-specific adapters and shared adapter base
- `popup/`: runtime controls and live crawl status
- `options/`: export guide and format reference

## Architecture Notes

The project is organized around a narrow responsibility split:

- `background.js` owns scheduling, pacing, state transitions, and export actions.
- `content.js` owns page interaction, scrolling, and message collection.
- adapter modules own platform selectors, conversation discovery, and message extraction details.
- storage modules own stable local persistence and revision-tree updates.

This separation is intentional. It keeps platform churn isolated in adapters and reduces the chance that UI changes break export semantics.

## Crawl Behavior

- Crawl state is stored in `chrome.storage.local`.
- Interrupted runs can resume from pending conversation IDs.
- Completed runs can be restarted to refresh lists and detect revisions.
- Conservative pacing and cooldown logic exist to avoid fixed-frequency automation behavior.
- Popup status values include `idle`, `running`, `waiting`, `aborting`, `aborted`, `completed`, and `error`.

## Export Model

The exported JSON is a package object, not a bare conversation array.

```json
{
  "export_info": {
    "format": "chat-archive-export",
    "schema_version": 2,
    "exported_at": "2026-03-07T00:00:00.000Z",
    "conversation_count": 12,
    "structure_type": "conversation-snapshot-plus-revision-tree"
  },
  "conversations": [
    {
      "platform": "chatgpt",
      "conversation_id": "...",
      "title": "...",
      "tree_root_id": "root::chatgpt::...",
      "current_revision_id": "rev::chatgpt::...",
      "conversation_hash": "...",
      "messages": ["active snapshot"],
      "revisions": ["revision nodes"],
      "updated_at": 0,
      "last_checked_at": 0,
      "last_changed_at": 0
    }
  ]
}
```

The core model is a conversation snapshot plus a revision tree, not a message-level N-ary tree.

- `conversations[*].messages`: active snapshot for direct reading
- `conversations[*].revisions`: revision history for the same conversation
- `revisions[*].parent_revision_id`: revision lineage
- `revisions[*].divergence_index`: first message index where a child revision diverges
- `current_revision_id`: active revision represented by the root snapshot

### Why Both Root And Revisions Store Messages

- Root-level `messages` is optimized for common reads.
- `revisions[*].messages` preserves full historical snapshots.
- The duplication is intentional because it makes export consumption, debugging, and data loading simpler.

## Minimal Example

```json
{
  "export_info": {
    "format": "chat-archive-export",
    "schema_version": 2,
    "structure_type": "conversation-snapshot-plus-revision-tree"
  },
  "conversations": [
    {
      "platform": "chatgpt",
      "conversation_id": "conv-1",
      "title": "Example Conversation",
      "tree_root_id": "root::chatgpt::conv-1",
      "current_revision_id": "rev-B",
      "conversation_hash": "hash-B",
      "messages": [
        { "role": "user", "content": "Hello", "hash": "m1" },
        { "role": "assistant", "content": "Hi, what can I help with?", "hash": "m2" },
        { "role": "user", "content": "Draft a weekly summary", "hash": "m3" },
        { "role": "assistant", "content": "Here is a first draft", "hash": "m4" },
        { "role": "user", "content": "Make it shorter", "hash": "m5" },
        { "role": "assistant", "content": "Here is a shorter version", "hash": "m6" }
      ],
      "revisions": [
        {
          "revision_id": "rev-A",
          "parent_revision_id": null,
          "change_type": "created",
          "divergence_index": 0,
          "conversation_hash": "hash-A",
          "message_count": 4,
          "messages": [
            { "role": "user", "content": "Hello", "hash": "m1" },
            { "role": "assistant", "content": "Hi, what can I help with?", "hash": "m2" },
            { "role": "user", "content": "Draft a weekly summary", "hash": "m3" },
            { "role": "assistant", "content": "Here is a first draft", "hash": "m4" }
          ]
        },
        {
          "revision_id": "rev-B",
          "parent_revision_id": "rev-A",
          "change_type": "append",
          "divergence_index": 4,
          "conversation_hash": "hash-B",
          "message_count": 6,
          "messages": [
            { "role": "user", "content": "Hello", "hash": "m1" },
            { "role": "assistant", "content": "Hi, what can I help with?", "hash": "m2" },
            { "role": "user", "content": "Draft a weekly summary", "hash": "m3" },
            { "role": "assistant", "content": "Here is a first draft", "hash": "m4" },
            { "role": "user", "content": "Make it shorter", "hash": "m5" },
            { "role": "assistant", "content": "Here is a shorter version", "hash": "m6" }
          ]
        }
      ]
    }
  ]
}
```

## Scope For Contributors

Contributions are most useful when they fit the project's specialization:

- fixes for ChatGPT and Gemini DOM changes
- export schema improvements that preserve backward clarity
- crawl reliability improvements
- adapter architecture improvements for new supported platforms
- documentation for archive consumers

Less useful changes include generic UI redesigns, non-archival product features, or cloud-service assumptions.

See `CONTRIBUTING.md` and `SECURITY.md` for collaboration details.