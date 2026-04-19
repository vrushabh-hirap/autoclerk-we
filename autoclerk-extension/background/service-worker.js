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
// TODO: Supabase Backend Integration
// =============================================
// When you are ready to connect to Supabase for cross-device persistence:
//
// 1. Create a Supabase project at https://supabase.com
// 2. Run the SQL schema in database-schema.sql in your Supabase SQL Editor
// 3. Add your Project URL and Anon Key below (or retrieve from storage):
//
//    const SUPABASE_URL = 'https://xxxx.supabase.co';
//    const SUPABASE_ANON_KEY = 'eyJhbGciOiJ...';
//
// 4. In content-script.js -> saveErrorsLocally(), add a call to:
//    await syncToSupabase(check, SUPABASE_URL, SUPABASE_ANON_KEY);
//
// 5. The SupabaseExtClient class in api/supabase-client.js is ready to use.
// =============================================

// Clear badge when tab navigates away from MAHADBT
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    if (!tab.url || !tab.url.includes('mahadbt.maharashtra.gov.in')) {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});
