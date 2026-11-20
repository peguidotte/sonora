import { gsap } from "gsap";
export function createDeviceTimeline({ root, shell, sensor, board, mount }) {
  const timeline = gsap.timeline({
    paused: true,
    defaults: { ease: "power2.inOut" },
  });
  // Every transform is continuous and deterministic. Seeking backwards restores identical poses.
  timeline
    .to(root.rotation, { y: -0.2, duration: 0.15 }, 0)
    .to(shell.position, { z: 2.45, x: 0.25, duration: 0.28 }, 0.12)
    .to(shell.rotation, { y: 0.18, duration: 0.28 }, 0.12)
    .to(sensor.position, { z: 0.9, x: 0.1, duration: 0.25 }, 0.28)
    .to(board.position, { z: -0.45, x: -0.18, duration: 0.25 }, 0.35)
    .to(mount.position, { z: -1.05, x: -0.35, duration: 0.25 }, 0.35)
    .to(root.rotation, { y: -0.6, x: 0.12, duration: 0.43 }, 0.2)
    .to(shell.position, { z: 0, x: 0, duration: 0.26 }, 0.72)
    .to(shell.rotation, { y: 0, duration: 0.26 }, 0.72)
    .to(sensor.position, { z: 0, x: 0, duration: 0.25 }, 0.7)
    .to(board.position, { z: 0, x: 0, duration: 0.22 }, 0.68)
    .to(mount.position, { z: 0, x: 0, duration: 0.22 }, 0.68)
    .to(root.rotation, { x: 0, y: 0, duration: 0.3 }, 0.7);
  return timeline;
}
