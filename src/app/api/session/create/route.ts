import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createSession } from '@/lib/browserless';
import { saveSession } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    const visitorId = nanoid(16);

    const { wsEndpoint, liveUrl } = await createSession(
      'https://ava.escolaparque.g12.br'
    );

    await saveSession({
      visitorId,
      wsEndpoint,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      visitorId,
      // liveUrl gerado pelo Browserless.liveURL — URL real e funcional do viewer
      popupUrl: liveUrl,
      liveUrl,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[session/create] ERRO:', msg);
    return NextResponse.json(
      { success: false, error: `Falha ao criar sessão remota: ${msg}` },
      { status: 500 }
    );
  }
}
