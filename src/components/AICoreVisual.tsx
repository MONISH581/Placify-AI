/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

// Canvas-based anti-gravity particle background
export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
    }> = [];

    // Create particles
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.5 + 0.5,
        speedY: -(Math.random() * 0.7 + 0.2), // Move upwards
        speedX: (Math.random() * 0.4 - 0.2),
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        width = canvas.width = entry.contentRect.width;
        height = canvas.height = entry.contentRect.height;
      }
    });
    resizeObserver.observe(canvas);

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach((p) => {
        // Move particle
        p.y += p.speedY;
        p.x += p.speedX;

        // Reset if goes off top
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0 || p.x > width) {
          p.speedX *= -1;
        }

        // Slight drift towards mouse when close
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          p.x += dx * 0.003;
          p.y += dy * 0.003;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${p.opacity})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-70" />;
}

// 3D Floating interactive Core component
export function AICoreVisual() {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for mouse position
  const rotateXVal = useMotionValue(0);
  const rotateYVal = useMotionValue(0);

  // Smooth spring transformations
  const rotateX = useSpring(rotateXVal, { damping: 20, stiffness: 150 });
  const rotateY = useSpring(rotateYVal, { damping: 20, stiffness: 150 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate normalized values between -0.5 and 0.5
    const x = (e.clientX - rect.left) / width - 0.5;
    const y = (e.clientY - rect.top) / height - 0.5;

    // Map to degrees of rotation
    rotateXVal.set(-y * 30); // Pitch
    rotateYVal.set(x * 30);  // Yaw
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateXVal.set(0);
    rotateYVal.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative w-80 h-80 flex items-center justify-center cursor-pointer select-none"
      style={{ perspective: 1000 }}
    >
      {/* Dynamic Aura background glowing spots */}
      <div className="absolute w-56 h-56 rounded-full bg-gradient-to-tr from-amber-500/20 to-cyan-500/15 blur-3xl ai-core-pulse pointer-events-none" />

      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="w-full h-full flex items-center justify-center"
      >
        <svg className="w-72 h-72 drop-shadow-[0_0_35px_rgba(223,186,115,0.3)]" viewBox="0 0 200 200" fill="none">
          {/* External Ring: Rotating clockwise */}
          <motion.circle
            cx="100"
            cy="100"
            r="85"
            stroke="url(#goldGrad)"
            strokeWidth="0.8"
            strokeDasharray="4 6 12 8"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
          />

          {/* Middle Ring: Rotating counter-clockwise */}
          <motion.circle
            cx="100"
            cy="100"
            r="65"
            stroke="url(#cyanGrad)"
            strokeWidth="1.2"
            strokeDasharray="20 10 5 15"
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
          />

          {/* Core Orbit Nodes */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
            style={{ originX: '100px', originY: '100px' }}
          >
            <circle cx="100" cy="35" r="3.5" fill="#dfba73" className="shadow-lg" />
            <line x1="100" y1="35" x2="100" y2="100" stroke="rgba(223, 186, 115, 0.15)" strokeWidth="0.5" />
            <circle cx="165" cy="100" r="2.5" fill="#0891b2" />
            <line x1="165" y1="100" x2="100" y2="100" stroke="rgba(8, 145, 178, 0.15)" strokeWidth="0.5" />
          </motion.g>

          {/* Internal core sphere with pulse */}
          <circle cx="100" cy="100" r="38" fill="url(#coreGlow)" />
          <motion.circle
            cx="100"
            cy="100"
            r="38"
            stroke="rgba(223, 186, 115, 0.4)"
            strokeWidth="1"
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          />

          {/* Center core light emitter */}
          <circle cx="100" cy="100" r="14" fill="#ffffff" />
          <circle cx="100" cy="100" r="14" fill="url(#goldGrad)" opacity="0.6" />

          {/* Definitions for gradients */}
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#dfba73" />
              <stop offset="100%" stopColor="#8a6f27" />
            </linearGradient>
            <linearGradient id="cyanGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#252014" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#0f172a" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#dfba73" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        {/* 3D floating text layer */}
        <motion.div
          style={{ transform: 'translateZ(25px)' }}
          className="absolute text-center"
        >
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#dfba73] font-mono select-none">PLACIFY AI</span>
          <p className="text-[9px] text-zinc-400 font-mono tracking-tight">{isHovered ? 'Active Core Mode' : 'Cursor responsive'}</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Count-up numbers visualizer
export function CountUp({ end, duration = 2 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = end / (duration * 60);
    const handle = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(handle);
        setCount(end);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);

    return () => clearInterval(handle);
  }, [end, duration]);

  return <span>{count}</span>;
}
