// content/validators/address-info.js
// Validator for Address Information section

class AddressInfoValidator {
  constructor() {
    this.sectionName = 'address_information';
    this.displayName = 'Address Information';
  }

  validate(formData) {
    const errors = [];

    // Permanent Address
    const permAddress = this._getField(formData, ['permanentAddress', 'PermAddress', 'txtPermAddress', 'PermanentAddress']);
    if (!permAddress || permAddress.trim().length === 0) {
      errors.push(this._error('Permanent Address', 'MISSING_FIELD', 'critical', 'Permanent address is required'));
    } else if (permAddress.trim().length < 10) {
      errors.push(this._error('Permanent Address', 'INVALID_FORMAT', 'critical', 'Permanent address must be at least 10 characters'));
    }

    // State — must be Maharashtra
    const state = this._getField(formData, ['state', 'State', 'ddlState', 'PermState']);
    if (!state || state.trim().length === 0 || state === '0') {
      errors.push(this._error('State', 'MISSING_FIELD', 'critical', 'State selection is required'));
    } else if (!state.toLowerCase().includes('maharashtra')) {
      errors.push(this._error('State', 'CATEGORY_MISMATCH', 'critical', 'State must be Maharashtra for this scholarship scheme'));
    }

    // District
    const district = this._getField(formData, ['district', 'District', 'ddlDistrict', 'PermDistrict']);
    if (!district || district.trim().length === 0 || district === '0') {
      errors.push(this._error('District', 'MISSING_FIELD', 'critical', 'District selection is mandatory'));
    }

    // Taluka
    const taluka = this._getField(formData, ['taluka', 'Taluka', 'ddlTaluka', 'PermTaluka']);
    if (!taluka || taluka.trim().length === 0 || taluka === '0') {
      errors.push(this._error('Taluka', 'MISSING_FIELD', 'critical', 'Taluka selection is mandatory'));
    }

    // Village / City
    const village = this._getField(formData, ['village', 'Village', 'City', 'PermVillage', 'ddlVillage']);
    if (!village || village.trim().length === 0 || village === '0') {
      errors.push(this._error('Village/City', 'MISSING_FIELD', 'warning', 'Village or city name is recommended'));
    }

    // Pincode
    const pincode = this._getField(formData, ['pincode', 'PinCode', 'txtPincode', 'Pincode']);
    if (!pincode || pincode.trim().length === 0) {
      errors.push(this._error('Pincode', 'MISSING_FIELD', 'critical', 'Pincode is required'));
    } else if (!/^\d{6}$/.test(pincode.replace(/\s/g, ''))) {
      errors.push(this._error('Pincode', 'INVALID_FORMAT', 'critical', 'Pincode must be exactly 6 digits'));
    }

    // Correspondence Address
    const sameAsPerm = this._getField(formData, ['sameAsPermanent', 'SameAsPermanent', 'chkSameAddress', 'corrSameAsPerm']);
    const corrAddress = this._getField(formData, ['correspondenceAddress', 'CorrAddress', 'txtCorrAddress', 'CorrespondenceAddress']);

    const isSame = sameAsPerm === true || sameAsPerm === 'true' || sameAsPerm === '1' || sameAsPerm === 'on';

    if (!isSame && (!corrAddress || corrAddress.trim().length === 0)) {
      errors.push(this._error('Correspondence Address', 'MISSING_FIELD', 'critical',
        'Please fill correspondence address or check "Same as Permanent"'));
    }

    if (!isSame && corrAddress && corrAddress.trim().length > 0 && corrAddress.trim().length < 10) {
      errors.push(this._error('Correspondence Address', 'INVALID_FORMAT', 'critical', 'Correspondence address must be at least 10 characters'));
    }

    // Correspondence State
    if (!isSame) {
      const corrState = this._getField(formData, ['corrState', 'CorrState', 'ddlCorrState', 'CorrespondenceState']);
      if (!corrState || corrState.trim().length === 0 || corrState === '0') {
        errors.push(this._error('Correspondence State', 'MISSING_FIELD', 'critical', 'Correspondence state is required'));
      }

      const corrDistrict = this._getField(formData, ['corrDistrict', 'CorrDistrict', 'ddlCorrDistrict']);
      if (!corrDistrict || corrDistrict.trim().length === 0 || corrDistrict === '0') {
        errors.push(this._error('Correspondence District', 'MISSING_FIELD', 'critical', 'Correspondence district is required'));
      }

      const corrPincode = this._getField(formData, ['corrPincode', 'CorrPincode', 'txtCorrPincode']);
      if (!corrPincode || corrPincode.trim().length === 0) {
        errors.push(this._error('Correspondence Pincode', 'MISSING_FIELD', 'critical', 'Correspondence pincode is required'));
      } else if (!/^\d{6}$/.test(corrPincode.replace(/\s/g, ''))) {
        errors.push(this._error('Correspondence Pincode', 'INVALID_FORMAT', 'critical', 'Correspondence pincode must be exactly 6 digits'));
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
