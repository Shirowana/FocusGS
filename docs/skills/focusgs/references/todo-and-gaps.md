# TODO And Gaps

## Current Unfinished Areas

### Training Process Management

- Training is still tied too closely to the frontend/local dev session.
- Process recovery after dev-server interruption is not fully reliable.
- Job state can become disconnected from the real training process.

### Input Pipelines

- `COLMAP` mode is the main path currently wired through.
- image-directory mode is not fully connected to a real automatic `COLMAP` pipeline
- video mode is not fully connected to a real `ffmpeg -> frame extraction -> COLMAP -> training` pipeline

### Export Pipeline

- training-complete to export-result linkage is not fully real
- some export UI paths are still demo-oriented
- output size and compressed size displays are not fully sourced from real artifacts
- lightweight asset post-processing is not fully integrated into the workspace

### History And Resume

- history is present but still needs to evolve into a fuller experiment-management view
- resume-from-checkpoint exists but still needs more real validation
- checkpoint retention strategy is still weak and should become interval-based
- history-to-final-output linking is incomplete

### Monitoring

- richer metric dashboards are not complete
- WandB validation/integration is not confirmed end-to-end

### Viewer And Result Consistency

- training-time live preview is currently limited or intentionally deprioritized
- final-result auto-loading into the viewer still needs consistency checks across normal runs, resumed runs, and exports

### Repo Hygiene

- some runtime and temporary resources still need cleanup decisions
- local environment dependencies, especially media-processing dependencies, are not fully documented
- the system still benefits from clearer architecture and handoff documentation

## Recommended Priority

Suggested next priorities:

1. decouple training process lifetime from the frontend session
2. fully wire image and video ingestion to real backend pipelines
3. connect real training completion to real export/output generation
4. tighten history, checkpoint, resume, and final-result loading into one closed loop
5. improve monitoring and polish the showcase/workflow presentation

## Interpretation Rule

Treat this file as current project gaps, not as proof that every item already exists in a production-ready form.
