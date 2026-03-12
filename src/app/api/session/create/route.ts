import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createSession, getPopupUrl } from '@/lib/browserless';
import { saveSession } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    const visitorId = nanoid(16);

    const { wsEndpoint, liveUrl } = await createSession('https://ava.escolaparque.g12.br');
    const popupUrl = getPopupUrl(wsEndpoint);

    await saveSession({
      visitorId,
      wsEndpoint,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      visitorId,
      popupUrl,
      liveUrl,
    });
  } catch (error) {
    console.error('[session/create]', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao criar sessão remota.' },
      { status: 500 }
    );
  }
}
