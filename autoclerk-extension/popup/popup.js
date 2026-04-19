// popup/popup.js — AutoClerk Popup Controller

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
  
  // Listen for storage changes for real-time updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.acSession) {
      checkCurrentTab();
      loadErrorLog();
    }
  });

  // Initial load
  await checkCurrentTab();
  await loadErrorLog();
  setupActionButtons();

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

    // Load live session stats
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

  // Animate progress bar
  const progressPct = fieldCount > 0 ? Math.max(10, Math.round(((fieldCount - errors.length) / fieldCount) * 100)) : 30;
  const fillEl = document.getElementById('scan-progress-fill');
  if (fillEl) {
    fillEl.style.width = `${progressPct}%`;
    fillEl.style.background = critical > 0 ? '#ef4444' : warning > 0 ? '#f59e0b' : '#10b981';
  }

  // Handle label
  updateTimerUI(sectionData);

  const fieldCountEl = document.getElementById('scan-field-count');
  if (fieldCountEl) fieldCountEl.textContent = `${fieldCount} fields`;

  // Update header pill
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
          isActive ? '' : dotClass = 'dot-error'; // Keep error dot
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
  const checks = session.savedChecks || [];

  if (checks.length === 0) {
    emptyState.style.display = 'flex';
    logList.querySelectorAll('.check-card').forEach(c => c.remove());
    return;
  }

  emptyState.style.display = 'none';
  
  // Render cards
  const cardsHtml = checks.slice().reverse().map(check => {
    const time = new Date(check.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const errorsListHtml = check.errors.slice(0, 3).map(err => `
      <div class="check-error-row">
        <div class="check-error-dot dot-${err.severity}"></div>
        <span class="check-error-field">${err.field}:</span>
        <span class="check-error-msg">${err.message}</span>
      </div>
    `).join('');

    const moreCount = check.errors.length - 3;
    const statusBadge = check.totalErrors > 0 ? 'ERRORS' : 'CLEAN';
    const statusClass = check.totalErrors > 0 ? 'status-error' : 'status-success';

    return `
      <div class="check-card">
        <div class="check-card-header">
          <div class="check-card-left">
            <span class="check-number">#${check.checkNumber}</span>
            <div>
              <div class="check-section">${check.section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
              <div class="check-time">${time}</div>
            </div>
          </div>
          <span class="check-status-badge ${statusClass}">${statusBadge}</span>
        </div>
        <div class="check-errors-list">
          ${errorsListHtml}
          ${moreCount > 0 ? `<div class="check-more">+ ${moreCount} more issues</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  logList.innerHTML = cardsHtml;
}

// ===== Action Buttons =====

function setupActionButtons() {
  // "Re-validate" button — navigate to MAHADBT profile
  document.getElementById('btn-go-to-profile')?.addEventListener('click', () => {
    window.open(MAHADBT_BASE + 'UpdateProfile/UpdateProfile', '_blank');
  });

  // "Save Errors" button (btn-clear-session in DOM) — clear session and restart
  document.getElementById('btn-clear-session')?.addEventListener('click', () => {
    if (confirm('Clear all session data and history?')) {
      chrome.storage.local.set({
        acSession: { sections: {}, savedChecks: [], checkCounter: 0 }
      }, () => {
        checkCurrentTab();
        loadErrorLog();
      });
    }
  });

  document.getElementById('btn-clear-log')?.addEventListener('click', () => {
    getSession().then(session => {
      session.savedChecks = [];
      chrome.storage.local.set({ acSession: session }, () => {
        loadErrorLog();
      });
    });
  });
}

// ===== Storage Helpers =====

async function getSession() {
  return new Promise(resolve => {
    chrome.storage.local.get(['acSession'], result => {
      resolve(result.acSession || { sections: {}, savedChecks: [], checkCounter: 0 });
    });
  });
}
