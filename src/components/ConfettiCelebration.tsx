import React, { useEffect, useRef } from 'react';

export interface ConfettiTriggerDetail {
  originX?: number;
  originY?: number;
  reason?: 'task' | 'vp' | 'milestone' | 'timer' | 'test';
}

const CONFETTI_EVENT_NAME = 'svh:trigger-confetti';
const CELEBRATION_MAX_DURATION_MS = 3000;

/**
 * Triggers a lightweight HTML5 Canvas particle confetti and golden star celebration burst
 * whenever a user completes a study goal, finishes a timer, or submits a test.
 * Automatically cleans up all particles and stops the animation loop within 3 seconds.
 */
export function triggerConfettiCelebration(detail?: ConfettiTriggerDetail): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    window.dispatchEvent(new CustomEvent<ConfettiTriggerDetail>(CONFETTI_EVENT_NAME, { detail }));
  } catch {
    // ignore dispatch errors
  }
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sizeW: number;
  sizeH: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  gravity: number;
  drag: number;
  shape: 'rect' | 'circle' | 'star';
  spawnedAt: number;
}

const CONFETTI_COLORS = [
  '#d4af37', // SVH Royal Gold
  '#fbbf24', // Golden Star Amber
  '#fde08d', // Luminous Champagne Gold
  '#f472b6', // Sweet Rose Pink
  '#34d399', // Emerald Mint
  '#38bdf8', // Sky Cyan
  '#a855f7', // Soft Purple
];

function drawFivePointStar(ctx: CanvasRenderingContext2D, radius: number): void {
  const spikes = 5;
  const outerRadius = radius;
  const innerRadius = radius * 0.44;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(0, -outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(0, -outerRadius);
  ctx.closePath();
  ctx.fill();
}

export const ConfettiCelebration: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncCanvasSize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth || 360;
      const height = window.innerHeight || 640;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const forceMemoryCleanup = () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      particlesRef.current.length = 0;
      const width = window.innerWidth || 360;
      const height = window.innerHeight || 640;
      ctx.clearRect(0, 0, width, height);
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize, { passive: true });

    const renderFrame = (now: number) => {
      const particles = particlesRef.current;
      const width = window.innerWidth || 360;
      const height = window.innerHeight || 640;
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const ageMs = now - p.spawnedAt;

        if (ageMs >= CELEBRATION_MAX_DURATION_MS) {
          particles.splice(i, 1);
          continue;
        }

        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Smooth fade out before the 3-second cutoff
        const lifeRatio = ageMs / CELEBRATION_MAX_DURATION_MS;
        p.opacity = lifeRatio > 0.65 ? Math.max(0, 1 - (lifeRatio - 0.65) / 0.35) : p.opacity - 0.008;

        if (p.opacity <= 0 || p.y > height + 24) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'star') {
          drawFivePointStar(ctx, p.sizeW * 0.85);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.sizeW * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.sizeW * 0.5, -p.sizeH * 0.5, p.sizeW, p.sizeH);
        }
        ctx.restore();
      }

      if (particles.length > 0) {
        rafIdRef.current = window.requestAnimationFrame(renderFrame);
      } else {
        rafIdRef.current = null;
        ctx.clearRect(0, 0, width, height);
      }
    };

    const spawnBurst = (e: Event) => {
      const customEvent = e as CustomEvent<ConfettiTriggerDetail>;
      const width = window.innerWidth || 360;
      const height = window.innerHeight || 640;
      const originX = customEvent.detail?.originX ?? width * 0.5;
      const originY = customEvent.detail?.originY ?? Math.min(height * 0.34, 240);
      const now = performance.now();

      syncCanvasSize();

      // Cap active particles for 90Hz-144Hz performance
      if (particlesRef.current.length > 60) {
        particlesRef.current.splice(0, particlesRef.current.length - 30);
      }

      const count = 44;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.05;
        const speed = 4.4 + Math.random() * 7.2;
        const isGoldenStar = i % 3 === 0;
        const shape: ConfettiParticle['shape'] = isGoldenStar
          ? 'star'
          : i % 3 === 1
          ? 'rect'
          : 'circle';

        particlesRef.current.push({
          x: originX + (Math.random() - 0.5) * 32,
          y: originY + (Math.random() - 0.5) * 16,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.6,
          sizeW: isGoldenStar ? 7 + Math.random() * 4.5 : 5 + Math.random() * 4.5,
          sizeH: 3.5 + Math.random() * 3.5,
          color: isGoldenStar
            ? CONFETTI_COLORS[i % 3] // Golden star palette (#d4af37, #fbbf24, #fde08d)
            : CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          opacity: 0.96 + Math.random() * 0.04,
          gravity: 0.21 + Math.random() * 0.06,
          drag: 0.976,
          shape,
          spawnedAt: now,
        });
      }

      if (cleanupTimerRef.current !== null) {
        clearTimeout(cleanupTimerRef.current);
      }
      // Guarantee memory & canvas cleanup at 3,000ms (3 seconds)
      cleanupTimerRef.current = setTimeout(() => {
        cleanupTimerRef.current = null;
        forceMemoryCleanup();
      }, CELEBRATION_MAX_DURATION_MS);

      if (rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(renderFrame);
      }
    };

    window.addEventListener(CONFETTI_EVENT_NAME, spawnBurst);

    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      window.removeEventListener(CONFETTI_EVENT_NAME, spawnBurst);
      if (cleanupTimerRef.current !== null) {
        clearTimeout(cleanupTimerRef.current);
      }
      forceMemoryCleanup();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[1100] select-none svh-confetti-canvas"
    />
  );
});
