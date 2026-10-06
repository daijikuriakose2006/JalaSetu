'use client';

import { useEffect, useRef } from 'react';

export default function HeroBoatCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let step = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 360;
      canvas.height = 180;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      step += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const waterLevel = height * 0.65;

      // Draw gentle water waves
      ctx.fillStyle = '#3F7F83';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 10) {
        const y = waterLevel + Math.sin(x * 0.02 + step) * 8 + Math.cos(x * 0.01 + step * 0.5) * 4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Secondary translucent wave in front
      ctx.fillStyle = 'rgba(74, 149, 153, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 10) {
        const y = waterLevel + 6 + Math.sin(x * 0.025 + step * 1.2 + 2) * 6;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Boat position and gentle rocking
      const boatX = width * 0.5;
      const waveYAtBoat = waterLevel + Math.sin(boatX * 0.02 + step) * 8;
      const boatY = waveYAtBoat - 16;
      const boatAngle = Math.cos(boatX * 0.02 + step) * 0.08;

      ctx.save();
      ctx.translate(boatX, boatY);
      ctx.rotate(boatAngle);

      // Boat hull
      ctx.fillStyle = '#C0392B';
      ctx.beginPath();
      ctx.moveTo(-35, 0);
      ctx.lineTo(35, 0);
      ctx.lineTo(25, 16);
      ctx.lineTo(-25, 16);
      ctx.closePath();
      ctx.fill();

      // Cabin
      ctx.fillStyle = '#FFFBF4';
      ctx.fillRect(-15, -16, 25, 16);

      // Windows
      ctx.fillStyle = '#3F7F83';
      ctx.fillRect(-10, -12, 6, 6);
      ctx.fillRect(0, -12, 6, 6);

      // Cargo load (building blocks / sand)
      ctx.fillStyle = '#D4AC0D';
      ctx.beginPath();
      ctx.arc(-22, 0, 7, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(15, 0, 6, Math.PI, 0);
      ctx.fill();

      // Flag
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, -16);
      ctx.lineTo(8, -26);
      ctx.stroke();

      ctx.fillStyle = '#27AE60';
      ctx.beginPath();
      ctx.moveTo(8, -26);
      ctx.lineTo(18, -22);
      ctx.lineTo(8, -18);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto my-4 overflow-hidden rounded-2xl bg-surface/80 border border-default p-2">
      <canvas ref={canvasRef} className="w-full block" />
      <p className="text-[11px] text-center text-secondary mt-1 italic">
        🚢 Kerala Waterway Barge Simulation (Zero Road Congestion)
      </p>
    </div>
  );
}
