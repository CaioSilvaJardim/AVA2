'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/Button';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConnect() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/session/create', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Erro ao criar sessão.');
        setLoading(false);
        return;
      }

      localStorage.setItem('visitorId', data.visitorId);
      localStorage.setItem('popupUrl', data.popupUrl);

      router.push('/connect');
    } catch {
      setError('Falha na conexão com o servidor.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Border box */}
        <div className="border border-zinc-800" style={{ boxShadow: '0 0 40px rgba(191,90,242,0.04)' }}>
          {/* Top bar */}
          <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-2">
            <span className="text-zinc-700 text-xs">SYS</span>
            <span className="text-zinc-700 text-xs">://</span>
            <span className="glow-cyan text-xs tracking-widest">AVA</span>
            <div className="ml-auto flex gap-1.5">
              <div className="w-2 h-2 bg-zinc-800" />
              <div className="w-2 h-2 bg-zinc-800" />
              <div className="w-2 h-2 bg-zinc-800" />
            </div>
          </div>

          <div className="px-8 py-12 space-y-10">
            {/* Title */}
            <div className="space-y-2">
              <motion.h1
                className="text-3xl font-bold tracking-tight glow-cyan glow-title"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                SYSTEM://AVA
              </motion.h1>
              <motion.div
                className="text-zinc-600 text-xs tracking-widest uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                Interface Acadêmica Alternativa v2.0
              </motion.div>
            </div>

            {/* Status lines */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="glow-cyan">&gt;</span>
                <span>Interface acadêmica alternativa</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="glow-cyan">&gt;</span>
                <span>Conexão segura via navegador remoto</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="glow-cyan">&gt;</span>
                <span>Dados criptografados em trânsito</span>
              </div>
            </motion.div>

            {/* Separator */}
            <div className="border-t border-zinc-800" />

            {/* CTA */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                onClick={handleConnect}
                loading={loading}
                className="w-full justify-center text-center"
                variant="primary"
              >
                [ INICIAR CONEXÃO ]
              </Button>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-xs border border-red-900 px-3 py-2"
                >
                  &gt; ERRO: {error}
                </motion.div>
              )}
            </motion.div>

            {/* Footer line */}
            <motion.div
              className="flex items-center gap-2 text-zinc-700 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <span>&gt;</span>
              <span>Dados criptografados</span>
              <span className="ml-auto cursor-blink glow-cyan">_</span>
            </motion.div>
          </div>
        </div>

        {/* Version tag */}
        <div className="mt-4 text-center text-zinc-800 text-xs tracking-widest">
          AVA PORTAL // SYSTEM INTERFACE // {new Date().getFullYear()}
        </div>
      </motion.div>
    </main>
  );
}
