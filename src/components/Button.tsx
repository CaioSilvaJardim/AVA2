'use client';

import { motion } from 'framer-motion';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'font-mono text-sm uppercase tracking-widest px-6 py-3 transition-all duration-150 select-none outline-none border';

  const variants = {
    primary:
      'border-purple-400 text-purple-300 bg-transparent hover:bg-purple-900/20 hover:text-purple-100 disabled:opacity-30 disabled:cursor-not-allowed',
    secondary:
      'border-cyan-400 text-cyan-300 bg-transparent hover:bg-cyan-900/20 hover:text-cyan-100 disabled:opacity-30 disabled:cursor-not-allowed',
    danger:
      'border-red-500 text-red-400 bg-transparent hover:bg-red-900/20 hover:text-red-200 disabled:opacity-30 disabled:cursor-not-allowed',
    ghost:
      'border-zinc-700 text-zinc-400 bg-transparent hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed',
  };

  const glowMap = {
    primary: '0 0 12px rgba(191,90,242,0.4)',
    secondary: '0 0 12px rgba(0,255,255,0.3)',
    danger: '0 0 12px rgba(239,68,68,0.3)',
    ghost: 'none',
  };

  return (
    <motion.button
      whileHover={{ boxShadow: glowMap[variant] }}
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...(props as object)}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-blink">█</span>
          <span>Processando...</span>
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
