import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createDeviceTimeline } from "./device-timeline.mjs";

/** Procedural industrial-design study, not an electrical/CAD specification. */
export function createDeviceScene(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 60);
  camera.position.set(7, 5, 12);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8393b5, 3));
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(-4, 7, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x729aff, 3);
  rim.position.set(5, 2, -4);
  scene.add(rim);
  const root = new THREE.Group();
  scene.add(root);
  const cream = new THREE.MeshStandardMaterial({
    color: 0xe7ebef,
    roughness: 0.3,
    metalness: 0.24,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x172131,
    roughness: 0.4,
    metalness: 0.5,
  });
  const blue = new THREE.MeshStandardMaterial({
    color: 0x143dff,
    roughness: 0.3,
    metalness: 0.3,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xa6b3c4,
    roughness: 0.28,
    metalness: 0.8,
  });
  const pcb = new THREE.MeshStandardMaterial({
    color: 0x123f46,
    roughness: 0.65,
    metalness: 0.2,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xcfad6d,
    roughness: 0.32,
    metalness: 0.8,
  });
  function box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    r = 0.06,
  ) {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(r, d / 2, w / 2, h / 2)),
      mat,
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  const mount = new THREE.Group(),
    board = new THREE.Group(),
    sensor = new THREE.Group(),
    shell = new THREE.Group();
  root.add(mount, board, sensor, shell);
  box(mount, 1.72, 2.75, 0.27, 0, 0, -0.43, metal, 0.12);
  box(mount, 1.48, 2.48, 0.12, 0, 0, -0.23, dark);
  // Visible rails and mounting hardware, rather than a flat illustration.
  for (const y of [-0.85, 0.85]) {
    box(mount, 2.04, 0.19, 0.18, 0, y, -0.62, dark);
  }
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 6, 32),
    metal,
  );
  pole.position.set(0, 0, -1.05);
  mount.add(pole);
  const plug = new THREE.Group();
  mount.add(plug);
  plug.visible = false;
  box(plug, 1.05, 1.5, 0.2, 0, 0, -0.74, cream);
  for (const x of [-0.27, 0.27])
    box(plug, 0.1, 0.1, 0.5, x, -0.1, -1.05, metal, 0.02);
  box(board, 1.4, 2.28, 0.09, 0, 0, -0.08, pcb, 0.07);
  box(board, 0.66, 0.73, 0.11, 0, 0.28, 0.02, dark, 0.03);
  box(board, 0.6, 0.55, 0.06, 0, 0.3, 0.1, metal, 0.02);
  for (let i = 0; i < 8; i++) {
    for (const x of [-0.4, 0.4])
      box(board, 0.09, 0.035, 0.035, x, 0.02 + i * 0.08, 0.02, gold, 0.01);
  }
  for (let i = 0; i < 5; i++) {
    box(board, 0.22, 0.1, 0.08, -0.4, -0.85 + i * 0.15, 0.01, dark, 0.02);
    box(board, 0.1, 0.23, 0.08, 0.42, -0.7 + i * 0.23, 0.01, gold, 0.01);
  }
  box(sensor, 1.38, 2.25, 0.12, 0, 0, 0.16, cream, 0.1);
  const diaphragm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.09, 48),
    dark,
  );
  diaphragm.rotation.x = Math.PI / 2;
  diaphragm.position.set(0, 0.23, 0.27);
  sensor.add(diaphragm);
  for (const radius of [0.2, 0.31, 0.41]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 6, 48),
      metal,
    );
    ring.position.set(0, 0.23, 0.325);
    sensor.add(ring);
  }
  box(sensor, 0.43, 0.11, 0.04, 0, -0.68, 0.25, blue, 0.03);
  box(shell, 1.82, 2.88, 0.33, 0, 0, 0.45, cream, 0.16);
  // Sidewalls form a continuous cup; electronics are hidden when assembled.
  for (const x of [-0.84, 0.84])
    box(shell, 0.14, 2.64, 0.78, x, 0, 0.04, cream, 0.06);
  for (const y of [-1.31, 1.31])
    box(shell, 1.62, 0.16, 0.78, 0, y, 0.04, cream, 0.06);
  // Acoustic grille consists of actual recessed-looking geometry attached to shell.
  box(shell, 1.22, 1.23, 0.04, 0, 0.25, 0.625, dark, 0.02);
  for (let i = 0; i < 13; i++)
    box(shell, 1.27, 0.047, 0.06, 0, -0.3 + i * 0.092, 0.66, cream, 0.02);
  box(shell, 0.36, 0.05, 0.045, 0, -1.03, 0.63, blue, 0.02);
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 512;
  labelCanvas.height = 128;
  const ctx = labelCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = "#243047";
  ctx.font = "500 66px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("sonora", 256, 85);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.21),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  label.position.set(0, -0.75, 0.625);
  shell.add(label);
  // Subtle ground rings anchor scale without a resource-heavy shadow pipeline.
  for (const r of [2, 2.6, 3.2]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.006, 4, 80),
      new THREE.MeshBasicMaterial({
        color: 0xb5c5df,
        transparent: true,
        opacity: 0.5,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.55;
    scene.add(ring);
  }
  const timeline = createDeviceTimeline({ root, shell, sensor, board, mount });
  let visible = true,
    disposed = false;
  function render() {
    if (!disposed && visible && !document.hidden)
      renderer.render(scene, camera);
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const aspect = width / height;
    const half = aspect < 1 ? 4.5 : 3.75;
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) render();
  });
  observer.observe(host);
  const onVisibility = () => render();
  document.addEventListener("visibilitychange", onVisibility);
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    host.parentElement?.classList.remove("has-webgl");
  });
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    host.parentElement?.classList.add("has-webgl");
    render();
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    timeline.kill();
    observer.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m) => m.dispose());
      }
    });
    texture.dispose();
    renderer.dispose();
  }
  addEventListener(
    "pagehide",
    (e) => {
      if (!e.persisted) dispose();
    },
    { once: true },
  );
  resize();
  return {
    setProgress(p: number) {
      timeline.progress(Math.max(0, Math.min(1, p)));
      host.dataset.progress = p.toFixed(3);
      render();
    },
    setInstallation(mode: string) {
      pole.visible = mode === "pole";
      plug.visible = mode !== "pole";
      render();
    },
  };
}
