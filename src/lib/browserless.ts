const BROWSERLESS_TOKEN = '2U8BthhqFtgqpGQ8770994c0a6bd723560f5f4a055187bd56';
const AVA_URL = 'https://ava.escolaparque.g12.br';

const BROWSERLESS_WSS = `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}&stealth=true`;

export interface BrowserSession {
  wsEndpoint: string;
  liveUrl: string;
}

/**
 * Estratégia para plano Free (max reconnect TTL = 10s):
 *
 * 1. Conecta ao Browserless
 * 2. Navega até o AVA
 * 3. Gera liveUrl via Browserless.liveURL (com timeout longo para o usuário interagir)
 * 4. Faz reconnect com 10s (máximo do plano free) — apenas para salvar o wsEndpoint
 * 5. O polling em /api/session/status reconecta a cada chamada dentro dos 10s
 *    e renova o reconnect, mantendo o browser vivo em "chain"
 */
export async function createSession(targetUrl: string = AVA_URL): Promise<BrowserSession> {
  const puppeteer = await import('puppeteer-core');

  const browser = await puppeteer.connect({
    browserWSEndpoint: BROWSERLESS_WSS,
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.warn('[Browserless] Aviso ao navegar:', err);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cdp = await page.createCDPSession() as any;

  // Gera liveUrl com timeout longo — o usuário tem esse tempo para interagir
  const { liveURL } = await cdp.send('Browserless.liveURL', {
    quality: 75,
    timeout: 300000, // 5 minutos para o usuário fazer login
    showBrowserInterface: false,
  }) as { liveURL: string };

  console.log('[Browserless] liveURL gerado:', liveURL);

  // Reconnect com 10s (limite do plano free)
  // O polling em /status vai renovar isso a cada 3s antes de expirar
  const result = await cdp.send('Browserless.reconnect', { timeout: 10000 }) as {
    browserWSEndpoint: string | null;
    error: string | null;
  };

  await browser.disconnect();

  if (result.error || !result.browserWSEndpoint) {
    throw new Error(`Browserless.reconnect falhou: ${result.error}`);
  }

  const wsEndpoint = result.browserWSEndpoint.includes('token=')
    ? result.browserWSEndpoint
    : `${result.browserWSEndpoint}?token=${BROWSERLESS_TOKEN}`;

  console.log('[Browserless] wsEndpoint:', wsEndpoint);

  return { wsEndpoint, liveUrl: liveURL };
}

/**
 * Reconecta, verifica URL atual, e renova o reconnect por mais 10s.
 * Isso mantém o browser vivo em "chain" enquanto o polling acontece a cada 3s.
 */
export async function checkLoginStatus(wsEndpoint: string): Promise<{
  loggedIn: boolean;
  currentUrl: string;
  newWsEndpoint?: string;
}> {
  try {
    const puppeteer = await import('puppeteer-core');

    const browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null,
    });

    const pages = await browser.pages();
    const page = pages[0];

    if (!page) {
      await browser.disconnect();
      return { loggedIn: false, currentUrl: '' };
    }

    const currentUrl = page.url();
    console.log('[Browserless] currentUrl:', currentUrl);

    // Renova o reconnect por mais 10s para manter o browser vivo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cdp = await page.createCDPSession() as any;
    let newWsEndpoint: string | undefined;

    try {
      const reconnect = await cdp.send('Browserless.reconnect', { timeout: 10000 }) as {
        browserWSEndpoint: string | null;
        error: string | null;
      };

      if (!reconnect.error && reconnect.browserWSEndpoint) {
        newWsEndpoint = reconnect.browserWSEndpoint.includes('token=')
          ? reconnect.browserWSEndpoint
          : `${reconnect.browserWSEndpoint}?token=${BROWSERLESS_TOKEN}`;
      }
    } catch (e) {
      console.warn('[Browserless] Falha ao renovar reconnect:', e);
    }

    await browser.disconnect();

    const AUTH_DOMAINS = [
      'accounts.google.com',
      'myaccount.google.com',
      'login.microsoftonline.com',
      'sso.',
      'about:blank',
      'about:newtab',
    ];

    const isOnAuth = AUTH_DOMAINS.some((d) => currentUrl.includes(d));
    const isOnAva =
      currentUrl.includes('escolaparque') ||
      currentUrl.includes('ava.') ||
      currentUrl.includes('moodle');

    return {
      loggedIn: !isOnAuth && isOnAva,
      currentUrl,
      newWsEndpoint,
    };
  } catch (err) {
    console.error('[Browserless] checkLoginStatus erro:', err);
    return { loggedIn: false, currentUrl: '' };
  }
}

export function getPopupUrl(_wsEndpoint: string): string {
  return '';
}
