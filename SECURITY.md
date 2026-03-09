# Security Policy

[English](./SECURITY.md) | [简体中文](./SECURITY.zh-CN.md)

## Supported Scope

Security reports are most relevant when they involve:

- unintended data exposure in exported archives
- unsafe extension permissions or browser-surface behavior
- vulnerabilities that could cause captured conversations to leak outside the local browser context
- malicious page interaction paths on supported platforms

## Reporting

If you discover a security issue, do not open a public issue with exploit details.

Instead, contact the maintainer privately through the security contact you publish on GitHub, then include:

- a short description of the issue
- affected versions or commit range
- reproduction steps
- impact assessment
- suggested mitigation if you have one

## Compliance Boundary

This project is for authorized, lawful archiving only.

- The software is not intended to authorize conduct that violates platform terms, privacy obligations, contractual restrictions, or applicable law.
- Requests to weaken user consent, bypass access controls, or conceal prohibited collection behavior should be treated as out of scope.
- Bugs that merely make scraping more aggressive are not security improvements by themselves and may conflict with the intended compliance posture of the project.

## Current Design Constraints

- This project is local-first and has no server component in this repository.
- Conversation content is stored in the browser extension's local storage and exported through the browser download API.
- The extension runs on supported chat domains and necessarily interacts with page DOM content.

Please keep reports focused on real security impact rather than general scraper brittleness. DOM breakage and selector drift are important bugs, but they are not automatically security issues.