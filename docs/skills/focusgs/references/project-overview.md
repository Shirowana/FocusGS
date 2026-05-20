# Project Overview

## What FocusGS Is

`FocusGS` is a local workspace for multi-view 3D reconstruction, training orchestration, lightweight result publishing, and browser-side scene presentation.

It is not only:

- an algorithm reproduction repo
- a static website
- a standalone viewer

It is intended as a full workflow from training input to web presentation.

## Main Goal

FocusGS tries to make 3D Gaussian Splatting results easier to:

- train under constrained hardware conditions
- manage through a workspace-style UI
- export in lighter-weight forms
- present in the browser

## Current Product Shape

The project currently has two user-facing shapes:

- a homepage / showcase experience
- a workspace for configuring, launching, tracking, and resuming training jobs

The workspace side currently includes:

- scene selection and metadata
- training task creation
- log and progress display
- history listing
- resume-from-checkpoint entry points
- demo-oriented result export UI

## Current Technical Mainline

The current repo mainline is organized around:

- `MEGS-2` for algorithm and training logic
- `gs-browser-viewer` for the actual browser UI and workspace
- `local-api` for local task orchestration
- `web-splat` as a viewer reference/demo codebase

## How To Describe FocusGS Correctly

Use language closer to:

`FocusGS is an end-to-end 3D Gaussian Splatting workflow focused on memory-aware reconstruction, workspace-based experiment management, and lightweight browser-side result delivery.`

Avoid describing it as:

- a pure NeRF project
- only a frontend demo
- only a training script collection
