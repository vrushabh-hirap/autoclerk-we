// content/dom-parser.js
// MAHADBT form DOM parser — intelligently extracts field values

class MAHADBTFormParser {
  constructor() {
    this.formData = {};
  }

  /**
   * Parse all relevant form fields on the current page
   */
  parseAll() {
    this.formData = {};

    this._parseInputs();
    this._parseSelects();
    this._parseTextareas();
    this._parseRadioButtons();
    this._parseCheckboxes();
    this._parseFileInputs();

    return this.formData;
  }

  /**
   * Get a concise snapshot of the form (for logging)
   */
  getSnapshot() {
    const snapshot = {};
    for (const [key, value] of Object.entries(this.formData)) {
      // Truncate long values
      if (typeof value === 'string' && value.length > 200) {
        snapshot[key] = value.substring(0, 200) + '...';
      } else {
        snapshot[key] = value;
      }
    }
    return snapshot;
  }

  _parseInputs() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="date"], input[type="hidden"]');
    inputs.forEach(input => {
      const key = this._getFieldKey(input);
      if (key && input.type !== 'hidden') {
        this.formData[key] = input.value.trim();
      }
    });
  }

  _parseSelects() {
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
      const key = this._getFieldKey(select);
      if (key) {
        const selectedOption = select.options[select.selectedIndex];
        // Store both value and text for better detection
        this.formData[key] = selectedOption ? selectedOption.text.trim() : '';
        this.formData[key + '_value'] = select.value;
      }
    });
  }

  _parseTextareas() {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      const key = this._getFieldKey(textarea);
      if (key) {
        this.formData[key] = textarea.value.trim();
      }
    });
  }

  _parseRadioButtons() {
    const radioGroups = {};
    const radios = document.querySelectorAll('input[type="radio"]');

    radios.forEach(radio => {
      const groupName = radio.name || radio.getAttribute('data-name');
      if (!groupName) return;

      if (!radioGroups[groupName]) {
        radioGroups[groupName] = null;
      }

      if (radio.checked) {
        radioGroups[groupName] = radio.value || radio.labels?.[0]?.textContent?.trim() || 'Yes';
      }
    });

    // Add to formData
    Object.assign(this.formData, radioGroups);

    // Also store with common name variants
    for (const [name, value] of Object.entries(radioGroups)) {
      const camel = this._toCamelCase(name);
      this.formData[camel] = value;
    }
  }

  _parseCheckboxes() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const key = this._getFieldKey(checkbox);
      if (key) {
        this.formData[key] = checkbox.checked;
      }
    });
  }

  _parseFileInputs() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(fileInput => {
      const key = this._getFieldKey(fileInput);
      if (key) {
        // Check if file is selected OR if there's an existing upload indicator
        const hasFile = fileInput.files && fileInput.files.length > 0;
        const hasExistingUpload = this._checkExistingUpload(fileInput);
        this.formData[key] = hasFile || hasExistingUpload ? 'uploaded' : '';
      }
    });
  }

  _checkExistingUpload(fileInput) {
    // Look for nearby elements that indicate an existing upload
    const parent = fileInput.closest('tr, div.form-group, div.row, td');
    if (!parent) return false;

    // Check for links, icons, or text indicating upload
    const uploadIndicators = parent.querySelectorAll('a[href*="download"], a[href*="view"], .uploaded, .file-name, img[src*="pdf"], img[src*="doc"]');
    if (uploadIndicators.length > 0) return true;

    // Check for text like "file uploaded" or file names
    const text = parent.textContent.toLowerCase();
    return text.includes('uploaded') || text.includes('.pdf') || text.includes('.jpg') || text.includes('.png');
  }

  _getFieldKey(element) {
    // Priority: name > id > data-field > aria-label > placeholder
    return element.name ||
      element.id ||
      element.getAttribute('data-field') ||
      this._sanitizeKey(element.getAttribute('aria-label')) ||
      this._sanitizeKey(element.getAttribute('placeholder')) ||
      null;
  }

  _sanitizeKey(str) {
    if (!str) return null;
    return str.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }

  _toCamelCase(str) {
    return str
      .replace(/[-_\s]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (_, char) => char.toLowerCase());
  }
}
