'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'purple' | 'magenta' | 'none';
}

export function Card({ children, className = '', glowColor = 'none' }: CardProps) {
  const glowStyles = {
    cyan: { borderColor: '#00ffff33', boxShadow: '0 0 20px rgba(0,255,255,0.06)' },
    purple: { borderColor: '#bf5af233', boxShadow: '0 0 20px rgba(191,90,242,0.06)' },
    magenta: { borderColor: '#ff00ff33', boxShadow: '0 0 20px rgba(255,0,255,0.06)' },
    none: {},
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`border border-zinc-800 bg-[#0e0e16] p-5 ${className}`}
      style={glowStyles[glowColor]}
    >
      {children}
    </motion.div>
  );
}
