export async function loadSceneIntoViewer(viewer, scene) {
  await viewer.addSplatScene(scene.modelPath, {
    splatAlphaRemovalThreshold: 5,
    showLoadingUI: true,
    progressiveLoad: true,
  });

  viewer.start();
}
