// content/validators/parent-info.js
// Validator for Other Information (Parent/Guardian Details) section

class ParentInfoValidator {
  constructor() {
    this.sectionName = 'other_information';
    this.displayName = 'Parent/Guardian Information';
  }

  validate(formData) {
    const errors = [];

    // Father alive status
    const isFatherAlive = this._getField(formData, ['isFatherAlive', 'FatherAlive', 'rdFatherAlive', 'fatherAlive']);
    if (isFatherAlive === null || isFatherAlive === undefined || isFatherAlive === '') {
      errors.push(this._error('Father Status', 'MISSING_FIELD', 'critical', 'Please specify if father is alive'));
    }

    const fatherAlive = isFatherAlive === 'Yes' || isFatherAlive === 'yes' || isFatherAlive === '1' || isFatherAlive === true;

    if (fatherAlive) {
      // Father name
      const fatherName = this._getField(formData, ['fatherName', 'FatherName', 'txtFatherName']);
      if (!fatherName || fatherName.trim().length === 0) {
        errors.push(this._error("Father's Name", 'MISSING_FIELD', 'critical', "Father's name is required when father is alive"));
      } else if (fatherName.trim().length < 3) {
        errors.push(this._error("Father's Name", 'INVALID_FORMAT', 'critical', "Father's name must be at least 3 characters"));
      } else if (!/^[a-zA-Z\s]+$/.test(fatherName.trim())) {
        errors.push(this._error("Father's Name", 'INVALID_FORMAT', 'critical', "Father's name must contain only letters and spaces"));
      }

      // Father occupation
      const fatherOccupation = this._getField(formData, ['fatherOccupation', 'FatherOccupation', 'ddlFatherOccupation']);
      if (!fatherOccupation || fatherOccupation.trim().length === 0 || fatherOccupation === '0') {
        errors.push(this._error("Father's Occupation", 'MISSING_FIELD', 'critical', "Father's occupation is required when father is alive"));
      }

      // Father income
      const fatherIncome = this._getField(formData, ['fatherIncome', 'FatherIncome', 'txtFatherIncome']);
      if (!fatherIncome || fatherIncome.trim().length === 0) {
        errors.push(this._error("Father's Annual Income", 'MISSING_FIELD', 'critical', "Father's annual income is required"));
      }

      // Is father salaried
      const fatherSalaried = this._getField(formData, ['fatherSalaried', 'IsFatherSalaried', 'rdFatherSalaried']);
      if (fatherSalaried === null || fatherSalaried === undefined || fatherSalaried === '') {
        errors.push(this._error("Father Salaried Status", 'MISSING_FIELD', 'warning', "Please specify if father is a salaried employee"));
      }
    }

    // Mother alive status
    const isMotherAlive = this._getField(formData, ['isMotherAlive', 'MotherAlive', 'rdMotherAlive', 'motherAlive']);
    if (isMotherAlive === null || isMotherAlive === undefined || isMotherAlive === '') {
      errors.push(this._error('Mother Status', 'MISSING_FIELD', 'critical', 'Please specify if mother is alive'));
    }

    const motherAlive = isMotherAlive === 'Yes' || isMotherAlive === 'yes' || isMotherAlive === '1' || isMotherAlive === true;

    if (motherAlive) {
      // Mother name
      const motherName = this._getField(formData, ['motherName', 'MotherName', 'txtMotherName']);
      if (!motherName || motherName.trim().length === 0) {
        errors.push(this._error("Mother's Name", 'MISSING_FIELD', 'critical', "Mother's name is required when mother is alive"));
      } else if (motherName.trim().length < 3) {
        errors.push(this._error("Mother's Name", 'INVALID_FORMAT', 'critical', "Mother's name must be at least 3 characters"));
      } else if (!/^[a-zA-Z\s]+$/.test(motherName.trim())) {
        errors.push(this._error("Mother's Name", 'INVALID_FORMAT', 'critical', "Mother's name must contain only letters and spaces"));
      }

      // Mother occupation
      const motherOccupation = this._getField(formData, ['motherOccupation', 'MotherOccupation', 'ddlMotherOccupation']);
      if (!motherOccupation || motherOccupation.trim().length === 0 || motherOccupation === '0') {
        errors.push(this._error("Mother's Occupation", 'MISSING_FIELD', 'critical', "Mother's occupation is required when mother is alive"));
      }
    }

    // At least one parent must be alive
    if (!fatherAlive && !motherAlive && isFatherAlive !== null && isMotherAlive !== null) {
      errors.push(this._error('Parent/Guardian Information', 'DATA_INCONSISTENCY', 'critical',
        'At least one parent must be alive, or provide guardian information'));
    }

    // Guardian (if both parents deceased)
    if (!fatherAlive && !motherAlive) {
      const guardianName = this._getField(formData, ['guardianName', 'GuardianName', 'txtGuardianName']);
      if (!guardianName || guardianName.trim().length === 0) {
        errors.push(this._error('Guardian Name', 'MISSING_FIELD', 'critical', 'Guardian name is required when both parents are not alive'));
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
