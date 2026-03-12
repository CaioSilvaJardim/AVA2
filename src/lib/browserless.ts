const BROWSERLESS_TOKEN = '2U8BthhqFtgqpGQ8770994c0a6bd723560f5f4a055187bd56';
const AVA_URL = 'https://ava.escolaparque.g12.br';

const BROWSERLESS_WSS = `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}&stealth=true`;

export interface BrowserSession {
  wsEndpoint: string;  // para reconectar via puppeteer.connect()
  liveUrl: string;     // URL para abrir como popup — gerada pelo Browserless.liveURL
}

/**
 * Fluxo correto baseado na documentação oficial de Hybrid Automation:
 * 1. Conecta ao Browserless via puppeteer
 * 2. Navega até o AVA
 * 3. Chama Browserless.liveURL via CDP → retorna uma URL real para o popup do usuário
 * 4. Chama Browserless.reconnect via CDP → mantém o browser vivo após disconnect
 * 5. Salva o wsEndpoint para reconectar no polling
 */
export async function createSession(targetUrl: string = AVA_URL): Promise<BrowserSession> {
  const puppeteer = await import('puppeteer-core');

  const browser = await puppeteer.connect({
    browserWSEndpoint: BROWSERLESS_WSS,
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());

  // Navega até o AVA
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.warn('[Browserless] Aviso ao navegar:', err);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cdp = await page.createCDPSession() as any;

  // Gera a liveURL — URL real do viewer interativo sem expor o token
  const { liveURL } = await cdp.send('Browserless.liveURL', {
    quality: 75,
    timeout: 600000,        // 10 minutos para o usuário fazer login
    showBrowserInterface: false,
  }) as { liveURL: string };

  // Mantém o browser vivo após o disconnect
  // Tenta do maior TTL para o menor (depende do plano)
  let wsEndpoint: string | null = null;

  for (const timeout of [300000, 60000, 30000, 10000]) {
    try {
      const result = await cdp.send('Browserless.reconnect', { timeout }) as {
        browserWSEndpoint: string | null;
        error: string | null;
      };

      if (!result.error && result.browserWSEndpoint) {
        wsEndpoint = result.browserWSEndpoint.includes('token=')
          ? result.browserWSEndpoint
          : `${result.browserWSEndpoint}?token=${BROWSERLESS_TOKEN}`;
        break;
      }
      console.warn(`[Browserless] reconnect timeout=${timeout} falhou:`, result.error);
    } catch (e) {
      console.warn(`[Browserless] reconnect timeout=${timeout} lançou:`, e);
    }
  }

  // Desconecta localmente — browser continua vivo no servidor
  await browser.disconnect();

  if (!wsEndpoint) {
    throw new Error(
      'Browserless.reconnect falhou em todos os timeouts. Verifique seu plano em browserless.io/account'
    );
  }

  return { wsEndpoint, liveUrl: liveURL };
}

/**
 * getPopupUrl — mantido por compatibilidade com session/create/route.ts
 * Nesta implementação o liveUrl já vem pronto do Browserless.liveURL,
 * mas caso seja necessário reconstruir a partir do wsEndpoint, retorna o liveUrl salvo.
 */
export function getPopupUrl(wsEndpoint: string): string {
  // O liveUrl correto é gerado em createSession() e salvo no Redis junto com a sessão.
  // Esta função é um fallback — retorna uma string vazia para o caller usar liveUrl.
  void wsEndpoint;
  return '';
}

/**
 * Reconecta ao browser e verifica se o usuário já completou o login no AVA.
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
    const page = pages[0];

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
    };
  } catch (err) {
    console.error('[Browserless] checkLoginStatus erro:', err);
    return { loggedIn: false, currentUrl: '' };
  }
}
