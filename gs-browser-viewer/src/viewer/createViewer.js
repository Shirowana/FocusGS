import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

export function createViewer(rootElement) {
  return new GaussianSplats3D.Viewer({
    rootElement,
    sharedMemoryForWorkers: false,
    gpuAcceleratedSort: false,
    integerBasedSort: false,
    enableSIMDInSort: false,
    selfDrivenMode: true,
    useBuiltInControls: true,
    cameraUp: [0, -1, -0.6],
    initialCameraPosition: [-1.5, -5.5, 7.5],
    initialCameraLookAt: [0, 1.5, 0],
    sphericalHarmonicsDegree: 2,
    sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant,
    renderMode: GaussianSplats3D.RenderMode.Always,
    logLevel: GaussianSplats3D.LogLevel.Info,
  });
}
