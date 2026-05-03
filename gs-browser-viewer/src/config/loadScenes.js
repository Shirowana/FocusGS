export async function loadScenes() {
  const response = await fetch("/data/scenes.json");
  if (!response.ok) {
    throw new Error(`Failed to load scenes metadata: ${response.status}`);
  }

  const scenes = await response.json();
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("Scenes metadata is empty.");
  }

  return scenes;
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
