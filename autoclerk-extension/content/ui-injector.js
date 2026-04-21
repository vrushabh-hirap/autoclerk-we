// content/ui-injector.js
// Manages injection and updates of the AutoClerk validation panel (frontend-only mode)

class UIInjector {
  constructor() {
    this.panel = null;
    this.isMinimized = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this._scannerInterval = null;
  }

  inject() {
    const existing = document.getElementById('autoclerk-validation-panel');
    if (existing) existing.remove();

    this.panel = document.createElement('div');
    this.panel.id = 'autoclerk-validation-panel';
    this.panel.setAttribute('role', 'complementary');
    this.panel.setAttribute('aria-label', 'AutoClerk Validation Panel');

    this.panel.innerHTML = `
      <div class="ac-header" id="ac-drag-handle">
        <div class="ac-header-left">
          <div class="ac-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#D4A800" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="ac-title-group">
            <span class="ac-title">AutoClerk</span>
            <span class="ac-subtitle" id="ac-section-name">Loading...</span>
          </div>
        </div>
        <div class="ac-header-actions">
          <button class="ac-icon-btn" id="ac-minimize-btn" title="Minimize" aria-label="Minimize panel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="ac-body" id="ac-body">

        <!-- Scanner Activity Bar -->
        <div class="ac-scanner-bar" id="ac-scanner-bar">
          <div class="ac-scanner-left">
            <div class="ac-scanner-pulse">
              <div class="ac-scanner-dot"></div>
            </div>
            <span class="ac-scanner-label" id="ac-scanner-label">Scanning fields...</span>
          </div>
          <div class="ac-scanner-right">
            <span class="ac-scanner-fields" id="ac-scanner-fields">0 fields</span>
            <div class="ac-spinner" id="ac-spinner"></div>
          </div>
        </div>

        <!-- Scan Progress Bar -->
        <div class="ac-scan-track">
          <div class="ac-scan-fill" id="ac-scan-fill"></div>
        </div>

        <!-- Status Banner -->
        <div class="ac-status-banner" id="ac-status-banner">
          <div class="ac-status-icon" id="ac-status-icon">⏳</div>
          <div class="ac-status-info">
            <div class="ac-status-text" id="ac-status-text">Scanning form...</div>
            <div class="ac-status-sub" id="ac-status-sub">Please wait</div>
          </div>
          <div class="ac-check-badge" id="ac-check-badge">#1</div>
        </div>

        <!-- Error Summary Pills -->
        <div class="ac-pills" id="ac-pills">
          <div class="ac-pill ac-pill-critical">
            <span class="ac-pill-count" id="ac-count-critical">0</span>
            <span class="ac-pill-label">Critical</span>
          </div>
          <div class="ac-pill ac-pill-warning">
            <span class="ac-pill-count" id="ac-count-warning">0</span>
            <span class="ac-pill-label">Warnings</span>
          </div>
          <div class="ac-pill ac-pill-info">
            <span class="ac-pill-count" id="ac-count-info">0</span>
            <span class="ac-pill-label">Info</span>
          </div>
        </div>

        <!-- Error List -->
        <div class="ac-errors-container" id="ac-errors-container">
          <div class="ac-errors-header">
            <span>Issues Found</span>
            <button class="ac-text-btn" id="ac-collapse-all">Collapse All</button>
          </div>
          <div class="ac-errors-list" id="ac-errors-list">
            <div class="ac-empty-state">
              <div class="ac-empty-icon">🔍</div>
              <div class="ac-empty-text">Scanning form fields...</div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="ac-actions">
          <button class="ac-btn ac-btn-secondary" id="ac-validate-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Re-validate
          </button>
          <button class="ac-btn ac-btn-primary" id="ac-save-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save Errors
          </button>
        </div>
      </div>

      <!-- Notification Toast -->
      <div class="ac-toast" id="ac-toast"></div>
    `;

    document.body.appendChild(this.panel);
    this._attachDragListeners();
    this._attachMinimizeListener();
    return this.panel;
  }

  updateSection(sectionDisplayName) {
    const el = document.getElementById('ac-section-name');
    if (el) el.textContent = sectionDisplayName;
  }

  updateScanLabel(text) {
    const label = document.getElementById('ac-scanner-label');
    if (label) label.textContent = text;
  }

  // Show animated scanning state
  showScanning(fieldCount = 0) {
    const labelEl = document.getElementById('ac-scanner-label');
    const fieldsEl = document.getElementById('ac-scanner-fields');
    const spinner = document.getElementById('ac-spinner');
    const fill = document.getElementById('ac-scan-fill');

    if (labelEl) {
      labelEl.textContent = 'Scanning fields...';
      labelEl.style.color = 'var(--ac-text)';
    }
    if (fieldsEl) fieldsEl.textContent = `${fieldCount} fields`;
    if (spinner) spinner.classList.add('ac-spinning');

    const pulseDot = document.querySelector('.ac-scanner-pulse');
    if (pulseDot) pulseDot.style.display = 'block';

    if (fill) {
      fill.style.width = '0%';
      fill.classList.add('ac-fill-scanning');
    }

    // Animate progress fill sliding across
    let progress = 0;
    clearInterval(this._scannerInterval);
    this._scannerInterval = setInterval(() => {
      progress = (progress + 3) % 100;
      if (fill) fill.style.width = `${progress}%`;
    }, 40);
  }

  // Show done scanning state
  showScanDone(fieldCount = 0, errorCount = 0) {
    clearInterval(this._scannerInterval);
    const labelEl = document.getElementById('ac-scanner-label');
    const fieldsEl = document.getElementById('ac-scanner-fields');
    const spinner = document.getElementById('ac-spinner');
    const fill = document.getElementById('ac-scan-fill');
    const bar = document.getElementById('ac-scanner-bar');

    if (labelEl) {
      if (errorCount === 0) {
        labelEl.textContent = 'Scan Complete: All clear';
        labelEl.style.color = '#10b981';
      } else {
        labelEl.textContent = `Scan Complete: ${errorCount} issue${errorCount > 1 ? 's' : ''}`;
        labelEl.style.color = '#ef4444';
      }
    }
    if (fieldsEl) fieldsEl.textContent = `${fieldCount} fields`;
    if (spinner) spinner.classList.remove('ac-spinning');

    // Hide pulse dot when scanning is done
    const pulseDot = document.querySelector('.ac-scanner-pulse');
    if (pulseDot) pulseDot.style.display = 'none';

    if (bar) bar.className = `ac-scanner-bar ${errorCount === 0 ? 'ac-scanner-success' : 'ac-scanner-error'}`;
    if (fill) {
      fill.classList.remove('ac-fill-scanning');
      const pct = fieldCount > 0 ? Math.round(Math.max(10, ((fieldCount - errorCount) / fieldCount) * 100)) : 100;
      fill.style.width = `${pct}%`;
      fill.style.background = errorCount === 0 ? '#10b981' : '#ef4444';
      fill.style.transition = 'width 0.5s ease, background 0.3s';
    }
  }

  updateStatus(errors, fieldCount = 0) {
    const critical = errors.filter(e => e.severity === 'critical');
    const warnings = errors.filter(e => e.severity === 'warning');
    const infos = errors.filter(e => e.severity === 'info');

    const icon = document.getElementById('ac-status-icon');
    const text = document.getElementById('ac-status-text');
    const sub = document.getElementById('ac-status-sub');
    const banner = document.getElementById('ac-status-banner');
    const countCritical = document.getElementById('ac-count-critical');
    const countWarning = document.getElementById('ac-count-warning');
    const countInfo = document.getElementById('ac-count-info');

    if (countCritical) countCritical.textContent = String(critical.length);
    if (countWarning) countWarning.textContent = String(warnings.length);
    if (countInfo) countInfo.textContent = String(infos.length);

    if (icon && text && sub && banner) {
      if (errors.length === 0) {
        icon.textContent = '✅';
        text.textContent = 'All checks passed!';
        sub.textContent = `${fieldCount} fields validated — form looks good`;
        banner.className = 'ac-status-banner ac-status-success';
      } else if (critical.length > 0) {
        icon.textContent = '❌';
        text.textContent = `${critical.length} critical issue${critical.length > 1 ? 's' : ''} found`;
        sub.textContent = 'Fix these before submitting';
        banner.className = 'ac-status-banner ac-status-error';
      } else {
        icon.textContent = '⚠️';
        text.textContent = `${warnings.length} warning${warnings.length > 1 ? 's' : ''} found`;
        sub.textContent = 'Review before submitting';
        banner.className = 'ac-status-banner ac-status-warning';
      }
    }

    // Update scanner done state
    this.showScanDone(fieldCount, errors.length);
  }

  updateErrors(errors) {
    const list = document.getElementById('ac-errors-list');
    if (!list) return;

    if (errors.length === 0) {
      list.innerHTML = `
        <div class="ac-success-state">
          <div class="ac-success-icon">🎉</div>
          <div class="ac-success-title">No issues found!</div>
          <div class="ac-success-text">All required fields are properly filled</div>
        </div>`;
      return;
    }

    const grouped = this._groupByType(errors);
    list.innerHTML = Object.entries(grouped).map(([type, errs]) => `
      <div class="ac-error-group" data-type="${type}">
        <div class="ac-error-group-header" onclick="this.parentElement.classList.toggle('collapsed')">
          <span class="ac-group-icon">${this._getTypeIcon(type)}</span>
          <span class="ac-group-label">${this._getTypeLabel(type)}</span>
          <span class="ac-group-count">${errs.length}</span>
          <span class="ac-group-chevron">▾</span>
        </div>
        <div class="ac-error-group-body">
          ${errs.map(err => `
            <div class="ac-error-item severity-${err.severity}">
              <div class="ac-error-field">${err.field}</div>
              <div class="ac-error-msg">${err.message}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  updateCheckBadge(checkNumber) {
    const badge = document.getElementById('ac-check-badge');
    if (badge) badge.textContent = `#${checkNumber}`;
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('ac-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `ac-toast ac-toast-${type} ac-toast-show`;
    setTimeout(() => toast.classList.remove('ac-toast-show'), 3500);
  }

  showFieldError(input, errorMessage) {
    input.classList.add('ac-field-error');
    let errorEl = input.parentElement?.querySelector('.ac-inline-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'ac-inline-error';
      input.parentElement?.appendChild(errorEl);
    }
    errorEl.textContent = `⚠️ ${errorMessage}`;
    errorEl.style.display = 'block';
  }

  clearFieldError(input) {
    input.classList.remove('ac-field-error');
    const errorEl = input.parentElement?.querySelector('.ac-inline-error');
    if (errorEl) errorEl.style.display = 'none';
  }

  // --- Private ---

  _attachDragListeners() {
    const handle = document.getElementById('ac-drag-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      this.isDragging = true;
      const rect = this.panel.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      this.panel.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      this.panel.style.right = 'auto';
      this.panel.style.left = `${Math.max(0, x)}px`;
      this.panel.style.top = `${Math.max(0, y)}px`;
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.panel.style.transition = '';
    });
  }

  _attachMinimizeListener() {
    const btn = document.getElementById('ac-minimize-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      this.panel.classList.toggle('ac-minimized', this.isMinimized);
      const svg = btn.querySelector('svg');
      if (svg) svg.style.transform = this.isMinimized ? 'rotate(180deg)' : '';
    });
  }

  _groupByType(errors) {
    const groups = {};
    for (const err of errors) {
      if (!groups[err.type]) groups[err.type] = [];
      groups[err.type].push(err);
    }
    return groups;
  }

  _getTypeIcon(type) {
    const icons = {
      'MISSING_FIELD': '❌', 'INVALID_FORMAT': '⚠️', 'CATEGORY_MISMATCH': '🚫',
      'MISSING_DOCUMENT': '📄', 'DATA_INCONSISTENCY': '⚡', 'RECOMMENDATION': 'ℹ️'
    };
    return icons[type] || '⚠️';
  }

  _getTypeLabel(type) {
    const labels = {
      'MISSING_FIELD': 'Missing Fields', 'INVALID_FORMAT': 'Invalid Format',
      'CATEGORY_MISMATCH': 'Category Mismatch', 'MISSING_DOCUMENT': 'Missing Documents',
      'DATA_INCONSISTENCY': 'Data Inconsistency', 'RECOMMENDATION': 'Recommendations'
    };
    return labels[type] || type;
  }
}
