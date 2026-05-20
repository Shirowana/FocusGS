---
name: focusgs
description: Understand, onboard to, document, debug, or continue development on the FocusGS project. Use when Codex needs to work on the FocusGS repository for project walkthroughs, architecture mapping, frontend/backend/algorithm ownership, training workflow questions, feature-gap analysis, or follow-up implementation in the FocusGS workspace.
---

# FocusGS

Understand the current FocusGS project quickly and continue work without re-deriving the repo structure each time.

## Default Workflow

Follow this reading order unless the user asks for a narrower task:

1. Read the root `README.md`.
2. Read `docs/TODO_unfinished_features.md`.
3. Read `docs/提示词.md` for project intent and terminology.
4. Then enter the relevant subsystem:
   - `frontend/gs-browser-viewer/`
   - `backend/local-api/`
   - `algorithms/MEGS-2/`
   - `viewers/web-splat/`

## Current Mainline

Treat the current production/development mainline as:

- Frontend workspace: `frontend/gs-browser-viewer/`
- Local training bridge: `backend/local-api/`
- Algorithm backbone: `algorithms/MEGS-2/`
- Viewer reference/demo code: `viewers/web-splat/`

Treat these as local workspace data, not lightweight source modules:

- `data/`
- `runs/`
- `frontend/gs-browser-viewer/.runtime/`

## Working Rules

- Start from project documents before diving into code.
- Map the task to the correct layer before editing:
  - UI, pages, scene config, viewer integration: frontend
  - task lifecycle, local API, job state, path resolution: backend
  - training logic, checkpoints, rendering, pruning/compression research: algorithms
  - alternative viewer implementation or viewer reference work: viewers
- Use `README.md` and the references in this skill as the source of truth for the current repo layout.
- Prefer describing the project as an end-to-end reconstruction and lightweight publishing workflow, not just an algorithm repo or just a website.

## Do Not Get Wrong

- Do not refer to `gaussian-splatting/` as the current mainline. It has been removed from the repo’s active structure.
- Do not treat `viewers/web-splat/` as the primary product UI; it is a viewer reference/demo component.
- Do not treat `data/`, `runs/`, `.runtime/`, `dist/`, `node_modules/`, or temporary asset folders as core source architecture.
- Do not mix historical ideas, demo branches, and current shipped structure unless the user explicitly asks for project evolution.

## References

Read these only as needed:

- `references/project-overview.md`
  Use for project goals, application scenario, and final product shape.
- `references/current-architecture.md`
  Use for actual repo layout, subsystem ownership, run flow, and key entrypoints.
- `references/todo-and-gaps.md`
  Use for unfinished features, current limitations, and next-step priorities.
