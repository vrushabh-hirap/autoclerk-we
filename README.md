# AutoClerk Web Extension (autoclerk-we)

## Overview

AutoClerk Web Extension is a real-time validation engine that integrates directly with the MAHADBT portal to provide instant feedback on scholarship application data. It acts as an intelligent validation layer, catching errors before submission and reducing the revert cycle significantly.

## Purpose

- **Real-time validation** of scholarship application data on MAHADBT portal
- **Instant error detection** for missing documents, format issues, and data inconsistencies
- **Structured error logging** to centralized AutoClerk backend
- **Immediate student feedback** to prevent form submission with errors
- **Proactive approach** to scholarship verification

## Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│              MAHADBT Portal (User Browser)          │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │  AutoClerk Extension  │
         │  ┌─────────────────┐  │
         │  │ Content Script  │  │ ← Injected into MAHADBT pages
         │  └────────┬────────┘  │
         │           │            │
         │  ┌────────▼────────┐  │
         │  │ Validation      │  │ ← Rule engine
         │  │ Engine          │  │
         │  └────────┬────────┘  │
         │           │            │
         │  ┌────────▼────────┐  │
         │  │ API Client      │  │ ← Communicates with backend
         │  └────────┬────────┘  │
         └───────────┼───────────┘
                     │
         ┌───────────▼───────────┐
         │  Supabase Backend     │
         │  (AutoClerk Platform) │
         └───────────────────────┘
```

## Technology Stack

- **Language**: JavaScript (ES6+)
- **Build Tool**: Webpack / Vite
- **Extension Framework**: Chrome Extension Manifest V3
- **HTTP Client**: Fetch API / Axios
- **Storage**: Chrome Storage API (sync & local)
- **Backend Communication**: REST API to Supabase

## Project Structure

```
autoclerk-we/
├── manifest.json                 # Extension manifest (V3)
├── src/
│   ├── background/
│   │   └── service-worker.js    # Background service worker
│   ├── content/
│   │   ├── content-script.js    # Main content script injected into MAHADBT
│   │   ├── dom-parser.js        # Parse MAHADBT form fields
│   │   └── ui-injector.js       # Inject validation UI elements
│   ├── validation/
│   │   ├── rules/
│   │   │   ├── document-rules.js      # Document validation rules
│   │   │   ├── field-rules.js         # Form field validation rules
│   │   │   ├── category-rules.js      # Category-specific rules
│   │   │   └── income-rules.js        # Income-related validation
│   │   ├── validator.js         # Main validation orchestrator
│   │   └── error-formatter.js   # Format validation errors
│   ├── api/
│   │   ├── supabase-client.js   # Supabase API client
│   │   ├── error-logger.js      # Log errors to backend
│   │   └── student-sync.js      # Sync student data
│   ├── ui/
│   │   ├── notification.js      # Show validation notifications
│   │   ├── error-panel.js       # Error details panel
│   │   └── styles.css           # Injected styles
│   ├── utils/
│   │   ├── storage.js           # Chrome storage utilities
│   │   ├── config.js            # Configuration management
│   │   └── logger.js            # Console logging utility
│   └── popup/
│       ├── popup.html           # Extension popup UI
│       ├── popup.js             # Popup logic
│       └── popup.css            # Popup styles
├── assets/
│   ├── icons/                   # Extension icons (16, 48, 128)
│   └── images/
├── tests/
│   ├── validation.test.js
│   └── api.test.js
├── docs/
│   ├── VALIDATION_RULES.md      # Detailed validation rules
│   ├── API_INTEGRATION.md       # Backend API documentation
│   └── DEPLOYMENT.md            # Deployment instructions
├── .env.example                 # Environment variables template
├── webpack.config.js            # Webpack configuration
├── package.json
└── README.md
```

## Core Functionality

### 1. Content Script Injection

The content script is automatically injected into MAHADBT portal pages when students fill out scholarship forms.

**Key Responsibilities:**
- Detect MAHADBT form pages
- Parse form structure and extract field data
- Monitor form changes in real-time
- Trigger validation on field blur/change events
- Display validation results inline

**Implementation Pattern:**
```javascript
// content-script.js
class MAHADBTMonitor {
  constructor() {
    this.formData = {};
    this.validationResults = {};
  }

  init() {
    this.detectFormFields();
    this.attachListeners();
    this.loadStudentProfile();
  }

  detectFormFields() {
    // Parse MAHADBT form structure
    // Map fields to AutoClerk schema
  }

  attachListeners() {
    // Add event listeners to form fields
    // Trigger validation on change
  }

  async validateField(fieldName, value) {
    // Send to validation engine
    // Display results
  }
}
```

### 2. Validation Engine

The validation engine applies comprehensive rules to ensure data quality before submission.

**Validation Categories:**

#### A. Document Validation
- **Missing Documents**: Check if all required documents are uploaded
- **File Format**: Validate PDF/JPG/PNG formats
- **File Size**: Ensure files are within limits (max 2MB per document)
- **Document Clarity**: Flag low-resolution or corrupted files

#### B. Field Validation
- **Required Fields**: Ensure all mandatory fields are filled
- **Data Format**: Validate email, phone, Aadhar, PAN formats
- **Date Consistency**: Check birth dates, academic year dates
- **Name Matching**: Cross-verify name across documents

#### C. Category-Specific Rules
- **Income Validation**: Check income certificates match category limits
- **Caste Certificate**: Validate for reserved category applicants
- **Domicile**: Verify Maharashtra domicile for applicable schemes
- **Disability Certificate**: Required for PwD category

#### D. Scheme Eligibility
- **Category Match**: Ensure student category matches scheme requirements
- **Income Limits**: Verify annual income within scheme bounds
- **Academic Performance**: Check CGPA/percentage requirements
- **Previous Scholarship**: Detect duplicate applications

**Validation Rule Structure:**
```javascript
// validation/rules/field-rules.js
const fieldRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Invalid email format"
  },
  aadhar: {
    required: true,
    pattern: /^\d{12}$/,
    message: "Aadhar must be 12 digits"
  },
  income: {
    required: true,
    validate: (value, category) => {
      const limits = {
        'EWS': 800000,
        'OBC': 800000,
        'SC/ST': 250000
      };
      return value <= limits[category];
    },
    message: "Income exceeds category limit"
  }
};
```

### 3. Error Logging System

All validation errors are logged to the backend for analysis and tracking.

**Error Log Structure:**
```javascript
{
  student_id: "uuid",
  check_number: 1,  // Validation attempt number
  error_type: "missing_document | invalid_format | field_error | eligibility_mismatch",
  field_name: "income_certificate",
  error_description: "Income certificate not uploaded",
  severity: "critical | warning | info",
  timestamp: "ISO 8601",
  form_snapshot: { /* partial form data */ }
}
```

### 4. Real-time Feedback UI

The extension injects custom UI elements to show validation status.

**UI Components:**
- **Field-level indicators**: Green checkmark / Red X next to each field
- **Error panel**: Collapsible sidebar with all errors listed
- **Progress tracker**: Show validation completion percentage
- **Submit blocker**: Prevent form submission if critical errors exist

**UI Injection Example:**
```javascript
// ui/error-panel.js
class ErrorPanel {
  constructor() {
    this.errors = [];
    this.panel = null;
  }

  inject() {
    const panel = document.createElement('div');
    panel.id = 'autoclerk-error-panel';
    panel.className = 'autoclerk-panel';
    panel.innerHTML = this.renderTemplate();
    document.body.appendChild(panel);
  }

  updateErrors(errors) {
    this.errors = errors;
    this.render();
  }

  renderTemplate() {
    return `
      <div class="panel-header">
        <h3>Validation Results</h3>
        <span class="error-count">${this.errors.length} issues</span>
      </div>
      <div class="panel-body">
        ${this.errors.map(e => this.renderError(e)).join('')}
      </div>
    `;
  }
}
```

## API Integration

### Backend Endpoints

```javascript
// api/supabase-client.js
const API_ENDPOINTS = {
  // Student sync
  GET_STUDENT: '/students/:id',
  UPDATE_STUDENT: '/students/:id',
  
  // Error logging
  LOG_ERROR: '/error_logs',
  GET_ERROR_HISTORY: '/error_logs/student/:id',
  
  // Document validation
  VALIDATE_DOCUMENT: '/documents/validate',
  UPLOAD_DOCUMENT: '/documents/upload',
  
  // Scheme eligibility
  CHECK_ELIGIBILITY: '/schemes/check-eligibility',
  GET_APPLICABLE_SCHEMES: '/schemes/applicable/:category'
};
```

### Authentication

The extension authenticates students using their AutoClerk platform credentials.

```javascript
// api/supabase-client.js
class SupabaseClient {
  constructor() {
    this.apiUrl = process.env.SUPABASE_URL;
    this.anonKey = process.env.SUPABASE_ANON_KEY;
    this.authToken = null;
  }

  async authenticate(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (data?.session) {
      this.authToken = data.session.access_token;
      await this.storeToken(this.authToken);
    }
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.anonKey,
      'Authorization': `Bearer ${this.authToken}`
    };

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    return response.json();
  }
}
```

## Configuration

### Environment Variables

Create `.env` file in the root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Extension Configuration
EXTENSION_ID=autoclerk-extension
VERSION=1.0.0
ENVIRONMENT=development

# Feature Flags
ENABLE_OCR_VALIDATION=false
ENABLE_PREDICTIVE_ERRORS=false
ENABLE_OFFLINE_MODE=true

# Validation Settings
MAX_FILE_SIZE_MB=2
SUPPORTED_FORMATS=pdf,jpg,jpeg,png
VALIDATION_DEBOUNCE_MS=500
```

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "AutoClerk - Scholarship Verification Assistant",
  "version": "1.0.0",
  "description": "Real-time validation for MAHADBT scholarship applications",
  "permissions": [
    "storage",
    "activeTab",
    "notifications"
  ],
  "host_permissions": [
    "https://mahadbt.maharashtra.gov.in/*",
    "https://your-project.supabase.co/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["https://mahadbt.maharashtra.gov.in/*"],
      "js": ["content/content-script.js"],
      "css": ["ui/styles.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

## Development Guidelines

### Code Standards

1. **ES6+ JavaScript**: Use modern JavaScript features
2. **Modular Architecture**: Keep files focused and small
3. **Error Handling**: Always wrap async calls in try-catch
4. **Logging**: Use structured logging for debugging
5. **Comments**: Document complex validation logic

### Naming Conventions

- **Files**: kebab-case (e.g., `validation-engine.js`)
- **Classes**: PascalCase (e.g., `ValidationEngine`)
- **Functions**: camelCase (e.g., `validateField`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

### Testing Strategy

```javascript
// tests/validation.test.js
describe('Document Validation', () => {
  test('should detect missing income certificate', () => {
    const formData = {
      category: 'EWS',
      documents: {
        aadhar: 'uploaded',
        photo: 'uploaded'
        // income_certificate missing
      }
    };
    
    const errors = validator.validate(formData);
    expect(errors).toContainEqual({
      field: 'income_certificate',
      type: 'missing_document',
      severity: 'critical'
    });
  });
});
```

## Installation & Setup

### For Developers

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/autoclerk-we.git
   cd autoclerk-we
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Build the extension**
   ```bash
   npm run build
   ```

5. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### For Students (End Users)

1. **Download from Chrome Web Store** (after publishing)
2. **Click "Add to Chrome"**
3. **Log in** with AutoClerk platform credentials
4. **Navigate to MAHADBT portal** and start filling the form
5. **See real-time validation** as you type

## Deployment

### Build for Production

```bash
npm run build:prod
```

### Publish to Chrome Web Store

1. Create a ZIP of the `dist` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the ZIP file
4. Fill in store listing details
5. Submit for review

### Version Management

Follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes

## Monitoring & Analytics

### Error Tracking

Log extension errors to backend for analysis:

```javascript
// utils/logger.js
class ErrorTracker {
  static async logError(error, context) {
    await api.post('/extension_errors', {
      error_message: error.message,
      stack_trace: error.stack,
      context: context,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent
    });
  }
}
```

### Usage Metrics

Track validation effectiveness:

- Total validations performed
- Error detection rate
- Most common errors
- Time to fix errors
- Submission success rate after validation

## Security Considerations

1. **No Sensitive Data Storage**: Never store passwords or tokens in localStorage
2. **HTTPS Only**: All API calls must use HTTPS
3. **Token Expiry**: Implement token refresh mechanism
4. **Input Sanitization**: Sanitize all form data before validation
5. **CSP Compliance**: Follow Content Security Policy rules

## Troubleshooting

### Common Issues

**Extension not loading on MAHADBT**
- Check host_permissions in manifest.json
- Verify MAHADBT URL pattern matches

**API calls failing**
- Check CORS settings in Supabase
- Verify authentication token is valid
- Check network connectivity

**Validation not triggering**
- Ensure content script is injected (check DevTools)
- Verify form field selectors are correct
- Check for JavaScript errors in console

## Agent Instructions

### For AI Coding Agents

When working with this repository:

1. **Always validate against MAHADBT structure**: The extension must adapt to MAHADBT's form structure
2. **Maintain backward compatibility**: Validation rules should be additive, not breaking
3. **Test thoroughly**: Each validation rule must have corresponding tests
4. **Document rule changes**: Update VALIDATION_RULES.md when adding new rules
5. **Follow extension best practices**: Manifest V3 compliance, minimal permissions
6. **Security first**: Never log sensitive student data, use token-based auth
7. **Performance**: Debounce validation triggers, avoid blocking UI thread

### Code Review Checklist

- [ ] Validation rules are clear and documented
- [ ] Error messages are user-friendly
- [ ] API calls have error handling
- [ ] No console.log in production code
- [ ] CSS doesn't conflict with MAHADBT styles
- [ ] Extension permissions are minimal
- [ ] Code follows project structure
- [ ] Tests are passing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-validation-rule`)
3. Commit changes (`git commit -m 'Add income validation for Open category'`)
4. Push to branch (`git push origin feature/new-validation-rule`)
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-org/autoclerk-we/issues)
- Email: support@autoclerk.pccoe.edu
- Documentation: [Read the docs](https://docs.autoclerk.pccoe.edu)

---

**Developed by Department of Computer Science and Engineering (AI & ML), PCCOE**
