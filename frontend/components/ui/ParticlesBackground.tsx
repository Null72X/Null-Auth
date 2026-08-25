'use client';

import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  color: string;
  glow: string;
  animationClass: string;
}

export function ParticlesBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colorPalette = [
      { color: 'rgba(239, 68, 68, 0.45)', glow: '0 0 12px rgba(239, 68, 68, 0.7)' },   // Bright Red
      { color: 'rgba(239, 68, 68, 0.30)', glow: '0 0 8px rgba(239, 68, 68, 0.5)' },
      { color: 'rgba(220, 38, 38, 0.40)', glow: '0 0 15px rgba(220, 38, 38, 0.6)' },
      { color: 'rgba(255, 255, 255, 0.20)', glow: '0 0 6px rgba(255, 255, 255, 0.4)' }, // White dust
      { color: 'rgba(168, 85, 247, 0.30)', glow: '0 0 12px rgba(168, 85, 247, 0.5)' }, // Purple accent
    ];

    const animations = ['animate-float-slow', 'animate-float-medium', 'animate-pulse-glow'];

    // Generate 50 particles for dense, stunning floating atmosphere
    const generated: Particle[] = Array.from({ length: 50 }).map((_, i) => {
      const palette = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      return {
        id: i,
        size: Math.floor(Math.random() * 5) + 2, // 2px to 7px
        x: Math.floor(Math.random() * 100),
        y: Math.floor(Math.random() * 100),
        duration: Math.floor(Math.random() * 12) + 5, // 5s to 17s
        delay: Math.floor(Math.random() * 8),
        color: palette.color,
        glow: palette.glow,
        animationClass: animations[Math.floor(Math.random() * animations.length)],
      };
    });

    setParticles(generated);
  }, []);

  return (
    <div className="particles-container fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-1/4 left-1/6 w-[450px] h-[450px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/6 w-[550px] h-[550px] bg-red-950/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* 50 Floating Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full ${p.animationClass}`}
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            boxShadow: p.glow,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
