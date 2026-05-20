# Current Architecture

## Repo Layout

The current top-level structure is:

```text
FocusGS/
├── frontend/gs-browser-viewer/
├── backend/local-api/
├── algorithms/MEGS-2/
├── viewers/web-splat/
├── docs/
├── scripts/
├── data/
└── runs/
```

## Subsystem Ownership

### Frontend

`frontend/gs-browser-viewer/` is the primary UI project.

Use it for:

- homepage and showcase sections
- workspace UI
- scene switching
- viewer container integration
- static metadata such as scenes and history display data

Important entrypoints:

- `src/main.js`
- `src/ui/renderApp.js`
- `src/config/loadScenes.js`
- `src/config/loadHistory.js`
- `src/viewer/`
- `styles.css`

### Backend

`backend/local-api/` contains the local Node-side training bridge used by the Vite app.

Use it for:

- creating training jobs
- resolving local dataset paths
- launching `MEGS-2/train.py`
- saving status, logs, preview, and checkpoint metadata
- resume/cancel/history APIs

Important entrypoint:

- `backend/local-api/index.js`

### Algorithms

`algorithms/MEGS-2/` is the current algorithm backbone.

Use it for:

- training behavior
- checkpoint handling
- rendering/metrics support
- pruning or sparsification research
- understanding the model-side implementation

Important entrypoints:

- `train.py`
- `scene/`
- `spherical_gaussian_renderer/`
- `optimizing_spa.py`
- `optimizing_spa_sg.py`
- `metrics.py`
- `render.py`

### Viewer Reference

`viewers/web-splat/` is a viewer reference/demo codebase, not the main workspace UI.

Use it when:

- checking alternative viewer behavior
- understanding viewer-side data expectations
- working on the embedded/demo viewer path

## Data and Runtime Directories

Treat these as local workspace content:

- `data/mipnerf360/`: datasets and COLMAP-ready scene inputs
- `data/pretrained_models/`: local pretrained model assets
- `runs/`: ad hoc or manual training outputs
- `frontend/gs-browser-viewer/.runtime/`: runtime jobs, logs, preview assets, checkpoints, and status snapshots

Do not describe these as lightweight source directories.

## Run Flow

The current practical flow is:

1. Launch frontend with `bash scripts/start_garden_browser_viewer.sh`
2. Open `http://localhost:4173/`
3. Frontend loads scene metadata and workspace UI
4. Local API resolves dataset paths and launches `algorithms/MEGS-2/train.py`
5. Runtime state is written under `.runtime/jobs/`
6. Frontend polls task state, logs, previews, and history

## Current Mainline Rule

When continuing development, default to:

`frontend -> backend -> algorithms -> viewers`

Do not re-introduce old historical structure as the active architecture unless the user explicitly asks for migration history.
