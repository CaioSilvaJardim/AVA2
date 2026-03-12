'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import type { UserData, Course, Task, Announcement } from '@/types';

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

function getDaysUntil(dueDateStr: string): number | null {
  try {
    const ms = new Date(dueDateStr).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

const stagger = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  },
  item: {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0 },
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchData(id: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/data?visitorId=${id}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Dados não encontrados.');
        setLoading(false);
        return;
      }
      setUserData(json.data as UserData);
    } catch {
      setError('Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = localStorage.getItem('visitorId');
    if (!id) {
      router.replace('/');
      return;
    }
    fetchData(id);
  }, [router]);

  function handleSync() {
    const id = localStorage.getItem('visitorId');
    if (id) fetchData(id);
  }

  function handleLogout() {
    localStorage.removeItem('visitorId');
    localStorage.removeItem('popupUrl');
    router.push('/');
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-zinc-500 text-sm flex gap-2">
          <span className="cursor-blink glow-cyan">█</span>
          <span>Carregando dados...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-red-400 text-sm border border-red-900 px-4 py-3">
            &gt; ERRO: {error}
          </div>
          <Button onClick={() => router.push('/')} variant="ghost">
            [ VOLTAR ]
          </Button>
        </div>
      </main>
    );
  }

  const courses: Course[] = userData?.courses ?? [];
  const tasks: Task[] = userData?.tasks ?? [];
  const announcements: Announcement[] = userData?.announcements ?? [];

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-zinc-700 text-xs">SYS</span>
              <span className="text-zinc-700 text-xs">://</span>
              <span className="glow-cyan text-sm tracking-widest font-bold">AVA</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSync}
                className="font-mono text-xs border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:text-cyan-400 hover:border-cyan-800 transition-colors tracking-widest uppercase"
              >
                [ SYNC ]
              </button>
              <button
                onClick={handleLogout}
                className="font-mono text-xs border border-zinc-800 px-3 py-1.5 text-zinc-600 hover:text-red-400 hover:border-red-900 transition-colors tracking-widest uppercase"
              >
                [ SAIR ]
              </button>
            </div>
          </div>
          <div className="border-t-2 border-zinc-800 mt-3" />
        </motion.div>

        {/* User info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="glow-cyan">&gt;</span>
            <span className="text-zinc-300">
              Olá,{' '}
              <span className="glow-purple font-semibold">
                {userData?.name || 'Usuário'}
              </span>
            </span>
          </div>
          {userData?.scrapedAt && (
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <span>&gt;</span>
              <span>Última sync: {formatRelativeTime(userData.scrapedAt)}</span>
            </div>
          )}
        </motion.div>

        {/* ── DISCIPLINAS ── */}
        <section>
          <div className="section-header mb-2">Disciplinas</div>
          <div className="border-t border-zinc-800 mb-4" />

          {courses.length === 0 ? (
            <div className="text-zinc-700 text-sm">
              &gt; Nenhuma disciplina encontrada.
            </div>
          ) : (
            <motion.div
              variants={stagger.container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {courses.map((course) => (
                <motion.div
                  key={course.id}
                  variants={stagger.item}
                  className="border border-zinc-800 bg-[#0e0e16] p-4 hover:border-purple-900 transition-colors"
                >
                  <div className="text-sm text-zinc-200 font-medium mb-1 leading-snug">
                    {course.name}
                  </div>
                  {course.teacher && (
                    <div className="text-xs text-zinc-600">
                      Prof: {course.teacher}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* ── TAREFAS ── */}
        <section>
          <div className="section-header mb-2">Tarefas</div>
          <div className="border-t border-zinc-800 mb-4" />

          {tasks.length === 0 ? (
            <div className="text-zinc-700 text-sm">
              &gt; Nenhuma tarefa encontrada.
            </div>
          ) : (
            <motion.div
              variants={stagger.container}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {tasks.map((task) => {
                const daysLeft = task.dueDate ? getDaysUntil(task.dueDate) : null;
                return (
                  <motion.div
                    key={task.id}
                    variants={stagger.item}
                    className="flex items-center gap-3 border border-zinc-800 bg-[#0e0e16] px-4 py-3 hover:border-zinc-700 transition-colors"
                  >
                    <span className="text-zinc-700 text-xs shrink-0">&gt;</span>
                    <span className="text-sm text-zinc-300 flex-1 leading-snug">
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-zinc-600 shrink-0">
                        {task.dueDate}
                      </span>
                    )}
                    {task.urgent ? (
                      <span className="tag-urgent shrink-0">URGENTE</span>
                    ) : daysLeft !== null && daysLeft >= 0 ? (
                      <span className="tag-days shrink-0">{daysLeft}d</span>
                    ) : null}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </section>

        {/* ── AVISOS ── */}
        <section>
          <div className="section-header mb-2">Avisos</div>
          <div className="border-t border-zinc-800 mb-4" />

          {announcements.length === 0 ? (
            <div className="text-zinc-700 text-sm">
              &gt; Nenhum aviso encontrado.
            </div>
          ) : (
            <motion.div
              variants={stagger.container}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {announcements.map((ann) => (
                <motion.div
                  key={ann.id}
                  variants={stagger.item}
                  className="border border-zinc-800 bg-[#0e0e16] px-4 py-4"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="glow-cyan text-xs mt-0.5 shrink-0">&gt;</span>
                    <span className="text-sm text-zinc-200 font-medium leading-snug">
                      {ann.title}
                    </span>
                    {ann.date && (
                      <span className="ml-auto text-xs text-zinc-700 shrink-0">
                        {ann.date}
                      </span>
                    )}
                  </div>
                  {ann.content && (
                    <div className="text-xs text-zinc-500 leading-relaxed pl-4">
                      {ann.content}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Footer cursor */}
        <div className="pt-4 border-t border-zinc-900 flex items-center gap-2 text-zinc-700 text-xs">
          <span>&gt;</span>
          <span className="cursor-blink glow-cyan">_</span>
        </div>
      </div>
    </main>
  );
}
