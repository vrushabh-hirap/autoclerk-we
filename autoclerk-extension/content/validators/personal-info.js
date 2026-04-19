// content/validators/personal-info.js
// Validator for Personal Information section

class PersonalInfoValidator {
  constructor() {
    this.sectionName = 'personal_information';
    this.displayName = 'Personal Information';
  }

  validate(formData) {
    const errors = [];

    // Candidate Name
    const name = this._getField(formData, ['candidateName', 'FullName', 'txtName', 'ApplicantName']);
    if (!name || name.trim().length === 0) {
      errors.push(this._error('Candidate Name', 'MISSING_FIELD', 'critical', 'Full name is required'));
    } else if (name.trim().length < 3) {
      errors.push(this._error('Candidate Name', 'INVALID_FORMAT', 'critical', 'Name must be at least 3 characters long'));
    } else if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      errors.push(this._error('Candidate Name', 'INVALID_FORMAT', 'critical', 'Name must contain only letters and spaces'));
    }

    // Mobile Number
    const mobile = this._getField(formData, ['mobileNumber', 'MobileNo', 'txtMobile', 'Mobile']);
    if (!mobile || mobile.trim().length === 0) {
      errors.push(this._error('Mobile Number', 'MISSING_FIELD', 'critical', 'Mobile number is required'));
    } else if (!/^[6-9]\d{9}$/.test(mobile.replace(/\s/g, ''))) {
      errors.push(this._error('Mobile Number', 'INVALID_FORMAT', 'critical', 'Invalid mobile number — must be 10 digits starting with 6–9'));
    }

    // Email
    const email = this._getField(formData, ['email', 'EmailId', 'txtEmail', 'Email']);
    if (!email || email.trim().length === 0) {
      errors.push(this._error('Email Address', 'MISSING_FIELD', 'critical', 'Email address is required'));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.push(this._error('Email Address', 'INVALID_FORMAT', 'critical', 'Invalid email format (e.g. name@email.com)'));
    }

    // Aadhar Number
    const aadhar = this._getField(formData, ['aadharNumber', 'AadharNo', 'txtAadhar', 'Aadhar']);
    if (!aadhar || aadhar.trim().length === 0) {
      errors.push(this._error('Aadhar Number', 'MISSING_FIELD', 'critical', 'Aadhar number is required'));
    } else if (!/^\d{12}$/.test(aadhar.replace(/\s/g, ''))) {
      errors.push(this._error('Aadhar Number', 'INVALID_FORMAT', 'critical', 'Aadhar must be exactly 12 digits'));
    }

    // Date of Birth
    const dob = this._getField(formData, ['dateOfBirth', 'DOB', 'txtDOB', 'BirthDate']);
    if (!dob || dob.trim().length === 0) {
      errors.push(this._error('Date of Birth', 'MISSING_FIELD', 'critical', 'Date of birth is required'));
    } else {
      const dobDate = new Date(dob);
      const age = (new Date() - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
      if (isNaN(age)) {
        errors.push(this._error('Date of Birth', 'INVALID_FORMAT', 'critical', 'Invalid date of birth format'));
      } else if (age < 16 || age > 35) {
        errors.push(this._error('Date of Birth', 'DATA_INCONSISTENCY', 'critical', `Student age (${Math.floor(age)}) must be between 16 and 35 years`));
      }
    }

    // Gender
    const gender = this._getField(formData, ['gender', 'Gender', 'rdGender', 'sex']);
    if (!gender || gender === '' || gender === '0') {
      errors.push(this._error('Gender', 'MISSING_FIELD', 'critical', 'Gender selection is mandatory'));
    }

    // Caste Category
    const casteCategory = this._getField(formData, ['casteCategory', 'Category', 'ddlCategory', 'CasteCategory']);
    if (!casteCategory || casteCategory === '' || casteCategory === '0') {
      errors.push(this._error('Caste Category', 'MISSING_FIELD', 'critical', 'Caste category must be selected'));
    } else {
      // Category-specific validations
      const incomeField = this._getField(formData, ['annualIncome', 'AnnualIncome', 'txtIncome', 'FamilyIncome']);
      const incomeLimits = {
        'EWS': 800000, 'OPEN': 800000, 'OBC': 800000, 'SC': 250000, 'ST': 250000,
        'NT-A': 800000, 'NT-B': 800000, 'NT-C': 800000, 'NT-D': 800000,
        'SBC': 800000, 'VJNT': 800000
      };

      if (!incomeField || incomeField.trim().length === 0) {
        errors.push(this._error('Annual Income', 'MISSING_FIELD', 'critical', 'Annual family income is required'));
      } else {
        const income = parseFloat(incomeField.replace(/,/g, ''));
        const limit = incomeLimits[casteCategory.toUpperCase()];
        if (limit && income > limit) {
          errors.push(this._error('Annual Income', 'CATEGORY_MISMATCH', 'critical',
            `Income ₹${income.toLocaleString('en-IN')} exceeds limit of ₹${limit.toLocaleString('en-IN')} for ${casteCategory} category`));
        }
      }

      const reservedCategories = ['SC', 'ST', 'OBC', 'NT-A', 'NT-B', 'NT-C', 'NT-D', 'SBC', 'VJNT'];
      if (reservedCategories.includes(casteCategory.toUpperCase())) {
        const casteCertNo = this._getField(formData, ['casteCertificateNumber', 'CasteCertNo', 'txtCasteCert']);
        if (!casteCertNo || casteCertNo.trim().length === 0) {
          errors.push(this._error('Caste Certificate Number', 'MISSING_DOCUMENT', 'critical',
            'Caste certificate number is mandatory for reserved categories'));
        }
      }

      if (['SC', 'ST'].includes(casteCategory.toUpperCase())) {
        const castValidity = this._getField(formData, ['casteValidityCertificate', 'CasteValidity', 'CVC']);
        if (!castValidity || castValidity.trim().length === 0) {
          errors.push(this._error('Caste Validity Certificate', 'MISSING_DOCUMENT', 'critical',
            'Caste validity certificate is mandatory for SC/ST categories'));
        }
      }

      if (casteCategory.toUpperCase() === 'OBC') {
        const ncl = this._getField(formData, ['nonCreamyLayerCertificate', 'NCLCert', 'NCL']);
        if (!ncl || ncl.trim().length === 0) {
          errors.push(this._error('Non-Creamy Layer Certificate', 'MISSING_DOCUMENT', 'critical',
            'Non-creamy layer certificate is mandatory for OBC category'));
        }
      }

      if (['EWS', 'OPEN'].includes(casteCategory.toUpperCase())) {
        const ews = this._getField(formData, ['ewsCertificate', 'EWSCert', 'EWS']);
        if (!ews || ews.trim().length === 0) {
          errors.push(this._error('EWS Certificate', 'MISSING_DOCUMENT', 'critical',
            'EWS certificate is mandatory for EWS/Open category applicants'));
        }
      }
    }

    // Religion
    const religion = this._getField(formData, ['religion', 'Religion', 'ddlReligion']);
    if (!religion || religion === '' || religion === '0') {
      errors.push(this._error('Religion', 'MISSING_FIELD', 'critical', 'Religion selection is mandatory'));
    }

    return errors;
  }

  validateField(fieldName, value, formData) {
    const testData = { ...formData, [fieldName]: value };
    const allErrors = this.validate(testData);
    return allErrors.find(e => e.field.toLowerCase().replace(/\s/g, '') === fieldName.toLowerCase().replace(/\s/g, '')) || null;
  }

  _getField(formData, keys) {
    for (const key of keys) {
      if (formData[key] !== undefined && formData[key] !== null && formData[key] !== '') {
        return formData[key];
      }
    }
    return null;
  }

  _error(field, type, severity, message) {
    return { field, type, severity, message, section: this.sectionName };
  }
}
