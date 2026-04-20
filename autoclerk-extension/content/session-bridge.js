// content/session-bridge.js
/**
 * AutoClerk Session Bridge — v2
 *
 * Runs on autocleark.vercel.app after page load.
 * Strategy:
 *   1. Poll localStorage after page load (catches OAuth redirects that write AFTER paint)
 *   2. Intercept localStorage.setItem to catch Supabase writes in real-time
 *   3. Listen for messages from the popup/background to trigger a manual sync
 */

(function () {
  const POLL_INTERVAL_MS = 800;
  const POLL_MAX_ATTEMPTS = 20; // Poll for up to ~16 seconds

  let lastSyncedToken = null;
  let pollAttempts = 0;
  let pollTimer = null;

  // ===== Core: Find the Supabase session =====
  function getSessionData() {
    // 1. Try LocalStorage (Classic Supabase JS)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        try { return { source: 'localstorage', raw, parsed: JSON.parse(raw) }; } catch (e) {}
      }
    }

    // 2. Try Cookies (@supabase/ssr / Next.js uses cookies, often chunked)
    const cookies = document.cookie.split(';');
    const chunks = {};
    let prefix = null;

    cookies.forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const value = parts.slice(1).join('=');
      
      if (name.startsWith('sb-') && name.includes('-auth-token')) {
        chunks[name] = decodeURIComponent(value);
        if (!prefix) prefix = name.split('-auth-token')[0] + '-auth-token';
      }
    });

    if (prefix) {
      // Stitch chunked cookies if necessary
      let combined = '';
      if (chunks[prefix]) {
        combined = chunks[prefix];
      } else {
        let i = 0;
        while (chunks[`${prefix}.${i}`]) {
          combined += chunks[`${prefix}.${i}`];
          i++;
        }
      }

      if (combined) {
        try {
          // @supabase/ssr stores as base64-encoded string, resolving to an array
          let rawJson = combined;
          if (combined.startsWith('base64-')) {
            rawJson = atob(combined.replace('base64-', ''));
          }
          
          let parsed = JSON.parse(rawJson);
          
          // @supabase/ssr shape: [access_token, refresh_token, provider_token, provider_refresh_token, user_object]
          if (Array.isArray(parsed) && parsed.length >= 5) {
            parsed = {
              access_token: parsed[0],
              refresh_token: parsed[1],
              user: parsed[4]
            };
          }
          return { source: 'cookie', raw: combined, parsed };
        } catch (e) {
          console.error('[AutoClerk Bridge] Failed to parse cookie data:', e);
        }
      }
    }

    return null;
  }

  // ===== Core: Push session to extension storage =====
  function syncSession(triggerSource) {
    const sessionData = getSessionData();

    if (sessionData) {
      if (sessionData.raw === lastSyncedToken) return;
      lastSyncedToken = sessionData.raw;

      chrome.storage.local.set({ sbSession: sessionData.parsed }, () => {
        console.log(`[AutoClerk Bridge] ✅ Session synced (source: ${triggerSource}, via ${sessionData.source})`);
      });
    } else {
      // No session found — clear storage if we previously had one
      if (lastSyncedToken !== null) {
        lastSyncedToken = null;
        chrome.storage.local.remove(['sbSession'], () => {
          console.log('[AutoClerk Bridge] 🚪 Session cleared (logged out)');
        });
      }
    }
  }

  // ===== Strategy 1: Polling (catches OAuth redirect token writes) =====
  function startPolling() {
    pollTimer = setInterval(() => {
      syncSession('poll');
      pollAttempts++;
      if (pollAttempts >= POLL_MAX_ATTEMPTS) {
        clearInterval(pollTimer);
        console.log('[AutoClerk Bridge] Polling complete.');
      }
    }, POLL_INTERVAL_MS);
  }

  // ===== Strategy 2: Intercept localStorage.setItem =====
  // Supabase JS calls setItem directly, which doesn't fire the 'storage' event
  // on the same page. We patch setItem to detect it in real-time.
  const _origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    _origSetItem(key, value);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      syncSession('setItem-intercept');
    }
  };

  const _origRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = function (key) {
    _origRemoveItem(key);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      syncSession('removeItem-intercept');
    }
  };

  // ===== Strategy 3: Listen for message from popup to trigger manual sync =====
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'syncSession') {
      syncSession('manual');
      sendResponse({ success: true });
    }
  });

  // ===== Boot =====
  // Run once immediately after page is idle
  syncSession('initial');
  startPolling();

})();
