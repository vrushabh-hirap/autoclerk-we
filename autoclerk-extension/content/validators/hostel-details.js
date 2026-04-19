// content/validators/hostel-details.js
// Validator for Hostel Details section

class HostelDetailsValidator {
  constructor() {
    this.sectionName = 'hostel_details';
    this.displayName = 'Hostel Details';
  }

  validate(formData) {
    const errors = [];

    // Hosteler or Day Scholar
    const beneficiaryCategory = this._getField(formData, [
      'beneficiaryCategory', 'HostelerDayScholar', 'rdHosteler', 'studentCategory', 'residencyType'
    ]);

    if (!beneficiaryCategory || beneficiaryCategory === '' || beneficiaryCategory === '0') {
      errors.push(this._error('Beneficiary Category', 'MISSING_FIELD', 'critical',
        'Please select whether you are a Hosteler or Day Scholar'));
    }

    const isHosteler = beneficiaryCategory &&
      (beneficiaryCategory.toLowerCase().includes('hostel') || beneficiaryCategory === '1' || beneficiaryCategory === 'H');

    if (isHosteler) {
      // Hostel Type
      const hostelType = this._getField(formData, ['hostelType', 'HostelType', 'ddlHostelType', 'typeOfHostel']);
      if (!hostelType || hostelType === '0') {
        errors.push(this._error('Hostel Type', 'MISSING_FIELD', 'critical', 'Hostel type is mandatory for hostelers'));
      }

      // Hostel Name
      const hostelName = this._getField(formData, ['hostelName', 'HostelName', 'txtHostelName', 'PGName', 'residenceName']);
      if (!hostelName || hostelName.trim().length === 0) {
        errors.push(this._error('Hostel/PG Name', 'MISSING_FIELD', 'critical', 'Hostel or PG or Rented house name is mandatory for hostelers'));
      }

      // Hostel State
      const hostelState = this._getField(formData, ['hostelState', 'HostelState', 'ddlHostelState']);
      if (!hostelState || hostelState.trim().length === 0 || hostelState === '0') {
        errors.push(this._error('Hostel State', 'MISSING_FIELD', 'critical', 'Hostel state is mandatory for hostelers'));
      }

      // Hostel District
      const hostelDistrict = this._getField(formData, ['hostelDistrict', 'HostelDistrict', 'ddlHostelDistrict']);
      if (!hostelDistrict || hostelDistrict.trim().length === 0 || hostelDistrict === '0') {
        errors.push(this._error('Hostel District', 'MISSING_FIELD', 'critical', 'Hostel district is mandatory for hostelers'));
      }

      // Hostel Taluka
      const hostelTaluka = this._getField(formData, ['hostelTaluka', 'HostelTaluka', 'ddlHostelTaluka']);
      if (!hostelTaluka || hostelTaluka.trim().length === 0 || hostelTaluka === '0') {
        errors.push(this._error('Hostel Taluka', 'MISSING_FIELD', 'critical', 'Hostel taluka is mandatory for hostelers'));
      }

      // Hostel Address
      const hostelAddress = this._getField(formData, ['hostelAddress', 'HostelAddress', 'txtHostelAddress']);
      if (!hostelAddress || hostelAddress.trim().length === 0) {
        errors.push(this._error('Hostel Address', 'MISSING_FIELD', 'critical', 'Hostel address is mandatory for hostelers'));
      } else if (hostelAddress.trim().length < 10) {
        errors.push(this._error('Hostel Address', 'INVALID_FORMAT', 'critical', 'Hostel address must be at least 10 characters'));
      }

      // Admission Date to Hostel
      const admissionDate = this._getField(formData, ['admissionDate', 'HostelAdmDate', 'txtHostelAdmDate', 'dateOfAdmission']);
      if (!admissionDate || admissionDate.trim().length === 0) {
        errors.push(this._error('Hostel Admission Date', 'MISSING_FIELD', 'critical', 'Hostel admission date is mandatory for hostelers'));
      } else {
        const adDate = new Date(admissionDate);
        if (isNaN(adDate.getTime())) {
          errors.push(this._error('Hostel Admission Date', 'INVALID_FORMAT', 'critical', 'Invalid hostel admission date format'));
        } else if (adDate > new Date()) {
          errors.push(this._error('Hostel Admission Date', 'DATA_INCONSISTENCY', 'warning', 'Hostel admission date cannot be in the future'));
        }
      }

      // Hostel Pincode
      const hostelPincode = this._getField(formData, ['hostelPincode', 'HostelPincode', 'txtHostelPin']);
      if (!hostelPincode || hostelPincode.trim().length === 0) {
        errors.push(this._error('Hostel Pincode', 'MISSING_FIELD', 'critical', 'Hostel pincode is required for hostelers'));
      } else if (!/^\d{6}$/.test(hostelPincode.replace(/\s/g, ''))) {
        errors.push(this._error('Hostel Pincode', 'INVALID_FORMAT', 'critical', 'Hostel pincode must be 6 digits'));
      }
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
