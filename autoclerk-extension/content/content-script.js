// content/content-script.js
// AutoClerk Main Entry Point — frontend-only mode with session persistence

class AutoClerkValidator {
  constructor() {
    this.currentSection = this.detectSection();
    this.formData = {};
    this.errors = [];
    this.checkNumber = 1;
    this.parser = null;
    this.uiInjector = null;
    this.debounceTimer = null;
    this.isSaving = false;
    this.scanStartTime = null;
    this.scanTimerId = null;
  }

  async init() {
    console.log('[AutoClerk] Initializing on section:', this.currentSection);

    if (this.currentSection === 'unknown') {
      console.log('[AutoClerk] Unsupported MAHADBT page detected. Skipping validator bootstrap.');
      return;
    }

    this.parser = new MAHADBTFormParser();
    this.uiInjector = new UIInjector();

    // Inject the UI panel
    this.uiInjector.inject();
    this.uiInjector.updateSection(this.getSectionDisplayName());

    // Restore session
    await this.restoreSession();
    
    // Set scanning state immediately for UI sync
    await this.setScanningState();

    // Wire action buttons
    this.attachActionListeners();

    // Start monitoring
    this.startMonitoring();

    // Run first validation after a short delay to ensure DOM is settled
    setTimeout(() => this.runValidation(), 1200);
  }

  async setScanningState() {
    const session = await this.getSession();
    if (!session.sections) session.sections = {};
    session.sections[this.currentSection] = {
      ...(session.sections[this.currentSection] || {}),
      status: 'scanning',
      scanStartedAt: Date.now()
    };
    await this.saveSession(session);
    this.uiInjector.showScanning(0);
  }

  detectSection() {
    const url = window.location.href;
    if (url.includes('UpdateProfile')) return 'personal_information';
    if (url.includes('AddressInformation')) return 'address_information';
    if (url.includes('OtherInfo')) return 'other_information';
    if (url.includes('CurrentQualification')) return 'current_course';
    if (url.includes('EducationDetails')) return 'past_qualification';
    if (url.includes('Hostel')) return 'hostel_details';
    return 'unknown';
  }

  getSectionDisplayName() {
    const names = {
      personal_information: 'Personal Info',
      address_information: 'Address Info',
      other_information: 'Parent/Guardian',
      current_course: 'Current Course',
      past_qualification: 'Past Qualification',
      hostel_details: 'Hostel Details',
      unknown: 'Unknown Section'
    };
    return names[this.currentSection] || this.currentSection;
  }

  getValidatorForSection() {
    switch (this.currentSection) {
      case 'personal_information': return new PersonalInfoValidator();
      case 'address_information': return new AddressInfoValidator();
      case 'other_information': return new ParentInfoValidator();
      case 'current_course': return new CurrentCourseValidator();
      case 'past_qualification': return new PastQualificationValidator();
      case 'hostel_details': return new HostelDetailsValidator();
      default: return null;
    }
  }

  // ===== Session Persistence (chrome.storage.local) =====

  async getSession() {
    return new Promise(resolve => {
      chrome.storage.local.get(['acSession'], result => {
        resolve(result.acSession || { sections: {}, savedChecks: [], checkCounter: 0 });
      });
    });
  }

  async saveSession(session) {
    return new Promise(resolve => {
      chrome.storage.local.set({ acSession: session }, resolve);
    });
  }

  async restoreSession() {
    const session = await this.getSession();
    // Restore check counter
    this.checkNumber = (session.checkCounter || 0) + 1;

    // Restore previous errors for this section if available
    const sectionData = session.sections?.[this.currentSection];
    if (sectionData && sectionData.errors) {
      this.errors = sectionData.errors;
      // Show restored errors in UI
      this.uiInjector.updateStatus(this.errors, sectionData.fieldCount || 0);
      this.uiInjector.updateErrors(this.errors);
    }

    return session;
  }

  async persistSectionState(fieldCount) {
    const session = await this.getSession();
    if (!session.sections) session.sections = {};

    session.sections[this.currentSection] = {
      errors: this.errors,
      fieldCount: fieldCount,
      lastScanned: new Date().toISOString(),
      status: 'finished'
    };

    await this.saveSession(session);

    // Notify badge update
    chrome.runtime.sendMessage({
      action: 'updateBadge',
      errorCount: this.errors.filter(e => e.severity === 'critical').length
    }, () => {
      void chrome.runtime.lastError;
    });
  }

  async saveErrorsLocally() {
    if (this.isSaving) return;
    this.isSaving = true;

    const saveBtn = document.getElementById('ac-save-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      const session = await this.getSession();

      if (this.errors.length === 0) {
        this.uiInjector.showToast('✅ No errors to save — form is clean!', 'success');
        return;
      }

      // Increment counter for local storage
      session.checkCounter = (session.checkCounter || 0) + 1;
      this.checkNumber = session.checkCounter;
      this.uiInjector.updateCheckBadge(this.checkNumber + 1);

      // Build check record for local popup UI
      const check = {
        checkNumber: this.checkNumber,
        section: this.currentSection,
        timestamp: new Date().toISOString(),
        errors: this.errors.map(e => ({
          field: e.field,
          type: e.type,
          severity: e.severity,
          message: e.message
        })),
        totalErrors: this.errors.length
      };

      if (!session.savedChecks) session.savedChecks = [];
      session.savedChecks.push(check);

      if (session.savedChecks.length > 50) {
        session.savedChecks = session.savedChecks.slice(-50);
      }

      await this.saveSession(session);

      // Check for Supabase session to push to cloud
      chrome.storage.local.get(['sbSession', 'accessToken', 'userId'], (result) => {
        const sbSession = result.sbSession;
        const accessToken = result.accessToken || sbSession?.access_token || sbSession?.session?.access_token;
        const user = sbSession?.user || sbSession?.session?.user || (result.userId ? { id: result.userId } : null);

        if (accessToken && user && user.id) {
          // Push to background script for securely hitting Supabase
          chrome.runtime.sendMessage({
            action: 'saveToSupabase',
            payload: {
              errors: this.errors,
              studentId: user.id, // Tie logs to authenticated user ID
              checkNumber: this.checkNumber,
              section: this.currentSection,
              accessToken: accessToken
            }
          }, (response) => {
            if (chrome.runtime.lastError || !response?.success) {
              console.error('[AutoClerk] Cloud sync failed:', chrome.runtime.lastError || response?.error);
              this.uiInjector.showToast(`💾 Saved locally (Cloud sync failed)`, 'warning');
            } else {
              this.uiInjector.showToast(`☁️ Synced ${this.errors.length} errors to cloud!`, 'success');
            }
          });
        } else {
          this.uiInjector.showToast(`💾 Saved ${this.errors.length} errors locally`, 'success');
        }
      });

    } finally {
      this.isSaving = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Errors`;
      }
    }
  }

  // ===== Monitoring =====

  startMonitoring() {
    this.attachFieldListeners();

    // Watch for dynamically loaded fields (MAHADBT uses AJAX heavily)
    const observer = new MutationObserver((mutations) => {
      let hasNewInputs = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && (
            node.tagName === 'INPUT' || node.tagName === 'SELECT' || node.tagName === 'TEXTAREA' ||
            node.querySelector?.('input, select, textarea')
          )) {
            hasNewInputs = true;
            break;
          }
        }
        if (hasNewInputs) break;
      }
      if (hasNewInputs) {
        this.attachFieldListeners();
        this.debounceValidate();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  attachFieldListeners() {
    const inputs = document.querySelectorAll(
      'input:not([data-ac-attached]), select:not([data-ac-attached]), textarea:not([data-ac-attached])'
    );
    inputs.forEach(input => {
      if (input.closest('#autoclerk-validation-panel')) return;
      input.setAttribute('data-ac-attached', 'true');
      input.addEventListener('blur', () => this.debounceValidate(400));
      input.addEventListener('change', () => this.debounceValidate(500));
    });
  }

  debounceValidate(delay = 600) {
    clearTimeout(this.debounceTimer);
    clearInterval(this.scanTimerId);

    this.scanStartTime = Date.now();
    const fieldCount = document.querySelectorAll('input, select, textarea').length;
    this.uiInjector.showScanning(fieldCount);

    // Dynamic timer update in UI
    this.scanTimerId = setInterval(() => {
      const elapsed = ((Date.now() - this.scanStartTime) / 1000).toFixed(1);
      this.uiInjector.updateScanLabel(`Scanning... (${elapsed}s)`);

      // Auto-timeout after 6 seconds
      if (parseFloat(elapsed) > 6) {
        console.warn('[AutoClerk] Scan timed out, forcing completion');
        this.runValidation();
      }
    }, 100);

    this.debounceTimer = setTimeout(() => this.runValidation(), delay);

    // Update session to 'scanning'
    this.getSession().then(session => {
      if (!session.sections) session.sections = {};
      if (!session.sections[this.currentSection]) session.sections[this.currentSection] = {};
      session.sections[this.currentSection].status = 'scanning';
      session.sections[this.currentSection].scanStartedAt = Date.now();
      this.saveSession(session);
    });
  }

  // ===== Validation =====

  runValidation() {
    // Clear timer
    clearInterval(this.scanTimerId);

    const validator = this.getValidatorForSection();

    // Count all form fields (excluding our own panel)
    const allFields = document.querySelectorAll(
      'input:not(#autoclerk-validation-panel *), select:not(#autoclerk-validation-panel *), textarea:not(#autoclerk-validation-panel *)'
    );
    const fieldCount = allFields.length;

    if (!validator) {
      this.uiInjector.showScanDone(fieldCount, 0);
      this.uiInjector.showToast('Section not recognized — validation skipped', 'warning');
      this.persistSectionState(fieldCount); // Always finish scan
      return;
    }

    try {
      // Parse form state
      this.formData = this.parser.parseAll();

      // Run validator rules
      this.errors = validator.validate(this.formData);

      // Update panel
      this.uiInjector.updateStatus(this.errors, fieldCount);
      this.uiInjector.updateErrors(this.errors);
    } catch (err) {
      console.error('[AutoClerk] Validation error:', err);
    } finally {
      // Persist state to storage (so popup can read live stats)
      this.persistSectionState(fieldCount);
      console.log(`[AutoClerk] Scan complete: ${fieldCount} fields, ${this.errors.length} issues`);
    }
  }

  // ===== Action Listeners =====

  attachActionListeners() {
    // Listen for messages from popup buttons
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'forceUpdate') {
        this.debounceValidate(100);
        sendResponse({ success: true });
      } else if (message.action === 'triggerSave') {
        this.saveErrorsLocally();
        sendResponse({ success: true });
      }
      // Note: Do not `return true` here indiscriminately, or it interferes with other listeners
    });

    // Re-validate button (in-page UI)
    const validateBtn = document.getElementById('ac-validate-btn');
    if (validateBtn) {
      validateBtn.addEventListener('click', () => {
        this.debounceValidate(100);
      });
    }

    // Save errors locally
    const saveBtn = document.getElementById('ac-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        await this.saveErrorsLocally();
      });
    }

    // Collapse all
    const collapseBtn = document.getElementById('ac-collapse-all');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        document.querySelectorAll('.ac-error-group:not(.collapsed)')
          .forEach(g => g.classList.add('collapsed'));
      });
    }
  }
}

// --- Bootstrap ---
(async function bootstrap() {
  try {
    if (window !== window.top) return;
    if (window.__autoclerkInitialized) return;
    window.__autoclerkInitialized = true;

    console.log('[AutoClerk] Content script loaded, waiting for DOM...');
    
    // Wait for document to be ready if it isn't
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    const validator = new AutoClerkValidator();
    await validator.init();
    console.log('[AutoClerk] Validator initialized successfully');
  } catch (err) {
    console.error('[AutoClerk] CRITICAL BOOTSTRAP FAILURE:', err);
    // Optional: Inject an error banner if the UI panel failed to load
    const banner = document.createElement('div');
    banner.style = 'position:fixed;top:0;left:0;right:0;background:#ef4444;color:white;padding:8px;z-index:999999;text-align:center;font-weight:bold;font-size:12px;';
    banner.textContent = `AutoClerk Error: ${err?.message || err}`;
    if (document.body) {
      document.body.prepend(banner);
    }
  }
})();
