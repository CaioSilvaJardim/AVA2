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

    // Log detalhado para debug
    console.log('[session/create] wsEndpoint:', wsEndpoint);
    console.log('[session/create] liveUrl:', liveUrl);
    console.log('[session/create] liveUrl type:', typeof liveUrl);

    if (!liveUrl || typeof liveUrl !== 'string' || !liveUrl.startsWith('http')) {
      console.error('[session/create] liveUrl inválida:', liveUrl);
      return NextResponse.json(
        { success: false, error: `Browserless retornou liveUrl inválida: "${liveUrl}"` },
        { status: 500 }
      );
    }

    await saveSession({
      visitorId,
      wsEndpoint,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      visitorId,
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
