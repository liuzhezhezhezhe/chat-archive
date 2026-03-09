# Contributing

[English](./CONTRIBUTING.md) | [简体中文](./CONTRIBUTING.zh-CN.md)

Thanks for contributing to Chat Archive.

This project is intentionally narrow in scope: it is a local-first, revision-aware archive exporter for supported AI chat platforms. The best contributions strengthen that core instead of broadening the product into unrelated workflow features.

## Compliance Expectations

Contributions must not be aimed at helping users bypass platform policy, contract restrictions, consent requirements, access controls, or applicable law.

- Do not submit changes whose purpose is to evade platform anti-abuse systems or prohibited automation rules.
- Do not optimize for covert scraping, hidden account rotation, or access beyond what an authorized user is allowed to retrieve.
- Prefer changes that improve transparency, user control, data minimization, and lawful archival workflows.

## Good Contribution Areas

- fixes for ChatGPT or Gemini DOM changes
- improvements to crawl stability and resumability
- export schema clarity and documentation
- adapter architecture improvements
- carefully scoped support for additional AI chat platforms
- tests or validation improvements in build and packaging scripts

## Changes That Usually Need Strong Justification

- turning the project into a cloud or sync product
- adding account systems or hosted APIs
- large visual redesigns unrelated to crawl/export clarity
- changes that make the export schema harder to consume programmatically
- features primarily intended to defeat platform restrictions or compliance safeguards

## Development Workflow

1. Run `npm run doctor`.
2. Run `npm run build`.
3. Load `dist/` as an unpacked extension.
4. Reproduce the issue on a supported platform.
5. Make the smallest change that fixes the root cause.
6. Re-run `npm run build` before opening a pull request.

## Implementation Notes

- Keep platform-specific DOM logic inside `src/adapters/` when possible.
- Keep scheduling and pacing logic in `src/background.js`.
- Keep page interaction flow in `src/content.js`.
- Preserve the revision-aware export model unless there is a strong migration plan.
- Avoid unrelated refactors in the same change.

## Pull Request Guidance

- Explain the user-visible problem.
- Explain the root cause.
- Explain why the chosen change is scoped correctly.
- Include screenshots only when the change affects popup or guide UI.
- Mention any remaining risk, especially for DOM-selector changes.

## Platform Support Expectations

Supported platforms are currently:

- ChatGPT
- Gemini

If you want to add another platform, prefer adding it through the shared adapter pattern instead of branching large amounts of logic into the background or popup layers.