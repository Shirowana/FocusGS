// src/main.js
import { loadScenes, getSceneFromQuery } from "./config/loadScenes.js";
import { renderHomePage, renderWorkspacePage } from "./ui/renderApp.js";
import { getHistoryByScene } from "./config/loadHistory.js";
import { createViewer } from "./viewer/createViewer.js";
import { loadSceneIntoViewer } from "./viewer/loadScene.js";

async function bootstrap() {
  try {
    const scenes = await loadScenes();
    const selectedScene = getSceneFromQuery(scenes);

    // 如果没有选中场景，渲染首页
    if (!selectedScene) {
      renderHomePage(scenes);
      return; // 首页不需要加载 3D Viewer
    }

    // 并发加载历史任务数据（不阻塞主流程，失败时降级为空数组）
    const history = await getHistoryByScene(selectedScene.id).catch(() => []);

    // 已选中场景，渲染工作台界面并加载 Gaussian Splatting
    renderWorkspacePage(scenes, selectedScene, history);

    const statusEl = document.getElementById("status");
    const overlayEl = document.getElementById("status-overlay");
    const viewerRoot = document.getElementById("viewer");
    const viewer = createViewer(viewerRoot);

    await loadSceneIntoViewer(viewer, selectedScene);

    // 加载完成后清除覆盖层 loading
    if (statusEl) statusEl.textContent = `Loaded ${selectedScene.id}. Drag to inspect.`;
    if (overlayEl) overlayEl.style.display = "none";
  } catch (error) {
    console.error(error);
    const appRoot = document.getElementById("app");
    appRoot.innerHTML = `
      <div class="error-state">
        <h1>Failed to load Application</h1>
        <p>${error.message}</p>
        <a href="/" class="btn btn--outline" style="margin-top:20px;">返回首页</a>
      </div>
    `;
  }
}

bootstrap();
