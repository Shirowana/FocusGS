function formatMetric(value) {
  return value == null ? "TBD" : String(value);
}

function buildSceneCards(scenes, activeSceneId) {
  return scenes
    .map(
      (scene) => `
        <a class="scene-card ${scene.id === activeSceneId ? "is-active" : ""}" href="/?scene=${scene.id}">
          <img src="${scene.thumbnail}" alt="${scene.name}" />
          <div class="scene-card__body">
            <strong>${scene.name}</strong>
            <span>${scene.dataset}</span>
          </div>
        </a>
      `,
    )
    .join("");
}

function buildTagList(tags = []) {
  return tags.map((tag) => `<span class="tag">${tag}</span>`).join("");
}

export function renderApp({ scenes, selectedScene }) {
  document.title = `${selectedScene.name} | GS Browser Viewer`;

  document.getElementById("app").innerHTML = `
    <div class="layout">
      <header class="topbar">
        <div>
          <p class="eyebrow">FocusGS Browser Viewer</p>
          <h1>${selectedScene.name}</h1>
        </div>
        <div class="topbar__meta">
          <span>${selectedScene.dataset}</span>
          <span>Iteration ${selectedScene.iteration}</span>
          <span>Scene ID: ${selectedScene.id}</span>
        </div>
      </header>
      <aside class="sidebar sidebar--left">
        <section class="panel">
          <h2>Scenes</h2>
          <div class="scene-grid">
            ${buildSceneCards(scenes, selectedScene.id)}
          </div>
        </section>
      </aside>
      <main class="viewer-shell">
        <div class="viewer-stage">
          <div class="viewer-status" id="status">Loading pretrained ${selectedScene.id} splats...</div>
          <div id="viewer"></div>
        </div>
      </main>
      <aside class="sidebar sidebar--right">
        <section class="panel">
          <h2>Scene Info</h2>
          <p>${selectedScene.description}</p>
          <div class="tag-row">${buildTagList(selectedScene.tags)}</div>
        </section>
        <section class="panel">
          <h2>Model</h2>
          <p><strong>Model path</strong></p>
          <code>${selectedScene.modelPath}</code>
          <p><strong>Controls</strong></p>
          <p>Left drag: orbit</p>
          <p>Right drag: pan</p>
          <p>Wheel: zoom</p>
        </section>
        <section class="panel">
          <h2>Metrics</h2>
          <p>PSNR: ${formatMetric(selectedScene.metrics?.psnr)}</p>
          <p>SSIM: ${formatMetric(selectedScene.metrics?.ssim)}</p>
          <p>LPIPS: ${formatMetric(selectedScene.metrics?.lpips)}</p>
        </section>
      </aside>
    </div>
  `;
}
