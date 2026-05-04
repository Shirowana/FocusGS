// src/main.js
import { loadScenes, getSceneFromQuery } from "./config/loadScenes.js";
import {
  activateHomePage,
  activateWorkspacePage,
  renderHomePage,
  renderWorkspacePage,
} from "./ui/renderApp.js";
import { getHistoryByScene } from "./config/loadHistory.js";
import { createViewer } from "./viewer/createViewer.js";
import { loadSceneIntoViewer } from "./viewer/loadScene.js";
import { loadEmbeddedViewer } from "./viewer/loadEmbeddedViewer.js";

const PAGE_SLIDE_DURATION = 560;
const studioViewerBridge = {
  mode: null,
  viewer: null,
  iframe: null,
};

const transitionState = {
  scenes: [],
  currentPage: null,
  currentScene: null,
  currentHistory: [],
  isTransitioning: false,
};

window.focusGSRuntimeStats = window.focusGSRuntimeStats || {
  fps: null,
};

function setStudioViewerBridge(nextState = {}) {
  studioViewerBridge.mode = nextState.mode || null;
  studioViewerBridge.viewer = nextState.viewer || null;
  studioViewerBridge.iframe = nextState.iframe || null;
}

function teardownStudioViewerBridge() {
  if (studioViewerBridge.mode === "embedded" && studioViewerBridge.iframe) {
    studioViewerBridge.iframe.src = "about:blank";
  }

  if (studioViewerBridge.mode === "local" && studioViewerBridge.viewer) {
    studioViewerBridge.viewer.stop?.();
    studioViewerBridge.viewer.dispose?.();
  }

  setStudioViewerBridge();
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getPageTypeFromLocation(search = window.location.search) {
  const params = new URLSearchParams(search);
  return params.get("scene") ? "workspace" : "home";
}

function makeWorkspaceUrl(sceneId) {
  return `/?scene=${sceneId}`;
}

function updatePageSwitchVisual(page) {
  document.querySelectorAll(".page-switch").forEach((switchRoot) => {
    switchRoot.dataset.active = page;
    switchRoot.classList.remove("is-sliding-left", "is-sliding-right");

    switchRoot.querySelectorAll(".page-switch__item").forEach((item) => {
      const isActive = item.dataset.page === page;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });
  });
}

function buildTransitionViewport() {
  const appRoot = document.getElementById("app");
  appRoot.innerHTML = `
    <div class="page-transition-root">
      <div class="page-transition-viewport" id="page-transition-viewport"></div>
    </div>
  `;
  return document.getElementById("page-transition-viewport");
}

function createPageLayer(page) {
  const layer = document.createElement("section");
  layer.className = `page-layer page-layer--${page}`;
  layer.dataset.page = page;
  return layer;
}

function applyPageLayerState(layer, stateClass) {
  layer.classList.remove(
    "page-layer--current",
    "page-layer--enter-from-right",
    "page-layer--enter-from-left",
    "page-layer--exit-to-left",
    "page-layer--exit-to-right",
    "page-layer--active",
  );
  layer.classList.add(stateClass);
}

async function mountWorkspaceViewer(scene, targetLayer) {
  const statusEl = targetLayer.querySelector("#status");
  const overlayEl = targetLayer.querySelector("#status-overlay");
  const viewerRoot = targetLayer.querySelector("#viewer");
  const embedUrl = scene.webViewer?.embedUrl;

  setStudioViewerBridge();

  if (embedUrl) {
    const iframe = loadEmbeddedViewer(viewerRoot, scene);
    setStudioViewerBridge({ mode: "embedded", iframe });
    if (statusEl) statusEl.style.display = "none";

    if (iframe) {
      iframe.addEventListener(
        "load",
        () => {
          if (overlayEl) overlayEl.style.display = "none";
        },
        { once: true },
      );
    }

    window.setTimeout(() => {
      if (overlayEl && overlayEl.style.display !== "none") {
        overlayEl.style.display = "none";
      }
    }, 4000);

    return;
  }

  const viewer = createViewer(viewerRoot);
  setStudioViewerBridge({ mode: "local", viewer });
  await loadSceneIntoViewer(viewer, scene);

  if (statusEl) statusEl.textContent = `Loaded ${scene.id}. Drag to inspect.`;
  if (overlayEl) overlayEl.style.display = "none";
}

async function mountPageContent(page, layer, scenes, selectedScene, history) {
  if (page === "home") {
    renderHomePage(scenes, layer, { deferSetup: true });
    return;
  }

  renderWorkspacePage(scenes, selectedScene, history, layer, { deferSetup: true });
}

async function activatePageContent(page, layer, scene) {
  if (page === "home") {
    activateHomePage(transitionState.scenes);
    return;
  }

  activateWorkspacePage(scene);
  await mountWorkspaceViewer(scene, layer);
}

async function renderInitialPage() {
  const selectedScene = getSceneFromQuery(transitionState.scenes);
  const currentPage = selectedScene ? "workspace" : "home";
  const viewport = buildTransitionViewport();
  const layer = createPageLayer(currentPage);
  viewport.appendChild(layer);

  const history = selectedScene ? await getHistoryByScene(selectedScene.id).catch(() => []) : [];
  await mountPageContent(currentPage, layer, transitionState.scenes, selectedScene, history);
  applyPageLayerState(layer, "page-layer--active");
  layer.setAttribute("aria-hidden", "false");

  transitionState.currentPage = currentPage;
  transitionState.currentScene = selectedScene;
  transitionState.currentHistory = history;

  setTimeout(async () => {
    await activatePageContent(currentPage, layer, selectedScene);
    updatePageSwitchVisual(currentPage);
  }, 0);
}

function animatePageSwitch(link, direction) {
  const switchRoot = link?.closest(".page-switch");
  if (!switchRoot) return;

  switchRoot.classList.remove("is-sliding-left", "is-sliding-right");
  void switchRoot.offsetWidth;
  switchRoot.classList.add(direction === "forward" ? "is-sliding-right" : "is-sliding-left");

  const nextPage = direction === "forward" ? "workspace" : "home";
  switchRoot.dataset.active = nextPage;
  switchRoot.querySelectorAll(".page-switch__item").forEach((item) => {
    const isActive = item.dataset.page === nextPage;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
  });
}

function getNavigationIntent(link) {
  const href = link?.getAttribute("href");
  if (!href) return null;

  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin) return null;

  const nextPage = getPageTypeFromLocation(url.search);
  const currentPage = transitionState.currentPage;

  if (currentPage === "home" && nextPage === "workspace") {
    const nextScene = getSceneFromQuery(transitionState.scenes, url.search) || transitionState.scenes[0] || null;
    return {
      page: "workspace",
      scene: nextScene,
      direction: "forward",
      url: makeWorkspaceUrl(nextScene?.id || "garden"),
    };
  }

  if (currentPage === "workspace" && nextPage === "home") {
    return {
      page: "home",
      scene: null,
      direction: "backward",
      url: "/",
    };
  }

  return null;
}

async function transitionTo(intent, { push = true } = {}) {
  if (!intent || transitionState.isTransitioning) return;

  const viewport = document.getElementById("page-transition-viewport");
  const currentLayer = viewport.querySelector(".page-layer--active");
  if (!viewport || !currentLayer) return;

  transitionState.isTransitioning = true;
  teardownStudioViewerBridge();

  const nextLayer = createPageLayer(intent.page);
  nextLayer.setAttribute("aria-hidden", "true");
  viewport.appendChild(nextLayer);

  const nextHistory =
    intent.page === "workspace" && intent.scene
      ? await getHistoryByScene(intent.scene.id).catch(() => [])
      : [];

  await mountPageContent(intent.page, nextLayer, transitionState.scenes, intent.scene, nextHistory);

  const forward = intent.direction === "forward";
  applyPageLayerState(currentLayer, forward ? "page-layer--current" : "page-layer--current");
  applyPageLayerState(nextLayer, forward ? "page-layer--enter-from-right" : "page-layer--enter-from-left");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      applyPageLayerState(currentLayer, forward ? "page-layer--exit-to-left" : "page-layer--exit-to-right");
      applyPageLayerState(nextLayer, "page-layer--active");
    });
  });

  if (push) {
    window.history.pushState({ page: intent.page, scene: intent.scene?.id || null }, "", intent.url);
  }

  window.setTimeout(async () => {
    currentLayer.remove();
    nextLayer.setAttribute("aria-hidden", "false");

    transitionState.currentPage = intent.page;
    transitionState.currentScene = intent.scene;
    transitionState.currentHistory = nextHistory;
    transitionState.isTransitioning = false;

    await activatePageContent(intent.page, nextLayer, intent.scene);
    updatePageSwitchVisual(intent.page);
  }, prefersReducedMotion() ? 40 : PAGE_SLIDE_DURATION);
}

function bindNavigation() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (link.target && link.target !== "_self") return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const intent = getNavigationIntent(link);
    if (!intent) return;

    event.preventDefault();
    animatePageSwitch(link, intent.direction);

    window.setTimeout(() => {
      transitionTo(intent, { push: true });
    }, prefersReducedMotion() ? 20 : 120);
  });

  window.addEventListener("popstate", async () => {
    if (transitionState.isTransitioning) return;

    const nextPage = getPageTypeFromLocation(window.location.search);
    const currentPage = transitionState.currentPage;
    if (nextPage === currentPage) return;

    if (nextPage === "home") {
      await transitionTo({ page: "home", scene: null, direction: "backward", url: "/" }, { push: false });
      return;
    }

    const nextScene = getSceneFromQuery(transitionState.scenes) || transitionState.scenes[0] || null;
    await transitionTo(
      {
        page: "workspace",
        scene: nextScene,
        direction: "forward",
        url: makeWorkspaceUrl(nextScene?.id || "garden"),
      },
      { push: false },
    );
  });
}

window.addEventListener("message", (event) => {
  if (event.data?.type === "focusgs:fps") {
    window.focusGSRuntimeStats.fps = Number.isFinite(event.data.fps) ? event.data.fps : null;
  }
});

window.focusGSStudioToggleFullscreen = async function () {
  const viewStage = document.getElementById("view-stage");
  if (!viewStage) return;

  if (document.fullscreenElement === viewStage) {
    await document.exitFullscreen?.();
    return;
  }

  await viewStage.requestFullscreen?.();
};

window.focusGSStudioResetView = function () {
  if (studioViewerBridge.mode === "embedded" && studioViewerBridge.iframe?.contentWindow) {
    studioViewerBridge.iframe.contentWindow.postMessage({ type: "focusgs:reset-view" }, "*");
    return;
  }

  if (studioViewerBridge.mode === "local" && studioViewerBridge.viewer) {
    const { viewer } = studioViewerBridge;
    if (viewer.camera && viewer.initialCameraPosition && viewer.initialCameraLookAt) {
      viewer.camera.position.copy(viewer.initialCameraPosition);
      viewer.camera.up.copy(viewer.cameraUp).normalize();
      viewer.camera.lookAt(viewer.initialCameraLookAt);
    }
    if (viewer.controls && viewer.initialCameraLookAt) {
      viewer.controls.target.copy(viewer.initialCameraLookAt);
      viewer.controls.update();
    }
    viewer.forceRenderNextFrame?.();
  }
};

async function bootstrap() {
  try {
    transitionState.scenes = await loadScenes();
    await renderInitialPage();
    bindNavigation();
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
