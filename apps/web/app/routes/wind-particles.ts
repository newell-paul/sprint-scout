export type WindField = { flowDegrees: number; speedMps: number };
type Particle = { x: number; y: number; age: number; life: number };

export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function particleCount(width: number, height: number): number {
  return Math.min(1600, Math.max(120, Math.round((width * height) / 2600)));
}

export function pixelsPerSecond(speedMps: number): number {
  return 30 + Math.min(speedMps, 40) * 10;
}

export function velocity(field: WindField): { vx: number; vy: number } {
  const radians = (field.flowDegrees * Math.PI) / 180;
  const speed = pixelsPerSecond(field.speedMps);
  return { vx: Math.sin(radians) * speed, vy: -Math.cos(radians) * speed };
}

export function startWindParticles(
  container: HTMLElement,
  field: WindField,
  options: { reducedMotion?: boolean; seed?: number } = {},
): () => void {
  const canvas = document.createElement("canvas");
  canvas.className = "wind-particle-field";
  canvas.dataset.testid = "wind-particle-field";
  canvas.dataset.flowDegrees = String(field.flowDegrees);
  canvas.dataset.speedMps = field.speedMps.toFixed(1);
  canvas.dataset.motion = options.reducedMotion ? "static" : "animated";
  canvas.setAttribute("aria-hidden", "true");
  container.append(canvas);
  const context = canvas.getContext("2d");
  if (!context) {
    canvas.remove();
    return () => {};
  }
  const random = seededRandom(options.seed ?? 7);
  const { vx, vy } = velocity(field);
  let width = 0,
    height = 0,
    ratio = 1,
    particles: Particle[] = [],
    frame = 0,
    last = 0;
  const radius = () => Math.min(width, height) * 0.8;
  const spawn = (p: Particle) => {
    const angle = random() * Math.PI * 2,
      distance = Math.sqrt(random()) * radius();
    p.x = width / 2 + Math.cos(angle) * distance;
    p.y = height / 2 + Math.sin(angle) * distance;
    p.age = 0;
    p.life = 2.5 + random() * 5;
  };
  const resize = () => {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const side = Math.min(width, height);
    particles = Array.from({ length: particleCount(side, side) }, () => {
      const p = { x: 0, y: 0, age: 0, life: 0 };
      spawn(p);
      p.age = random() * p.life;
      return p;
    });
    context.clearRect(0, 0, width, height);
    if (options.reducedMotion) drawStatic();
  };
  const step = (dt: number) => {
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = `rgba(0, 0, 0, ${1 - Math.pow(0.982, dt * 60)})`;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";
    context.lineCap = "round";
    context.beginPath();
    for (const p of particles) {
      const nx = p.x + vx * dt,
        ny = p.y + vy * dt;
      p.age += dt;
      const outside =
        Math.hypot(nx - width / 2, ny - height / 2) > radius() * 1.05;
      if (p.age > p.life || outside) {
        spawn(p);
        continue;
      }
      context.moveTo(p.x, p.y);
      context.lineTo(nx, ny);
      p.x = nx;
      p.y = ny;
    }
    context.lineWidth = 3.5;
    context.strokeStyle = "rgba(255, 255, 255, 0.3)";
    context.stroke();
    context.lineWidth = 1.8;
    context.strokeStyle = "rgba(255, 255, 255, 0.9)";
    context.stroke();
  };
  const drawStatic = () => {
    for (let i = 0; i < 80; i++) step(1 / 60);
  };
  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    step(dt);
    frame = requestAnimationFrame(tick);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  if (!options.reducedMotion) frame = requestAnimationFrame(tick);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    canvas.remove();
  };
}
