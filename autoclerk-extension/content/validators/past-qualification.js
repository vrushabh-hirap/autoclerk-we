// content/validators/past-qualification.js
// Validator for Past Qualification / Education Details section

class PastQualificationValidator {
  constructor() {
    this.sectionName = 'past_qualification';
    this.displayName = 'Past Qualification';
  }

  validate(formData) {
    const errors = [];

    // Qualification Level
    const qualLevel = this._getField(formData, ['qualificationLevel', 'PastQualLevel', 'ddlPastQualLevel', 'pastQualification']);
    if (!qualLevel || qualLevel === '0') {
      errors.push(this._error('Qualification Level', 'MISSING_FIELD', 'critical', 'Qualification level is mandatory'));
    }

    // Stream
    const stream = this._getField(formData, ['stream', 'PastStream', 'ddlPastStream', 'pastStream']);
    if (!stream || stream === '0') {
      errors.push(this._error('Stream', 'MISSING_FIELD', 'critical', 'Stream is mandatory'));
    }

    // Course
    const course = this._getField(formData, ['course', 'PastCourse', 'ddlPastCourse', 'pastCourse']);
    if (!course || course === '0') {
      errors.push(this._error('Course', 'MISSING_FIELD', 'critical', 'Course is mandatory'));
    }

    // Institute State
    const instituteState = this._getField(formData, ['pastInstituteState', 'PastInstState', 'ddlPastInstState']);
    if (!instituteState || instituteState.trim().length === 0 || instituteState === '0') {
      errors.push(this._error('Institute State', 'MISSING_FIELD', 'critical', 'Institute state is mandatory'));
    }

    // Institute District
    const instituteDistrict = this._getField(formData, ['pastInstituteDistrict', 'PastInstDistrict', 'ddlPastInstDistrict']);
    if (!instituteDistrict || instituteDistrict.trim().length === 0 || instituteDistrict === '0') {
      errors.push(this._error('Institute District', 'MISSING_FIELD', 'critical', 'Institute district is mandatory'));
    }

    // College Name
    const collegeName = this._getField(formData, ['pastCollegeName', 'PastCollege', 'ddlPastCollege', 'pastInstitute']);
    if (!collegeName || collegeName.trim().length === 0 || collegeName === '0') {
      errors.push(this._error('College/School Name', 'MISSING_FIELD', 'critical', 'College or school name is mandatory'));
    }

    // Board/University
    const boardUniversity = this._getField(formData, ['boardUniversity', 'Board', 'ddlBoard', 'University']);
    if (!boardUniversity || boardUniversity.trim().length === 0 || boardUniversity === '0') {
      errors.push(this._error('Board/University', 'MISSING_FIELD', 'critical', 'Board or university name is mandatory'));
    }

    // Mode (Regular/Distance)
    const mode = this._getField(formData, ['mode', 'Mode', 'ddlMode', 'studyMode', 'rdMode']);
    if (!mode || mode === '0') {
      errors.push(this._error('Mode of Study', 'MISSING_FIELD', 'critical', 'Mode of study (Regular/Distance) is mandatory'));
    }

    // Admission Year
    const admissionYear = this._getField(formData, ['pastAdmissionYear', 'PastAdmYear', 'ddlPastAdmYear']);
    if (!admissionYear || admissionYear === '0') {
      errors.push(this._error('Admission Year', 'MISSING_FIELD', 'critical', 'Admission year is mandatory'));
    }

    // Passing Year
    const passingYear = this._getField(formData, ['passingYear', 'PassingYear', 'ddlPassingYear', 'yearOfPassing']);
    if (!passingYear || passingYear === '0') {
      errors.push(this._error('Passing Year', 'MISSING_FIELD', 'critical', 'Passing year is mandatory'));
    } else if (admissionYear) {
      if (parseInt(passingYear) < parseInt(admissionYear)) {
        errors.push(this._error('Passing Year', 'DATA_INCONSISTENCY', 'critical',
          `Passing year (${passingYear}) must be greater than or equal to admission year (${admissionYear})`));
      }
      if (parseInt(passingYear) > new Date().getFullYear() + 1) {
        errors.push(this._error('Passing Year', 'DATA_INCONSISTENCY', 'warning', 'Passing year seems to be in the future'));
      }
    }

    // Result
    const result = this._getField(formData, ['result', 'Result', 'ddlResult', 'examResult']);
    if (!result || result === '0') {
      errors.push(this._error('Exam Result', 'MISSING_FIELD', 'critical', 'Result status is mandatory'));
    }

    // Percentage (required if passed)
    const passed = result && (result.toLowerCase().includes('pass') || result === '1');
    const percentage = this._getField(formData, ['percentage', 'Percentage', 'txtPercentage', 'marksPercentage']);
    if (passed) {
      if (!percentage || percentage.trim().length === 0) {
        errors.push(this._error('Percentage/CGPA', 'MISSING_FIELD', 'critical', 'Percentage or CGPA is required when result is Pass'));
      } else {
        const perc = parseFloat(percentage);
        if (isNaN(perc) || perc < 0 || perc > 100) {
          errors.push(this._error('Percentage/CGPA', 'INVALID_FORMAT', 'critical', 'Percentage must be between 0 and 100'));
        }
      }
    }

    // Attempts
    const attempts = this._getField(formData, ['attempts', 'Attempts', 'txtAttempts', 'numberOfAttempts']);
    if (attempts !== null && attempts !== '') {
      const att = parseInt(attempts);
      if (!isNaN(att) && (att < 1 || att > 10)) {
        errors.push(this._error('Number of Attempts', 'INVALID_FORMAT', 'warning', 'Attempts must be between 1 and 10'));
      }
    }

    // Marksheet Upload
    const marksheetUpload = this._getField(formData, ['marksheetUpload', 'MarksheetFile', 'fileMarksheet', 'uploadMarksheet']);
    if (!marksheetUpload || marksheetUpload === '') {
      errors.push(this._error('Marksheet Upload', 'MISSING_DOCUMENT', 'critical', 'Marksheet upload is mandatory for past qualification'));
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
