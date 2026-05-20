export function loadEmbeddedViewer(container, scene) {
  const embedUrl = scene?.webViewer?.embedUrl;
  if (!container || !embedUrl) return null;

  container.innerHTML = `
    <iframe
      class="embedded-viewer"
      src="${embedUrl}"
      title="${scene.name} web demo"
      loading="lazy"
      allow="autoplay; fullscreen; xr-spatial-tracking"
      referrerpolicy="no-referrer"
    ></iframe>
  `;

  return container.querySelector("iframe");
}
