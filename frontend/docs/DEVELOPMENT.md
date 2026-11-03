# Frontend Development Guide

## Workflow & Coding Guidelines

### 1. Adding a New Feature
- Place domain components in `src/features/<feature-name>/`.
- Do not import directly from another feature's internal folders; share through `src/components/`, `src/lib/`, or `src/context/`.
- Ensure components declare `"use client"` only when interactive state, effects, or browser DOM APIs are needed.

### 2. State & API Calls
- Shared state belongs in `src/context/CRMContext.tsx`.
- Component-local UI state (e.g., input values, popover visibility) stays within the component.
- All backend communication must use `apiFetch` from `@/lib/api/client`.

### 3. Verification Workflow
Always run:
```bash
npm run typecheck
npm run build
```
before pushing any changes.
