const COMPRESSED_WEB_SPLAT_BASE = "/web-splat/index.html";
const COMPRESSED_SCENE_IDS = new Set([
  "bicycle",
  "bonsai",
  "counter",
  "flowers",
  "garden",
  "kitchen",
  "room",
  "stump",
  "treehill",
]);

function buildCompressedWebViewer(sceneId) {
  const remoteFile = `https://web-splat.niedermayr.dev/scenes/${sceneId}/point_cloud/iteration_35000/point_cloud.npz`;
  const remoteScene = `https://web-splat.niedermayr.dev/scenes/${sceneId}/cameras.json`;
  return {
    provider: "web-splat",
    embedUrl: `${COMPRESSED_WEB_SPLAT_BASE}?file=${encodeURIComponent(remoteFile)}&scene=${encodeURIComponent(remoteScene)}`,
    label: "Local WebGPU compressed demo",
  };
}

function augmentScene(scene) {
  if (!scene || typeof scene !== "object") return scene;

  if (COMPRESSED_SCENE_IDS.has(scene.id)) {
    return {
      ...scene,
      webViewer: buildCompressedWebViewer(scene.id),
    };
  }

  return scene;
}

export async function loadScenes() {
  const response = await fetch("/data/scenes.json");
  if (!response.ok) {
    throw new Error(`Failed to load scenes metadata: ${response.status}`);
  }

  const scenes = await response.json();
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("Scenes metadata is empty.");
  }

  return scenes.map(augmentScene);
}

export function getSceneFromQuery(scenes, search = window.location.search) {
  const params = new URLSearchParams(search);
  const sceneParam = params.get("scene");
  if (!sceneParam) {
    return null; // 没有指定场景时，返回 null 从而由 main.js 引导渲染主页
  }
  const requestedId = sceneParam.toLowerCase();
  const selectedScene = scenes.find((scene) => scene.id === requestedId);
  return selectedScene || null;
}
