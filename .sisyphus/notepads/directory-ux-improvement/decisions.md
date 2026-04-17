# Decisions - directory-ux-improvement

## 2026-04-17 User Decisions
- Add directory: search select (reuse PathInput)
- Edit directory: display name alias (persisted) + delete (AlertDialog confirm) - NO exclude editing
- Display name is alias, NOT actual folder path rename
- Always show directory switcher row (remove groups.length > 1 condition)
- Delete current dir: auto-switch to first remaining; all deleted: empty state with add guidance
- isCli dirs: allow edit and delete
- Error display: inline in dialog (not toast)
- Test strategy: no unit tests, Agent QA via chrome-devtools MCP