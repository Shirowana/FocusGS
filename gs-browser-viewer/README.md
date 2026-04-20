# GS Browser Viewer

Browser-based Gaussian Splatting viewer for the FocusGS workspace.

## Requirements

- Node.js `20.x` recommended via `.nvmrc`
- npm `10+` or `11+`

## Install

```bash
cd /home/shirowana/FocusGS/gs-browser-viewer
npm install
```

## Run

```bash
npm run dev
```

Open `http://localhost:4173/`.

Scene switching uses the `scene` query param:

- `http://localhost:4173/?scene=garden`
- `http://localhost:4173/?scene=room`

## Build

```bash
npm run build
npm run preview
```

## Project Layout

- `public/data/scenes.json`: scene metadata used by the UI and viewer
- `public/assets/<scene>/...`: pretrained model assets exposed as static files
- `public/thumbnails/`: scene thumbnail images for gallery/detail pages
- `src/config/`: scene metadata loading and selection helpers
- `src/viewer/`: viewer initialization and scene loading logic
- `src/ui/`: DOM rendering and sidebar/detail UI

## Supported Scenes

- `garden`
- `room`
- `bicycle`
- `bonsai`
- `counter`
- `kitchen`
- `stump`

## Add A New Scene

1. Ensure the pretrained scene exists under `public/assets/<scene>/`.
2. Add an entry to `public/data/scenes.json`.
3. Add a thumbnail under `public/thumbnails/`.
4. Restart `npm run dev` and open `?scene=<id>`.
