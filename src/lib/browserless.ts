const BROWSERLESS_TOKEN = '2U8BthhqFtgqpGQ8770994c0a6bd723560f5f4a055187bd56';
const AVA_URL = 'https://ava.escolaparque.g12.br';

// BaaS v2 — conecta direto via WebSocket com stealth ativado
const BROWSERLESS_WSS = `wss://production-sfo.browserless.io?token=${BROWSERLESS_TOKEN}&stealth=true`;

export interface BrowserSession {
  wsEndpoint: string;  // endpoint para reconectar via puppeteer.connect()
  liveUrl: string;     // URL para abrir como popup para o usuário
}

/**
 * Cria uma sessão Browserless usando o fluxo correto da documentação oficial:
 * 1. Conecta via puppeteer ao WSS endpoint
 * 2. Navega até o AVA
 * 3. Chama Browserless.reconnect via CDP para manter o browser vivo após disconnect
 * 4. Retorna o browserWSEndpoint para reconectar depois
 */
export async function createSession(targetUrl: string = AVA_URL): Promise<BrowserSession> {
  const puppeteer = await import('puppeteer-core');

  const browser = await puppeteer.connect({
    browserWSEndpoint: BROWSERLESS_WSS,
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());

  // Navega até o AVA para o usuário já ver a tela certa no popup
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.warn('[Browserless] Aviso: falha ao navegar até AVA:', err);
  }

  // Cria sessão CDP e chama Browserless.reconnect para manter o browser vivo
  const cdp = await page.createCDPSession();

  // Tenta 60s primeiro (plano Starter), com fallback para 30s (plano Free/Prototyping)
  let reconnectEndpoint: string | null = null;

  for (const timeout of [60000, 30000, 10000]) {
    try {
      const result = await cdp.send('Browserless.reconnect', { timeout }) as {
        browserWSEndpoint: string | null;
        error: string | null;
      };

      if (!result.error && result.browserWSEndpoint) {
        reconnectEndpoint = result.browserWSEndpoint;
        break;
      }
      console.warn(`[Browserless] reconnect com timeout=${timeout} falhou:`, result.error);
    } catch (e) {
      console.warn(`[Browserless] reconnect com timeout=${timeout} lançou:`, e);
    }
  }

  // Desconecta localmente — o browser continua vivo no servidor dentro do TTL
  await browser.disconnect();

  if (!reconnectEndpoint) {
    throw new Error(
      'Browserless.reconnect falhou em todos os timeouts. Verifique o seu plano e o token.'
    );
  }

  // O endpoint retornado NÃO inclui o token — precisamos adicionar manualmente
  const wsEndpoint = reconnectEndpoint.includes('token=')
    ? reconnectEndpoint
    : `${reconnectEndpoint}?token=${BROWSERLESS_TOKEN}`;

  return {
    wsEndpoint,
    liveUrl: buildLiveUrl(reconnectEndpoint),
  };
}

/**
 * Constrói a URL do DevTools viewer para abrir como popup.
 * browserWSEndpoint formato: wss://production-sfo.browserless.io/devtools/browser/<id>
 */
export function buildLiveUrl(browserWSEndpoint: string): string {
  // Remove protocolo e query string para montar o wss param limpo
  const withoutProtocol = browserWSEndpoint.replace(/^wss?:\/\//, '').split('?')[0];
  return (
    `https://chrome-devtools-frontend.appspot.com/serve_internal_file/@7521078/inspector.html` +
    `?wss=${withoutProtocol}?token=${BROWSERLESS_TOKEN}`
  );
}

/**
 * Retorna a URL de popup a partir do wsEndpoint salvo no Redis.
 */
export function getPopupUrl(wsEndpoint: string): string {
  const withoutProtocol = wsEndpoint.replace(/^wss?:\/\//, '').split('?')[0];
  return (
    `https://chrome-devtools-frontend.appspot.com/serve_internal_file/@7521078/inspector.html` +
    `?wss=${withoutProtocol}?token=${BROWSERLESS_TOKEN}`
  );
}

/**
 * Reconecta ao browser existente e verifica se o usuário completou o login.
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
