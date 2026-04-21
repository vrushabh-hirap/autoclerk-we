// AutoClerk Background Service Worker

const SUPABASE_URL = 'https://vuvrhlvfvcfkxhsqqxik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1dnJobHZmdmNma3hoc3FxeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTYzMTgsImV4cCI6MjA5MDg3MjMxOH0.DCS9215sS1uF7bitZuqokYEXt-R8bVKswEJ-_votOVI';
const WEB_APP_ORIGIN = 'https://autocleark.vercel.app';
const POST_LOGIN_PATH_PREFIXES = ['/dashboard', '/app', '/profile'];

const AUTH_STORAGE_KEYS = [
  'accessToken',
  'refreshToken',
  'userId',
  'userEmail',
  'userFullName',
  'userAvatarUrl',
  'sbSession',
  'loginError'
];

const supabase = createBackgroundSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let loginSyncInProgress = false;

// On install: initialize empty session
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      acSession: {
        sections: {},
        savedChecks: [],
        checkCounter: 0
      }
    });
    console.log('[AutoClerk] Installed — session initialized');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateBadge') {
    const { errorCount } = message;
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: true });
      return true;
    }

    chrome.action.setBadgeText({
      text: errorCount > 0 ? String(errorCount) : '',
      tabId
    });
    chrome.action.setBadgeBackgroundColor({
      color: errorCount > 0 ? '#EF4444' : '#10B981',
      tabId
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'saveToSupabase') {
    (async () => {
      try {
        const { errors, studentId, checkNumber, section, accessToken } = message.payload;

        if (!errors || errors.length === 0) {
          sendResponse({ success: true });
          return;
        }

        const rows = errors.map((err) => ({
          student_id: studentId,
          check_number: checkNumber,
          section: section,
          error_type: err.type,
          field_name: err.field,
          error_description: err.message,
          severity: err.severity,
          resolved: false,
          created_at: new Date().toISOString()
        }));

        const response = await fetch(`${SUPABASE_URL}/rest/v1/error_logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(rows)
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.message || `HTTP ${response.status}`);
        }

        sendResponse({ success: true });
      } catch (err) {
        console.error('[AutoClerk SW] Failed to save to Supabase:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'authSignOut') {
    (async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AutoClerk SW] Supabase signOut failed:', err);
      } finally {
        await storageRemove([...AUTH_STORAGE_KEYS, 'loginTabId']);
      }

      sendRuntimeMessage({ action: 'authSignedOut' });
      sendResponse({ success: true });
    })();
    return true;
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});

// Clear badge when tab navigates away from MAHADBT
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    if (!tab.url || !tab.url.includes('mahadbt.maharashtra.gov.in')) {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// Track OAuth login tab and finalize auth once dashboard is loaded.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  void handleLoginTabUpdate(tabId, changeInfo, tab);
});

// If login tab is manually closed, clear stale tracker.
chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const { loginTabId } = await storageGet(['loginTabId']);
    if (loginTabId === tabId) {
      await storageRemove(['loginTabId']);
    }
  })();
});

async function handleLoginTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'complete') return;

  const { loginTabId } = await storageGet(['loginTabId']);
  if (!loginTabId || loginTabId !== tabId) return;

  const currentUrl = changeInfo.url || tab?.url || '';
  if (!isPostLoginUrl(currentUrl)) return;
  if (loginSyncInProgress) return;

  loginSyncInProgress = true;
  try {
    await completeLoginSync(tabId);
  } finally {
    loginSyncInProgress = false;
  }
}

async function completeLoginSync(tabId) {
  try {
    const extracted = await extractSupabaseSessionFromTab(tabId);
    const { accessToken, refreshToken, user } = extracted;

    const setSessionResult = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    const sessionUser = setSessionResult?.data?.user || user || null;

    let userDetails = null;
    if (sessionUser?.id) {
      userDetails = await supabase.fetchUserDetails(sessionUser.id, accessToken);
    }

    const finalUserId = sessionUser?.id || extracted.userId || '';
    const finalEmail = userDetails?.email || sessionUser?.email || extracted.userEmail || '';
    const finalFullName =
      userDetails?.full_name ||
      sessionUser?.user_metadata?.full_name ||
      sessionUser?.user_metadata?.name ||
      extracted.userFullName ||
      '';
    const finalAvatarUrl =
      userDetails?.avatar_url ||
      sessionUser?.user_metadata?.avatar_url ||
      sessionUser?.user_metadata?.picture ||
      extracted.userAvatarUrl ||
      '';

    const sbSession = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        ...(sessionUser || {}),
        id: finalUserId || sessionUser?.id,
        email: finalEmail || sessionUser?.email,
        user_metadata: {
          ...(sessionUser?.user_metadata || {}),
          full_name: finalFullName || sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name || '',
          avatar_url: finalAvatarUrl || sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.picture || ''
        }
      }
    };

    await storageSet({
      accessToken,
      refreshToken,
      userId: finalUserId,
      userEmail: finalEmail,
      userFullName: finalFullName,
      userAvatarUrl: finalAvatarUrl,
      sbSession,
      loginError: null
    });

    const { loginTabId } = await storageGet(['loginTabId']);
    if (loginTabId) {
      await chrome.tabs.remove(loginTabId).catch(() => {});
    }
    await storageRemove(['loginTabId']);

    sendRuntimeMessage({
      action: 'loginSuccess',
      payload: {
        userId: finalUserId,
        userEmail: finalEmail,
        userFullName: finalFullName,
        userAvatarUrl: finalAvatarUrl
      }
    });
  } catch (err) {
    const errorMessage = err?.message || 'Unable to complete login.';
    console.error('[AutoClerk SW] Login sync failed:', err);
    await storageSet({ loginError: errorMessage });
    sendRuntimeMessage({ action: 'loginFailed', error: errorMessage });
  }
}

function isPostLoginUrl(urlString) {
  if (!urlString) return false;

  try {
    const parsed = new URL(urlString);
    if (parsed.origin !== WEB_APP_ORIGIN) return false;
    return POST_LOGIN_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix));
  } catch (_err) {
    return false;
  }
}

async function extractSupabaseSessionFromTab(tabId) {
  const injected = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async () => {
      function decodeMaybeBase64(value) {
        if (!value || typeof value !== 'string') return value;
        if (!value.startsWith('base64-')) return value;
        try {
          return atob(value.slice('base64-'.length));
        } catch (_err) {
          return value;
        }
      }

      function normalizeSession(parsed) {
        if (!parsed) return null;

        let candidate = parsed;
        if (candidate.currentSession) candidate = candidate.currentSession;
        if (candidate.session) candidate = candidate.session;

        if (Array.isArray(candidate) && candidate.length >= 5) {
          candidate = {
            access_token: candidate[0],
            refresh_token: candidate[1],
            user: candidate[4]
          };
        }

        const accessToken = candidate.access_token || candidate.accessToken || null;
        const refreshToken = candidate.refresh_token || candidate.refreshToken || null;
        const user = candidate.user || parsed.user || null;

        if (!accessToken || !refreshToken) return null;

        return {
          accessToken,
          refreshToken,
          user: user || {},
          userId: user?.id || '',
          userEmail: user?.email || '',
          userFullName: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
          userAvatarUrl: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
        };
      }

      async function readFromWindowSupabase() {
        try {
          if (window.supabase?.auth?.getSession) {
            const result = await window.supabase.auth.getSession();
            const parsed = result?.data?.session || result?.session || null;
            return normalizeSession(parsed);
          }
        } catch (_err) {}
        return null;
      }

      function readFromLocalStorage() {
        const authKey = Object.keys(localStorage).find((key) => key && key.includes('auth-token'));
        if (!authKey) return null;

        const raw = localStorage.getItem(authKey);
        if (!raw) return null;

        const decodedRaw = decodeMaybeBase64(raw);
        try {
          const parsed = JSON.parse(decodedRaw);
          return normalizeSession(parsed);
        } catch (_err) {
          return null;
        }
      }

      const fromSupabaseClient = await readFromWindowSupabase();
      if (fromSupabaseClient) {
        return { success: true, source: 'window.supabase', ...fromSupabaseClient };
      }

      const fromStorage = readFromLocalStorage();
      if (fromStorage) {
        return { success: true, source: 'localStorage', ...fromStorage };
      }

      return {
        success: false,
        error: 'No Supabase session found in page context'
      };
    }
  });

  const result = injected?.[0]?.result;
  if (!result?.success) {
    throw new Error(result?.error || 'Session extraction failed');
  }

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.user || {},
    userId: result.userId || '',
    userEmail: result.userEmail || '',
    userFullName: result.userFullName || '',
    userAvatarUrl: result.userAvatarUrl || ''
  };
}

function createBackgroundSupabaseClient(supabaseUrl, anonKey) {
  let activeSession = null;

  async function request(path, { method = 'GET', token = null, body = null, headers = {} } = {}) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      method,
      headers: {
        'apikey': anonKey,
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...headers
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return response;
  }

  return {
    auth: {
      async setSession({ access_token, refresh_token }) {
        if (!access_token || !refresh_token) {
          throw new Error('Both access_token and refresh_token are required');
        }

        activeSession = {
          access_token,
          refresh_token
        };

        const userResponse = await request('/auth/v1/user', {
          method: 'GET',
          token: access_token
        });

        if (!userResponse.ok) {
          const errBody = await userResponse.json().catch(() => ({}));
          throw new Error(errBody.message || `Unable to validate Supabase session (HTTP ${userResponse.status})`);
        }

        const user = await userResponse.json();
        activeSession.user = user;
        return {
          data: {
            session: activeSession,
            user
          },
          error: null
        };
      },

      async signOut() {
        if (activeSession?.access_token) {
          await request('/auth/v1/logout', {
            method: 'POST',
            token: activeSession.access_token
          }).catch(() => {});
        }
        activeSession = null;
        return { error: null };
      }
    },

    async fetchUserDetails(userId, accessToken) {
      if (!userId || !accessToken) return null;

      const query = `/rest/v1/user_details?id=eq.${encodeURIComponent(userId)}&select=id,email,full_name,avatar_url,created_at&limit=1`;
      const response = await request(query, {
        method: 'GET',
        token: accessToken
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message || `Failed to fetch user details (HTTP ${response.status})`);
      }

      const rows = await response.json();
      return rows?.[0] || null;
    }
  };
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function storageSet(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, resolve);
  });
}

function storageRemove(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, resolve);
  });
}

function sendRuntimeMessage(message) {
  chrome.runtime.sendMessage(message, () => {
    void chrome.runtime.lastError;
  });
}
