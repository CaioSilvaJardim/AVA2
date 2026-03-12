const BROWSERLESS_TOKEN = '2U8BthhqFtgqpGQ8770994c0a6bd723560f5f4a055187bd56';
const AVA_URL = 'https://ava.escolaparque.g12.br';

export interface BrowserSession {
  wsEndpoint: string;
  liveUrl: string;
}

/**
 * Creates a new Browserless session navigating to the given URL.
 * Returns the WebSocket endpoint and live viewer URL.
 */
export async function createSession(targetUrl: string = AVA_URL): Promise<BrowserSession> {
  // We use the Browserless REST API to get a session
  // The browser will open at targetUrl
  const response = await fetch(
    `https://chrome.browserless.io/json/new?token=${BROWSERLESS_TOKEN}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        stealth: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Browserless session creation failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    webSocketDebuggerUrl: string;
    devtoolsFrontendUrl: string;
    id: string;
  };

  const wsEndpoint = data.webSocketDebuggerUrl;
  // Build the live viewer URL
  const liveUrl = `https://chrome.browserless.io/devtools/inspector.html?wss=chrome.browserless.io/devtools/page/${data.id}?token=${BROWSERLESS_TOKEN}`;

  return { wsEndpoint, liveUrl };
}

/**
 * Returns the direct popup URL for the Browserless viewer.
 * This is opened as a popup in the user's browser so they can interact with the remote browser.
 */
export function getPopupUrl(wsEndpoint: string): string {
  // Extract the page ID from the wsEndpoint
  // wsEndpoint format: wss://chrome.browserless.io/devtools/page/{id}?token=...
  const match = wsEndpoint.match(/\/devtools\/page\/([^?]+)/);
  if (match) {
    const pageId = match[1];
    return `https://chrome.browserless.io/devtools/inspector.html?wss=chrome.browserless.io/devtools/page/${pageId}?token=${BROWSERLESS_TOKEN}`;
  }
  // Fallback: direct browserless URL
  return `https://chrome.browserless.io/?token=${BROWSERLESS_TOKEN}`;
}

/**
 * Checks if the user has completed login by examining the current URL of the page.
 * Returns true if the page is no longer on Google authentication pages.
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

    // User is still on Google auth if URL contains these domains
    const authDomains = [
      'accounts.google.com',
      'myaccount.google.com',
      'login.microsoftonline.com',
    ];

    const isOnAuthPage = authDomains.some((domain) => currentUrl.includes(domain));
    const isOnAva = currentUrl.includes('escolaparque') || currentUrl.includes('ava.');

    return {
      loggedIn: !isOnAuthPage && isOnAva,
      currentUrl,
    };
  } catch (err) {
    console.error('[Browserless] checkLoginStatus error:', err);
    return { loggedIn: false, currentUrl: '' };
  }
}
