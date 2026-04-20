// AutoClerk Background Service Worker — frontend-only mode

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === 'updateBadge') {
    const { errorCount } = message;
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse({ success: true }); return true; }

    chrome.action.setBadgeText({
      text: errorCount > 0 ? String(errorCount) : '',
      tabId
    });
    chrome.action.setBadgeBackgroundColor({
      color: errorCount > 0 ? '#EF4444' : '#10B981',
      tabId
    });
    sendResponse({ success: true });
  }

  return true;
});

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

// =============================================
// Supabase Backend Integration
// =============================================
const SUPABASE_URL = 'https://vuvrhlvfvcfkxhsqqxik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1dnJobHZmdmNma3hoc3FxeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyOTYzMTgsImV4cCI6MjA5MDg3MjMxOH0.DCS9215sS1uF7bitZuqokYEXt-R8bVKswEJ-_votOVI';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveToSupabase') {
    (async () => {
      try {
        const { errors, studentId, checkNumber, section, accessToken } = message.payload;
        
        if (!errors || errors.length === 0) {
          return sendResponse({ success: true });
        }

        const rows = errors.map(err => ({
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
            'Authorization': `Bearer ${accessToken}`, // Use the user's token!
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
    return true; // Keep message channel open for async
  }
});
// =============================================

// Clear badge when tab navigates away from MAHADBT
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    if (!tab.url || !tab.url.includes('mahadbt.maharashtra.gov.in')) {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});
