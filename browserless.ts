const BROWSERLESS_TOKEN = '2U8BthhqFtgqpGQ8770994c0a6bd723560f5f4a055187bd56';
const AVA_URL = 'https://ava.escolaparque.g12.br';

// Browserless v2 — região US West (SFO)
const BROWSERLESS_BASE = 'https://production-sfo.browserless.io';
const BROWSERLESS_WSS  = 'wss://production-sfo.browserless.io';

export interface BrowserSession {
  wsEndpoint: string;   // usado pelo puppeteer.connect()
  liveUrl: string;      // popup para o usuário interagir
  sessionId: string;
  stopUrl: string;      // DELETE para encerrar a sessão
}

/**
 * Cria uma sessão persistente no Browserless v2 via Sessions API.
 * Navega até targetUrl logo após a criação.
 */
export async function createSession(targetUrl: string = AVA_URL): Promise<BrowserSession> {
  // 1️⃣  Cria a sessão com TTL de 10 minutos
  const res = await fetch(
    `${BROWSERLESS_BASE}/session?token=${BROWSERLESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ttl: 600000,       // 10 min em ms
        stealth: true,
        headless: false,   // headful = menos detecção de bot
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Browserless /session falhou: ${res.status} ${res.statusText} — ${body}`
    );
  }

  const session = await res.json() as {
    id: string;
    connect: string;   // WebSocket URL para puppeteer
    stop: string;      // REST URL para encerrar
  };

  if (!session?.connect) {
    throw new Error(
      `Browserless retornou resposta inesperada: ${JSON.stringify(session)}`
    );
  }

  const wsEndpoint = session.connect.includes('?')
    ? session.connect
    : `${session.connect}?token=${BROWSERLESS_TOKEN}`;

  // 2️⃣  Navega até o AVA usando puppeteer para que o usuário já veja a tela certa
  try {
    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null,
    });
    const pages = await browser.pages();
    const page = pages[0] ?? (await browser.newPage());
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await browser.disconnect();
  } catch (err) {
    // Não fatal — o usuário pode navegar manualmente na live view
    console.warn('[Browserless] Falha ao navegar até AVA:', err);
  }

  // 3️⃣  Monta a live URL (DevTools viewer) para o popup do usuário
  const liveUrl = buildLiveUrl(session.id);

  return {
    wsEndpoint,
    liveUrl,
    sessionId: session.id,
    stopUrl: session.stop,
  };
}

/**
 * Constrói a URL do DevTools viewer para abrir como popup.
 * O usuário interage diretamente com o browser remoto por aqui.
 */
export function buildLiveUrl(sessionId: string): string {
  // Formato padrão do DevTools frontend remoto no Browserless v2
  return (
    `https://chrome-devtools-frontend.appspot.com/serve_internal_file/@7521078/inspector.html` +
    `?wss=production-sfo.browserless.io/devtools/page/${sessionId}?token=${BROWSERLESS_TOKEN}`
  );
}

/**
 * Retorna a URL de popup a partir do wsEndpoint salvo na sessão.
 * Extrai o sessionId e reconstrói a live URL.
 */
export function getPopupUrl(wsEndpoint: string): string {
  // wsEndpoint pode ter o formato:
  //   wss://production-sfo.browserless.io/devtools/browser/<id>?token=...
  // ou simplesmente:
  //   wss://production-sfo.browserless.io?token=...&sessionId=<id>

  const matchPage    = wsEndpoint.match(/\/devtools\/(?:browser|page)\/([^?/]+)/);
  const matchSession = wsEndpoint.match(/[?&]sessionId=([^&]+)/);
  const id = matchPage?.[1] ?? matchSession?.[1] ?? '';

  if (id) return buildLiveUrl(id);

  // Fallback: abre o DevTools do Browserless diretamente
  return `${BROWSERLESS_BASE}?token=${BROWSERLESS_TOKEN}`;
}

/**
 * Verifica se o usuário concluiu o login checando a URL atual da página.
 * Retorna true quando a página sair dos domínios de autenticação do Google
 * e estiver no domínio do AVA.
 */
export async function checkLoginStatus(wsEndpoint: string): Promise<{
  loggedIn: boolean;
  currentUrl: string;
}> {
  try {
    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null,
    });

    const pages = await browser.pages();
    const page  = pages[0];

    if (!page) {
      await browser.disconnect();
      return { loggedIn: false, currentUrl: '' };
    }

    const currentUrl = page.url();
    await browser.disconnect();

    const AUTH_DOMAINS = [
      'accounts.google.com',
      'myaccount.google.com',
      'login.microsoftonline.com',
      'sso.',
    ];

    const isOnAuth = AUTH_DOMAINS.some((d) => currentUrl.includes(d));
    const isOnAva  =
      currentUrl.includes('escolaparque') ||
      currentUrl.includes('ava.') ||
      currentUrl.includes('moodle');

    return {
      loggedIn: !isOnAuth && isOnAva,
      currentUrl,
    };
  } catch (err) {
    console.error('[Browserless] checkLoginStatus erro:', err);
    return { loggedIn: false, currentUrl: '' };
  }
}

/**
 * Encerra explicitamente a sessão no Browserless para liberar recursos.
 */
export async function stopSession(stopUrl: string): Promise<void> {
  try {
    await fetch(stopUrl, { method: 'DELETE' });
  } catch {
    // Ignora — TTL vai limpar automaticamente
  }
}
