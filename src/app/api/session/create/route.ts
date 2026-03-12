import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createSession, getPopupUrl } from '@/lib/browserless';
import { saveSession } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    const visitorId = nanoid(16);

    const { wsEndpoint, liveUrl, sessionId, stopUrl } = await createSession(
      'https://ava.escolaparque.g12.br'
    );

    const popupUrl = getPopupUrl(wsEndpoint) || liveUrl;

    await saveSession({
      visitorId,
      wsEndpoint,
      status: 'pending',
      createdAt: new Date().toISOString(),
      // campos extras — o tipo base aceita campos adicionais via index signature
      // se quiser tipagem estrita, adicione sessionId e stopUrl ao interface SessionData
    } as Parameters<typeof saveSession>[0]);

    return NextResponse.json({
      success: true,
      visitorId,
      popupUrl,
      liveUrl,
      sessionId,
      stopUrl,
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
