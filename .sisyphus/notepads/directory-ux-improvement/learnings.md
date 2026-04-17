# Learnings - directory-ux-improvement

## 2026-04-17 Initial Setup
- PathInput.tsx already exists with Command/CommandInput search pattern - MUST reuse
- SettingsDialog uses Sheet(bottom)+Dialog(centered) dual mode - MUST follow this pattern
- DirConfig is duplicated in config.ts and SettingsDialog.tsx - MUST unify
- exclude field is dead (stored but never applied) - MUST NOT make it functional
- PATCH API only supports exclude, not name - MUST add name support
- CreateFileModal exists but is unused - MUST NOT touch it
- config-changed DOM event is the refresh mechanism after directory mutations