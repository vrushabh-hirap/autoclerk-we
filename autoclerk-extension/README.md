# AutoClerk — MAHADBT Scholarship Verification Assistant

A Chrome Extension that provides **real-time validation** of scholarship application data on the [Maharashtra MAHADBT portal](https://mahadbt.maharashtra.gov.in/). AutoClerk works entirely locally by default, with an optional backend integration for future persistence.

---

## Features

- ✅ **Real-time validation** across all 6 profile sections
- 🔍 **Live Field Scanning** — Watch AutoClerk detect and validate fields in real-time with an animated progress bar and pulse indicator.
- 💾 **Session Persistence** — Validation states and errors are saved to local storage, surviving popup and extension closes.
- 📊 **Local Error Logging** — Save specific snapshots of errors to your local history with check numbers.
- 🎯 **Non-intrusive** — Floating panel that provides immediate feedback without interfering with MAHADBT functionality.
- 🖱️ **Draggable UI** — Move the validation panel anywhere on your screen.
- 🔔 **Extension Badge** — Status and error counts visible directly on the toolbar icon.

---

## Covered Sections

| Section | URL Pattern | Key Validations |
|---------|-------------|-----------------|
| Personal Information | `/UpdateProfile/*` | Name, mobile, email, Aadhar, DOB, caste, income |
| Address Information | `/AddressInformation/*` | Permanent & correspondence address, pincode, state |
| Parent/Guardian | `/OtherInfo/*` | Father/mother names, occupations, alive status |
| Current Course | `/CurrentQualification/*` | Institute, course, CET percentage, CAP ID |
| Past Qualification | `/EducationDetails/*` | Board, percentage, passing year, marksheet upload |
| Hostel Details | `/Hostel/*` | Hosteler/day scholar, hostel address, admission date |

---

## Installation

### Load Unpacked Extension (Development)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (toggle in the top right).
4. Click **"Load unpacked"**.
5. Select the `autoclerk-extension/` folder.
6. AutoClerk is now active! Navigate to the MAHADBT portal to start.

---

## Usage

1. **Navigate**: Go to any profile section on the MAHADBT portal.
2. **Scan**: The AutoClerk panel will appear and automatically begin a "Live Scan" of the form fields.
3. **Validate**: Fill out the form; AutoClerk updates its report in real-time.
4. **Save**: Click **"Save Errors"** in the floating panel to store the current issues in your local **Error Log** tab in the extension popup.
5. **Review**: Access the extension popup from your toolbar to see overall progress and history.

---

## Future Backend Integration (Supabase)

While AutoClerk is currently configured for local-first usage, it includes stubs for Supabase integration. To connect your own backend in the future:

1. **Database Schema**: Use `database-schema.sql` to set up your Supabase tables.
2. **API Client**: Update `autoclerk-extension/api/supabase-client.js` with your project credentials.
3. **Synchronization**: Uncomment the backend sync logic in `content-script.js`.

---

## Validation Rules Summary

### Personal Information
- Mobile: 10 digits, starts with 6-9
- Aadhar: Exactly 12 digits
- Age: 16–35 years
- Income limits verified by category (SC/ST vs Others)
- Document presence checks (Caste, Validity, EWS, etc.)

### Current Course & Past Qualification
- Admission year vs Passing year consistency
- Percentage range validation (0-100)
- Maharashtra-specific institute state checks
- Mandatory application ID detection (CAP/CLAT/etc.)

---

## File Structure

```
autoclerk-extension/
├── manifest.json               # Chrome Extension Manifest v3
├── database-schema.sql         # SQL for future Supabase setup
├── background/
│   └── service-worker.js       # Badge management & session init
├── content/
│   ├── content-script.js       # Orchestrator & Session Manager
│   ├── dom-parser.js           # Intelligent MAHADBT form parser
│   ├── ui-injector.js          # Animated floating panel UI
│   └── validators/
│       ├── personal-info.js    # Section-specific logic...
│       └── ...                
├── api/
│   └── supabase-client.js      # Stub for future backend integration
├── ui/
│   └── styles.css              # Main glassmorphism styles
├── popup/
│   ├── popup.html             # Multi-tab monitoring popup
│   ├── popup.js               # Popup controller with session sync
│   └── popup.css              # Dashboard styling
└── icons/                     # Extension branding
```

---

## License

MIT — Built for Maharashtra scholarship students 🎓
