import { loadScenes, getSceneFromQuery } from "./config/loadScenes.js";
import { renderApp } from "./ui/renderApp.js";
import { createViewer } from "./viewer/createViewer.js";
import { loadSceneIntoViewer } from "./viewer/loadScene.js";

async function bootstrap() {
  try {
    const scenes = await loadScenes();
    const selectedScene = getSceneFromQuery(scenes);

    renderApp({
      scenes,
      selectedScene,
    });

    const statusEl = document.getElementById("status");
    const viewerRoot = document.getElementById("viewer");
    const viewer = createViewer(viewerRoot);

    await loadSceneIntoViewer(viewer, selectedScene);
    statusEl.textContent = `Loaded ${selectedScene.id}. Drag to inspect geometry and view consistency.`;
  } catch (error) {
    console.error(error);
    const appRoot = document.getElementById("app");
    appRoot.innerHTML = `
      <div class="error-state">
        <h1>Viewer failed to load</h1>
        <p>${error.message}</p>
      </div>
    `;
  }
}

bootstrap();
