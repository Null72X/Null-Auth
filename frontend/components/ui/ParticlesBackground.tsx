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
}

export function ParticlesBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = [
      'rgba(239, 68, 68, 0.35)', // Red
      'rgba(239, 68, 68, 0.25)',
      'rgba(244, 244, 245, 0.15)', // White
      'rgba(168, 85, 247, 0.25)', // Purple accent
    ];

    const generated: Particle[] = Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      size: Math.floor(Math.random() * 4) + 2, // 2px to 5px
      x: Math.floor(Math.random() * 100),
      y: Math.floor(Math.random() * 100),
      duration: Math.floor(Math.random() * 10) + 6, // 6s to 16s
      delay: Math.floor(Math.random() * 5),
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    setParticles(generated);
  }, []);

  return (
    <div className="particles-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle animate-float-slow"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
