import React, { useEffect, useRef } from 'react';

export interface ConfettiTriggerDetail {
  originX?: number;
  originY?: number;
  reason?: 'task' | 'vp' | 'milestone';
}

const CONFETTI_EVENT_NAME = 'svh:trigger-confetti';

/**
 * Triggers a lightweight HTML5 Canvas confetti celebration burst when a user
 * completes a study task or earns VP Points.
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
  shape: 'rect' | 'circle';
}

const CONFETTI_COLORS = [
  '#d4af37', // SVH Gold
  '#38bdf8', // Sky Cyan
  '#a855f7', // Soft Purple
  '#34d399', // Emerald Mint
  '#f472b6', // Rose Pink
  '#fbbf24', // Warm Amber
];

export const ConfettiCelebration: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const rafIdRef = useRef<number | null>(null);

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

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize, { passive: true });

    const renderFrame = () => {
      const particles = particlesRef.current;
      const width = window.innerWidth || 360;
      const height = window.innerHeight || 640;
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.014;

        if (p.opacity <= 0 || p.y > height + 24) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
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

      syncCanvasSize();

      const count = 42;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
        const speed = 4.2 + Math.random() * 6.8;
        particlesRef.current.push({
          x: originX + (Math.random() - 0.5) * 28,
          y: originY + (Math.random() - 0.5) * 14,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          sizeW: 5 + Math.random() * 4.5,
          sizeH: 3.5 + Math.random() * 3.5,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.22,
          opacity: 0.95 + Math.random() * 0.05,
          gravity: 0.22 + Math.random() * 0.06,
          drag: 0.975,
          shape: i % 3 === 0 ? 'circle' : 'rect',
        });
      }

      if (rafIdRef.current === null) {
        rafIdRef.current = window.requestAnimationFrame(renderFrame);
      }
    };

    window.addEventListener(CONFETTI_EVENT_NAME, spawnBurst);

    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      window.removeEventListener(CONFETTI_EVENT_NAME, spawnBurst);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[1100] select-none"
    />
  );
});
