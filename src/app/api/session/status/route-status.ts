import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession, saveUserData } from '@/lib/redis';
import { checkLoginStatus } from '@/lib/browserless';
import { scrapeAcademicData } from '@/lib/scraper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const visitorId = searchParams.get('visitorId');

  if (!visitorId) {
    return NextResponse.json({ success: false, error: 'visitorId é obrigatório.' }, { status: 400 });
  }

  const session = await getSession(visitorId);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Sessão não encontrada.' }, { status: 404 });
  }

  if (session.status === 'complete' || session.status === 'error') {
    return NextResponse.json({ success: true, status: session.status });
  }

  if (session.status === 'extracting') {
    return NextResponse.json({ success: true, status: 'extracting' });
  }

  try {
    const { loggedIn, newWsEndpoint } = await checkLoginStatus(session.wsEndpoint);

    // Atualiza o wsEndpoint no Redis se foi renovado (reconnect chain)
    if (newWsEndpoint && newWsEndpoint !== session.wsEndpoint) {
      await updateSession(visitorId, { wsEndpoint: newWsEndpoint });
      console.log('[status] wsEndpoint renovado para:', newWsEndpoint);
    }

    if (!loggedIn) {
      return NextResponse.json({ success: true, status: 'pending' });
    }

    // Login detectado — inicia extração
    await updateSession(visitorId, { status: 'extracting' });

    const wsToUse = newWsEndpoint ?? session.wsEndpoint;

    scrapeAcademicData(wsToUse)
      .then(async (userData) => {
        await saveUserData(visitorId, userData);
        await updateSession(visitorId, { status: 'complete' });
      })
      .catch(async (err) => {
        console.error('[status] scrape error:', err);
        await updateSession(visitorId, { status: 'error', error: 'Falha ao extrair dados.' });
      });

    return NextResponse.json({ success: true, status: 'extracting' });
  } catch (error) {
    console.error('[session/status]', error);
    await updateSession(visitorId, { status: 'error', error: 'Erro ao verificar login.' });
    return NextResponse.json({ success: true, status: 'error' });
  }
}
