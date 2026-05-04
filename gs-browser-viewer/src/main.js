// src/main.js
import { loadScenes, getSceneFromQuery } from "./config/loadScenes.js";
import { renderHomePage, renderWorkspacePage } from "./ui/renderApp.js";
import { getHistoryByScene } from "./config/loadHistory.js";
import { createViewer } from "./viewer/createViewer.js";
import { loadSceneIntoViewer } from "./viewer/loadScene.js";
import { loadEmbeddedViewer } from "./viewer/loadEmbeddedViewer.js";

const PAGE_TRANSITION_DURATION = 980;
const PAGE_SWITCH_SLIDE_DURATION = 320;
const studioViewerBridge = {
  mode: null,
  viewer: null,
  iframe: null,
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

function ensureTransitionOverlay() {
  let overlay = document.querySelector(".page-transition");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.className = "page-transition";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="page-transition__veil"></div>
    <div class="page-transition__pulse"></div>
    <div class="page-transition__center">
      <span class="page-transition__logo-shell" aria-hidden="true">
        <img class="page-transition__logo page-transition__logo--light" src="/logo.png" alt="" />
        <img class="page-transition__logo page-transition__logo--dark" src="/logo-dark.png" alt="" />
      </span>
      <div class="page-transition__copy">
        <div class="page-transition__label">FocusGS</div>
        <div class="page-transition__subtitle">Memory-Efficient 3D Gaussian Splatting</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function playPageEnterTransition() {
  const overlay = ensureTransitionOverlay();
  overlay.classList.remove("is-active", "is-enter");
  void overlay.offsetWidth;
  overlay.classList.add("is-enter");

  window.setTimeout(() => {
    overlay.classList.remove("is-enter");
  }, prefersReducedMotion() ? 30 : PAGE_TRANSITION_DURATION);
}

function navigateWithTransition(url) {
  const overlay = ensureTransitionOverlay();
  overlay.classList.remove("is-enter", "is-active");
  void overlay.offsetWidth;
  overlay.classList.add("is-active");

  window.setTimeout(() => {
    window.location.href = url;
  }, prefersReducedMotion() ? 20 : PAGE_TRANSITION_DURATION - 140);
}

function animatePageSwitch(link) {
  const switchRoot = link?.closest(".page-switch");
  if (!switchRoot) return;

  const targetPage = link.dataset.page;
  const currentPage = switchRoot.dataset.active;
  if (!targetPage || targetPage === currentPage) return;

  switchRoot.classList.remove("is-sliding-left", "is-sliding-right");
  void switchRoot.offsetWidth;
  switchRoot.classList.add(targetPage === "workspace" ? "is-sliding-right" : "is-sliding-left");

  switchRoot.dataset.active = targetPage;
  switchRoot.querySelectorAll(".page-switch__item").forEach((item) => {
    const isActive = item.dataset.page === targetPage;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
  });
}

function setupPageTransitions() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (link.target && link.target !== "_self") return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const href = link.getAttribute("href");
    if (!href) return;

    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return;

    const isPageSwitch = link.classList.contains("page-switch__item");
    const currentHasScene = new URLSearchParams(window.location.search).has("scene");
    const nextHasScene = url.searchParams.has("scene");
    const isHomeWorkspaceToggle = currentHasScene !== nextHasScene;

    if (!isPageSwitch && !isHomeWorkspaceToggle) return;

    event.preventDefault();

    if (isPageSwitch) {
      animatePageSwitch(link);
      window.setTimeout(() => {
        navigateWithTransition(url.pathname + url.search + url.hash);
      }, prefersReducedMotion() ? 20 : PAGE_SWITCH_SLIDE_DURATION);
      return;
    }

    navigateWithTransition(url.pathname + url.search + url.hash);
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
    const scenes = await loadScenes();
    const selectedScene = getSceneFromQuery(scenes);

    if (!selectedScene) {
      renderHomePage(scenes);
      playPageEnterTransition();
      return;
    }

    const history = await getHistoryByScene(selectedScene.id).catch(() => []);
    renderWorkspacePage(scenes, selectedScene, history);

    const statusEl = document.getElementById("status");
    const overlayEl = document.getElementById("status-overlay");
    const viewerRoot = document.getElementById("viewer");
    const embedUrl = selectedScene.webViewer?.embedUrl;

    setStudioViewerBridge();

    if (embedUrl) {
      const iframe = loadEmbeddedViewer(viewerRoot, selectedScene);
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

      playPageEnterTransition();
      return;
    }

    const viewer = createViewer(viewerRoot);
    setStudioViewerBridge({ mode: "local", viewer });
    await loadSceneIntoViewer(viewer, selectedScene);

    if (statusEl) statusEl.textContent = `Loaded ${selectedScene.id}. Drag to inspect.`;
    if (overlayEl) overlayEl.style.display = "none";

    playPageEnterTransition();
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
setupPageTransitions();
