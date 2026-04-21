// popup/popup.js — AutoClerk Popup Controller (self-contained, no ES imports)

// ===== Inlined Config (from lib/supabase-config.js) =====
const SUPABASE_URL = 'https://vuvrhlvfvcfkxhsqqxik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1dnJobHZmdmNma3hoc3FxeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTYzMTgsImV4cCI6MjA5MDg3MjMxOH0.DCS9215sS1uF7bitZuqokYEXt-R8bVKswEJ-_votOVI';
const WEB_APP_DOMAIN = 'autocleark.vercel.app';
const WEB_APP_ORIGIN = `https://${WEB_APP_DOMAIN}`;
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
const AUTH_STORAGE_KEY_SET = new Set([...AUTH_STORAGE_KEYS, 'loginTabId']);

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

async function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve({ ok: true, response });
    });
  });
}

// ===== Inlined Auth Helpers (from lib/supabase-auth.js) =====
const SupabaseAuth = {
  async getStoredAuth() {
    return storageGet(AUTH_STORAGE_KEYS);
  },

  async getSession() {
    const stored = await this.getStoredAuth();
    if (stored.sbSession) return stored.sbSession;
    if (!stored.accessToken) return null;

    return {
      access_token: stored.accessToken,
      refresh_token: stored.refreshToken || '',
      user: {
        id: stored.userId || '',
        email: stored.userEmail || '',
        user_metadata: {
          full_name: stored.userFullName || '',
          avatar_url: stored.userAvatarUrl || ''
        }
      }
    };
  },

  async logout() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'authSignOut' }, async (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          await storageRemove([...AUTH_STORAGE_KEYS, 'loginTabId']);
        }
        resolve();
      });
    });
  },

  async getUserDetails(userId, accessToken) {
    if (!userId || !accessToken) return null;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_details?id=eq.${encodeURIComponent(userId)}&select=id,email,full_name,avatar_url,created_at&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data[0] || null;
    } catch (err) {
      console.error('[AutoClerk] Error fetching user details:', err);
      return null;
    }
  },

  async checkAuth() {
    const stored = await this.getStoredAuth();
    const session = stored.sbSession || null;
    const sessionUser = session?.user || session?.session?.user || null;
    const accessToken = stored.accessToken || session?.access_token || session?.session?.access_token || '';
    const refreshToken = stored.refreshToken || session?.refresh_token || session?.session?.refresh_token || '';
    const userId = stored.userId || sessionUser?.id || '';
    const userEmail = stored.userEmail || sessionUser?.email || '';

    if (!accessToken || !userEmail) return null;

    let profile = {
      full_name: stored.userFullName || sessionUser?.user_metadata?.full_name || sessionUser?.user_metadata?.name || 'User',
      avatar_url: stored.userAvatarUrl || sessionUser?.user_metadata?.avatar_url || sessionUser?.user_metadata?.picture || '',
      email: userEmail
    };

    // Fill missing profile fields from user_details table when needed.
    if ((!profile.full_name || !profile.avatar_url) && userId) {
      const details = await this.getUserDetails(userId, accessToken);
      if (details) {
        profile = {
          full_name: details.full_name || profile.full_name || 'User',
          avatar_url: details.avatar_url || profile.avatar_url || '',
          email: details.email || profile.email
        };

        await storageSet({
          userFullName: profile.full_name,
          userAvatarUrl: profile.avatar_url,
          userEmail: profile.email
        });
      }
    }

    const normalizedSession = session || {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: userId,
        email: userEmail,
        user_metadata: {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        }
      }
    };

    return {
      session: normalizedSession,
      profile,
      loginError: stored.loginError || null
    };
  }
};

// ===== MAHADBT Sections =====
const SECTIONS = [
  { key: 'personal_information', label: 'Personal Information', path: 'UpdateProfile' },
  { key: 'address_information', label: 'Address Information', path: 'AddressInformation' },
  { key: 'other_information', label: 'Parent/Guardian', path: 'OtherInfo' },
  { key: 'current_course', label: 'Current Course', path: 'CurrentQualification' },
  { key: 'past_qualification', label: 'Past Qualification', path: 'EducationDetails' },
  { key: 'hostel_details', label: 'Hostel Details', path: 'Hostel' },
];

const MAHADBT_BASE = 'https://mahadbt.maharashtra.gov.in/';

// ===== Init =====

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupRealtimeAuthListeners();

  // Initial load
  await updateAuthState();
  await checkCurrentTab();
  await loadErrorLog();
  setupActionButtons();
  setupAuthButtons();

  // Helper: Poll the timer visually since storage logic only fires on data change
  setInterval(() => {
    updateTimerOnly();
  }, 100);
});

// ===== Tabs =====

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`content-${tab}`)?.classList.add('active');
    });
  });
}

function setupRealtimeAuthListeners() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes.acSession) {
      void checkCurrentTab();
      void loadErrorLog();
    }

    const hasAuthChange = Object.keys(changes).some((key) => AUTH_STORAGE_KEY_SET.has(key));
    if (hasAuthChange) {
      void updateAuthState();
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'loginFailed') {
      setAuthStatus(message.error || 'Login failed. Please try again.', true);
      void updateAuthState();
    }
    if (message.action === 'loginSuccess') {
      setAuthStatus('');
      void updateAuthState();
    }
    if (message.action === 'authSignedOut') {
      setAuthStatus('');
      void updateAuthState();
    }
  });
}

// ===== Current Tab Detection + Live Stats =====

async function checkCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const url = tab?.url || '';

  const statusCard = document.getElementById('page-status-card');
  const statusIcon = document.getElementById('page-status-icon');
  const statusTitle = document.getElementById('page-status-title');
  const statusSubtitle = document.getElementById('page-status-subtitle');
  const scanActivity = document.getElementById('scan-activity');

  if (url.includes('mahadbt.maharashtra.gov.in')) {
    const matchedSection = SECTIONS.find(s => url.includes(s.path));

    statusCard.classList.add('on-page');
    statusIcon.textContent = '✅';
    statusTitle.textContent = matchedSection ? `Active: ${matchedSection.label}` : 'On MAHADBT Portal';
    statusSubtitle.textContent = matchedSection
      ? 'AutoClerk is live-scanning this section'
      : 'Navigate to a profile section to validate';

    updateStatusDot('connected');
    renderSectionsList(matchedSection?.key);

    if (matchedSection) {
      scanActivity.style.display = 'block';
      await updateLiveStats(matchedSection.key);
    } else {
      scanActivity.style.display = 'none';
    }
  } else {
    statusCard.classList.remove('on-page');
    statusIcon.textContent = '🔗';
    statusTitle.textContent = 'Not on MAHADBT Portal';
    statusSubtitle.textContent = 'Open MAHADBT to start validation';
    updateStatusDot('disconnected');
    renderSectionsList(null);
    scanActivity.style.display = 'none';
  }
}

function updateStatusDot(status) {
  const dot = document.getElementById('status-dot');
  if (dot) {
    dot.className = `popup-status-dot ${status}`;
    dot.title = status === 'connected' ? 'Active on MAHADBT' : 'Not on MAHADBT';
  }
}

async function updateLiveStats(sectionKey) {
  const session = await getSession();
  const sectionData = session.sections?.[sectionKey] || { status: 'idle', errors: [], fieldCount: 0 };

  const errors = sectionData.errors || [];
  const fieldCount = sectionData.fieldCount || 0;
  const critical = errors.filter(e => e.severity === 'critical').length;
  const warning = errors.filter(e => e.severity === 'warning').length;
  const clear = Math.max(0, fieldCount - errors.length);

  const progressPct = fieldCount > 0
    ? Math.max(10, Math.round(((fieldCount - errors.length) / fieldCount) * 100))
    : 30;
  const fillEl = document.getElementById('scan-progress-fill');
  if (fillEl) {
    fillEl.style.width = `${progressPct}%`;
    fillEl.style.background = critical > 0 ? '#ef4444' : warning > 0 ? '#f59e0b' : '#10b981';
  }

  updateTimerUI(sectionData);

  const fieldCountEl = document.getElementById('scan-field-count');
  if (fieldCountEl) fieldCountEl.textContent = `${fieldCount} fields`;

  const headerPill = document.getElementById('header-scan-pill');
  if (headerPill) headerPill.textContent = `${fieldCount} fields`;

  const critEl = document.getElementById('ov-critical');
  const warnEl = document.getElementById('ov-warning');
  const goodEl = document.getElementById('ov-good');
  if (critEl) critEl.textContent = critical;
  if (warnEl) warnEl.textContent = warning;
  if (goodEl) goodEl.textContent = clear;
}

function updateTimerUI(sectionData) {
  const status = sectionData.status || 'idle';
  const labelEl = document.getElementById('scan-label-text');
  const pulseEl = document.getElementById('scan-pulse');
  const scanStartedAt = sectionData.scanStartedAt;

  if (labelEl) {
    if (status === 'scanning' && scanStartedAt) {
      const elapsed = ((Date.now() - scanStartedAt) / 1000).toFixed(1);
      labelEl.textContent = `Live Scanning... (${elapsed}s)`;
      labelEl.style.color = 'var(--text)';
    } else if (status === 'scanning') {
      labelEl.textContent = 'Preparing Scan...';
      labelEl.style.color = 'var(--text)';
    } else if (status === 'finished') {
      labelEl.textContent = 'Scan Complete';
      labelEl.style.color = 'var(--success)';
    } else {
      labelEl.textContent = 'Ready to Scan';
      labelEl.style.color = 'var(--text-muted)';
    }
  }
  if (pulseEl) {
    pulseEl.style.display = status === 'scanning' ? 'block' : 'none';
  }
}

async function updateTimerOnly() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0]?.url || '';
  if (!url.includes('mahadbt.maharashtra.gov.in')) return;

  const matchedSection = SECTIONS.find(s => url.includes(s.path));
  if (!matchedSection) return;

  const session = await getSession();
  const sectionData = session.sections?.[matchedSection.key];
  if (sectionData && sectionData.status === 'scanning' && sectionData.scanStartedAt) {
    updateTimerUI(sectionData);
  }
}

// ===== Sections List =====

function renderSectionsList(activeSection) {
  const list = document.getElementById('sections-list');
  const badge = document.getElementById('sections-badge');
  if (!list) return;

  getSession().then(session => {
    const visitedCount = Object.keys(session.sections || {}).length;
    if (badge) badge.textContent = `${visitedCount}/6`;

    list.innerHTML = SECTIONS.map(s => {
      const isActive = s.key === activeSection;
      const sectionData = session.sections?.[s.key];
      const hasErrors = sectionData && sectionData.errors?.length > 0;
      const isFinished = sectionData && sectionData.status === 'finished';
      const isScanning = sectionData && sectionData.status === 'scanning';

      let statusLabel = 'NOT VISITED';
      let statusClass = 'status-idle';
      let dotClass = 'dot-idle';

      if (isActive) {
        statusLabel = isScanning ? 'SCANNING' : 'ACTIVE';
        statusClass = 'status-active';
        dotClass = 'dot-active';
      } else if (sectionData) {
        if (hasErrors) {
          statusLabel = 'ERRORS';
          statusClass = 'status-error';
          dotClass = 'dot-error';
        } else if (isFinished) {
          statusLabel = 'CLEAN';
          statusClass = 'status-success';
          dotClass = 'dot-success';
        }
      }

      return `
        <div class="section-row">
          <div class="section-row-dot ${dotClass}"></div>
          <span class="section-row-name">${s.label}</span>
          <span class="section-row-status ${statusClass}">${statusLabel}</span>
        </div>
      `;
    }).join('');
  });
}

// ===== Error Log =====

async function loadErrorLog() {
  const logList = document.getElementById('errorlog-list');
  const emptyState = document.getElementById('errorlog-empty');
  if (!logList) return;

  const session = await getSession();
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0]?.url || '';
  const matchedSection = SECTIONS.find(s => url.includes(s.path));

  let errors = [];
  if (matchedSection && session.sections?.[matchedSection.key]) {
      errors = session.sections[matchedSection.key].errors || [];
  }

  if (errors.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    logList.querySelectorAll('.ac-error-group').forEach(c => c.remove());
    if (emptyState) logList.appendChild(emptyState);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Group errors by type
  const grouped = {};
  errors.forEach(err => {
    if (!grouped[err.type]) grouped[err.type] = [];
    grouped[err.type].push(err);
  });

  const cardsHtml = Object.entries(grouped).map(([type, errs]) => `
    <div class="ac-error-group" style="background:#fff;border:1px solid #e1e3e8;border-radius:12px;margin-bottom:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="padding:12px;background:#f8f9fc;font-weight:600;font-size:13px;border-bottom:1px solid #e1e3e8;color:#1e293b;display:flex;justify-content:space-between;align-items:center;">
        <span>${type.replace(/_/g, ' ')}</span>
        <span style="background:#e2e8f0;padding:2px 8px;border-radius:12px;font-size:11px;">${errs.length} issues</span>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:12px;">
        ${errs.map(err => {
           let dotColor = err.severity === 'critical' ? '#ef4444' : err.severity === 'warning' ? '#f59e0b' : '#3b82f6';
           return `
          <div style="display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.4;">
            <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};margin-top:4px;flex-shrink:0;"></div>
            <div>
              <strong style="color:#1e293b;display:block;">${err.field}</strong>
              <span style="color:#64748b;">${err.message}</span>
            </div>
          </div>
        `}).join('')}
      </div>
    </div>
  `).join('');

  logList.innerHTML = cardsHtml;
}

// ===== Action Buttons =====

function setupActionButtons() {
  document.getElementById('btn-force-refresh')?.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return;

    const sendResult = await sendMessageToTab(tab.id, { action: 'forceUpdate' });
    if (!sendResult.ok) {
      console.warn('[AutoClerk] forceUpdate message failed:', sendResult.error);
      return;
    }

    // Visual feedback
    const btn = document.getElementById('btn-force-refresh');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Scanning...';
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 1000);
  });

  document.getElementById('btn-save-errors-popup')?.addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return;

    const sendResult = await sendMessageToTab(tab.id, { action: 'triggerSave' });
    if (!sendResult.ok) {
      console.warn('[AutoClerk] triggerSave message failed:', sendResult.error);
      return;
    }

    // Visual feedback
    const btn = document.getElementById('btn-save-errors-popup');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '💾 Triggered!';
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 1000);
  });

}

// ===== Auth Buttons =====

function setupAuthButtons() {
  document.getElementById('btn-login-google')?.addEventListener('click', handleLogin);
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);
  document.getElementById('btn-sync-session')?.addEventListener('click', syncSessionFromWebApp);
}

// ===== Storage Helpers =====

async function getSession() {
  return new Promise(resolve => {
    chrome.storage.local.get(['acSession'], result => {
      resolve(result.acSession || { sections: {}, savedChecks: [], checkCounter: 0 });
    });
  });
}

// ===== Auth & Profile Logic =====

function setAuthStatus(message, isError = false) {
  const statusEl = document.getElementById('auth-status-message');
  if (!statusEl) return;

  if (!message) {
    statusEl.textContent = '';
    statusEl.style.display = 'none';
    statusEl.classList.remove('error');
    return;
  }

  statusEl.textContent = message;
  statusEl.style.display = 'block';
  statusEl.classList.toggle('error', isError);
}

async function updateAuthState() {
  const authSignedOut = document.getElementById('auth-signed-out');
  const authSignedIn = document.getElementById('auth-signed-in');
  const authLoading = document.getElementById('auth-loading');

  if (!authSignedOut || !authSignedIn) return;

  if (authLoading) authLoading.style.display = 'flex';

  try {
    const auth = await SupabaseAuth.checkAuth();

    if (auth && auth.session) {
      authSignedOut.style.display = 'none';
      authSignedIn.style.display = 'flex';
      setAuthStatus('');

      const nameEl = document.getElementById('user-name');
      const emailEl = document.getElementById('user-email');
      const avatarEl = document.getElementById('user-avatar');

      if (nameEl) nameEl.textContent = auth.profile.full_name || 'User';
      if (emailEl) emailEl.textContent = auth.profile.email || '';
      if (avatarEl && auth.profile.avatar_url) {
        avatarEl.src = auth.profile.avatar_url;
      } else if (avatarEl) {
        avatarEl.src = '../icons/icon128.png';
      }

      const backendPlaceholder = document.getElementById('backend-placeholder');
      if (backendPlaceholder) {
        backendPlaceholder.innerHTML = `
          <div class="backend-placeholder-icon" style="color:var(--success)">✓</div>
          <div class="backend-placeholder-text">
            <div class="backend-placeholder-title">Connected to Cloud</div>
            <div class="backend-placeholder-sub">Syncing errors to your account.</div>
          </div>
          <div class="backend-badge" style="background:var(--gold-light);color:var(--gold-dark);">Cloud Sync</div>
        `;
      }
    } else {
      authSignedOut.style.display = 'flex';
      authSignedIn.style.display = 'none';
      const { loginError, loginTabId } = await storageGet(['loginError', 'loginTabId']);
      if (loginError) {
        setAuthStatus(loginError, true);
      } else if (loginTabId) {
        setAuthStatus('Login in progress in the opened tab...', false);
      } else {
        setAuthStatus('');
      }

      const backendPlaceholder = document.getElementById('backend-placeholder');
      if (backendPlaceholder) {
        backendPlaceholder.innerHTML = `
          <div class="backend-placeholder-icon">🔌</div>
          <div class="backend-placeholder-text">
            <div class="backend-placeholder-title">Backend not connected</div>
            <div class="backend-placeholder-sub">Sign in to sync across devices.</div>
          </div>
          <div class="backend-badge">Local Only</div>
        `;
      }
    }
  } catch (err) {
    console.error('[AutoClerk] Auth check failed:', err);
  } finally {
    if (authLoading) authLoading.style.display = 'none';
  }
}

function handleLogin() {
  const loginUrl = `${WEB_APP_ORIGIN}/login`;

  chrome.tabs.create({ url: loginUrl, active: true }, async (tab) => {
    if (chrome.runtime.lastError || !tab?.id) {
      setAuthStatus('Could not open login tab. Please try again.', true);
      return;
    }

    await storageSet({
      loginTabId: tab.id,
      loginError: null
    });
    setAuthStatus('Login tab opened. Complete Google sign-in there.', false);
  });
}

async function handleLogout() {
  if (confirm('Are you sure you want to sign out?')) {
    await SupabaseAuth.logout();
    setAuthStatus('');
    await updateAuthState();
  }
}

async function syncSessionFromWebApp() {
  const syncBtn = document.getElementById('btn-sync-session');
  if (syncBtn) {
    syncBtn.textContent = '⏳ Syncing...';
    syncBtn.disabled = true;
  }

  try {
    const tabs = await chrome.tabs.query({ url: 'https://autocleark.vercel.app/*' });

    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'syncSession' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[AutoClerk] Bridge not available:', chrome.runtime.lastError.message);
        }
        setTimeout(() => updateAuthState(), 1200);
      });
    } else {
      // No web app tab open — just re-check storage
      await updateAuthState();
    }
  } catch (err) {
    console.error('[AutoClerk] Sync error:', err);
    await updateAuthState();
  } finally {
    setTimeout(() => {
      if (syncBtn) {
        syncBtn.textContent = '↺ Already signed in? Sync session';
        syncBtn.disabled = false;
      }
    }, 2500);
  }
}
