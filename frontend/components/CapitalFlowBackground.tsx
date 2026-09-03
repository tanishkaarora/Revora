'use client';

import React, { useEffect, useRef } from 'react';

export default function CapitalFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      paths = generatePaths();
    };

    window.addEventListener('resize', handleResize);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Define 4 smooth curved capital flow paths across the viewport
    const generatePaths = () => [
      {
        start: { x: 0, y: height * 0.22 },
        cp1: { x: width * 0.32, y: height * 0.12 },
        cp2: { x: width * 0.68, y: height * 0.38 },
        end: { x: width, y: height * 0.26 },
      },
      {
        start: { x: 0, y: height * 0.44 },
        cp1: { x: width * 0.28, y: height * 0.62 },
        cp2: { x: width * 0.72, y: height * 0.32 },
        end: { x: width, y: height * 0.52 },
      },
      {
        start: { x: 0, y: height * 0.68 },
        cp1: { x: width * 0.38, y: height * 0.48 },
        cp2: { x: width * 0.62, y: height * 0.82 },
        end: { x: width, y: height * 0.72 },
      },
      {
        start: { x: 0, y: height * 0.85 },
        cp1: { x: width * 0.45, y: height * 0.7 },
        cp2: { x: width * 0.78, y: height * 0.95 },
        end: { x: width, y: height * 0.88 },
      },
    ];

    let paths = generatePaths();

    // 20 moving particles flowing along curved financial paths
    const particles = Array.from({ length: 22 }, (_, i) => ({
      pathIndex: i % paths.length,
      t: (i / 22) + Math.random() * 0.04,
      speed: 0.0006 + Math.random() * 0.0005, // Smooth steady flow
      size: 1.8 + Math.random() * 1.4,
      opacity: 0.35 + Math.random() * 0.4,
    }));

    // Cubic Bezier helper
    const getBezierPoint = (
      p0: { x: number; y: number },
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      p3: { x: number; y: number },
      t: number
    ) => {
      const cX = 3 * (p1.x - p0.x);
      const bX = 3 * (p2.x - p1.x) - cX;
      const aX = p3.x - p0.x - cX - bX;

      const cY = 3 * (p1.y - p0.y);
      const bY = 3 * (p2.y - p1.y) - cY;
      const aY = p3.y - p0.y - cY - bY;

      const x = aX * Math.pow(t, 3) + bX * Math.pow(t, 2) + cX * t + p0.x;
      const y = aY * Math.pow(t, 3) + bY * Math.pow(t, 2) + cY * t + p0.y;

      return { x, y };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Check current theme
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const lineStroke = isLight ? 'rgba(15, 118, 110, 0.07)' : 'rgba(13, 148, 136, 0.08)';
      const jadeColor = isLight ? 'rgba(15, 118, 110, ' : 'rgba(45, 212, 191, ';
      const brassColor = isLight ? 'rgba(181, 154, 98, ' : 'rgba(212, 175, 55, ';
      const steelColor = isLight ? 'rgba(70, 106, 138, ' : 'rgba(147, 197, 253, ';

      // Draw subtle flow guide lines
      paths.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p.start.x, p.start.y);
        ctx.bezierCurveTo(p.cp1.x, p.cp1.y, p.cp2.x, p.cp2.y, p.end.x, p.end.y);
        ctx.strokeStyle = lineStroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      if (!prefersReducedMotion) {
        // Draw and update moving capital flow points
        particles.forEach((pt, idx) => {
          pt.t += pt.speed;
          if (pt.t > 1) pt.t = 0;

          const p = paths[pt.pathIndex];
          const pos = getBezierPoint(p.start, p.cp1, p.cp2, p.end, pt.t);

          // Select color: mostly jade, occasional brass & steel
          const colorBase = idx % 5 === 0 ? brassColor : idx % 3 === 0 ? steelColor : jadeColor;

          // Draw soft ambient outer glow for the money pulse
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pt.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `${colorBase}${pt.opacity * 0.25})`;
          ctx.fill();

          // Draw core particle
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pt.size, 0, Math.PI * 2);
          ctx.fillStyle = `${colorBase}${pt.opacity})`;
          ctx.fill();
        });

        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
      aria-hidden="true"
    />
  );
}
