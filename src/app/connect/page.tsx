'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusIndicator } from '@/components/StatusIndicator';
import Link from 'next/link';

type Status = 'pending' | 'extracting' | 'complete' | 'error';

export default function ConnectPage() {
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = useState<Status>('pending');
  const [error, setError] = useState('');
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [popupUrl, setPopupUrl] = useState<string | null>(null);
  const [popupOpened, setPopupOpened] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('visitorId');
    const url = localStorage.getItem('popupUrl');

    if (!id) {
      router.replace('/');
      return;
    }

    setVisitorId(id);
    setPopupUrl(url);
  }, [router]);

  // Polling
  useEffect(() => {
    if (!visitorId) return;
    if (sessionStatus === 'complete' || sessionStatus === 'error') return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/session/status?visitorId=${visitorId}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Erro ao verificar status.');
          setSessionStatus('error');
          return;
        }

        setSessionStatus(data.status as Status);

        if (data.status === 'complete') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setTimeout(() => router.push('/dashboard'), 1200);
        }

        if (data.status === 'error') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setError('Falha ao extrair dados do AVA.');
        }
      } catch {
        // silently ignore transient errors
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [visitorId, sessionStatus, router]);

  function openPopup() {
    if (!popupUrl) return;
    const w = 1100;
    const h = 750;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      popupUrl,
      'ava_login',
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    setPopupOpened(true);
  }

  const step1Status =
    sessionStatus === 'pending' || sessionStatus === 'extracting' || sessionStatus === 'complete'
      ? 'done'
      : 'idle';

  const step2Status =
    sessionStatus === 'pending' && popupOpened
      ? 'active'
      : sessionStatus === 'extracting' || sessionStatus === 'complete'
      ? 'done'
      : 'idle';

  const step3Status =
    sessionStatus === 'extracting'
      ? 'active'
      : sessionStatus === 'complete'
      ? 'done'
      : 'idle';

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg space-y-6"
      >
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="glow-cyan text-sm">&gt;</span>
            <h1 className="text-lg font-bold tracking-widest text-zinc-200 uppercase">
              Estabelecendo Conexão
            </h1>
          </div>
          <div className="border-t-2 border-zinc-700 mt-3" />
        </div>

        {/* Status card */}
        <Card>
          <div className="section-header mb-3">Status</div>
          <div className="border-t border-zinc-800 mb-2" />
          <StatusIndicator status={step1Status} label="Sessão iniciada" />
          <StatusIndicator status={step2Status} label="Aguardando login" />
          <StatusIndicator status={step3Status} label="Extraindo dados" />

          {sessionStatus === 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 border-t border-zinc-800 pt-3 glow-cyan text-sm"
            >
              &gt; Extração concluída. Redirecionando...
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 border-t border-zinc-800 pt-3 text-red-400 text-sm"
            >
              &gt; ERRO: {error}
            </motion.div>
          )}
        </Card>

        {/* Button */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={openPopup}
            variant="secondary"
            disabled={
              !popupUrl ||
              sessionStatus === 'extracting' ||
              sessionStatus === 'complete'
            }
            className="w-full justify-center"
          >
            [ ABRIR LOGIN ]
          </Button>

          {popupOpened && sessionStatus === 'pending' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-zinc-600 text-xs text-center"
            >
              Aguardando autenticação
              <span className="cursor-blink ml-1 glow-cyan">_</span>
            </motion.div>
          )}
        </div>

        {/* Instructions */}
        <Card>
          <div className="section-header mb-3">Instruções</div>
          <div className="border-t border-zinc-800 mb-3" />
          <div className="space-y-2 text-zinc-500 text-sm">
            <div className="flex gap-3">
              <span className="text-zinc-700 min-w-[24px]">01.</span>
              <span>Clique em <span className="text-zinc-300">[ ABRIR LOGIN ]</span></span>
            </div>
            <div className="flex gap-3">
              <span className="text-zinc-700 min-w-[24px]">02.</span>
              <span>Faça login com sua conta Google no popup</span>
            </div>
            <div className="flex gap-3">
              <span className="text-zinc-700 min-w-[24px]">03.</span>
              <span>Aguarde a extração automática dos dados</span>
            </div>
            <div className="flex gap-3">
              <span className="text-zinc-700 min-w-[24px]">04.</span>
              <span>Você será redirecionado automaticamente</span>
            </div>
          </div>
        </Card>

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
        >
          <span>&lt;</span>
          <span>voltar</span>
        </Link>
      </motion.div>
    </main>
  );
}
