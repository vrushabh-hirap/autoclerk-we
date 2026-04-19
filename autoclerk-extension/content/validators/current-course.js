// content/validators/current-course.js
// Validator for Current Course/Qualification section

class CurrentCourseValidator {
  constructor() {
    this.sectionName = 'current_course';
    this.displayName = 'Current Course';
  }

  validate(formData) {
    const errors = [];
    const currentYear = new Date().getFullYear();

    // Admission Year
    const admissionYear = this._getField(formData, ['admissionYear', 'AdmissionYear', 'ddlAdmissionYear', 'yearOfAdmission']);
    if (!admissionYear || admissionYear === '0') {
      errors.push(this._error('Admission Year', 'MISSING_FIELD', 'critical', 'Admission year is required'));
    } else {
      const year = parseInt(admissionYear);
      if (year < (currentYear - 5) || year > currentYear) {
        errors.push(this._error('Admission Year', 'DATA_INCONSISTENCY', 'critical',
          `Admission year must be between ${currentYear - 5} and ${currentYear}`));
      }
    }

    // Institute State — must be Maharashtra
    const instituteState = this._getField(formData, ['instituteState', 'InstituteState', 'ddlInstState', 'CollegeState']);
    if (!instituteState || instituteState.trim().length === 0 || instituteState === '0') {
      errors.push(this._error('Institute State', 'MISSING_FIELD', 'critical', 'Institute state is required'));
    } else if (!instituteState.toLowerCase().includes('maharashtra')) {
      errors.push(this._error('Institute State', 'CATEGORY_MISMATCH', 'critical',
        'Institute must be located in Maharashtra for this scholarship scheme'));
    }

    // Institute District
    const instituteDistrict = this._getField(formData, ['instituteDistrict', 'InstituteDistrict', 'ddlInstDistrict', 'CollegeDistrict']);
    if (!instituteDistrict || instituteDistrict.trim().length === 0 || instituteDistrict === '0') {
      errors.push(this._error('Institute District', 'MISSING_FIELD', 'critical', 'Institute district is mandatory'));
    }

    // Institute Taluka
    const instituteTaluka = this._getField(formData, ['instituteTaluka', 'InstituteTaluka', 'ddlInstTaluka', 'CollegeTaluka']);
    if (!instituteTaluka || instituteTaluka.trim().length === 0 || instituteTaluka === '0') {
      errors.push(this._error('Institute Taluka', 'MISSING_FIELD', 'critical', 'Institute taluka is mandatory'));
    }

    // Qualification Level
    const qualificationLevel = this._getField(formData, ['qualificationLevel', 'QualLevel', 'ddlQualLevel', 'CourseLevel']);
    if (!qualificationLevel || qualificationLevel === '0') {
      errors.push(this._error('Qualification Level', 'MISSING_FIELD', 'critical', 'Qualification level is mandatory'));
    }

    // Stream
    const stream = this._getField(formData, ['stream', 'Stream', 'ddlStream', 'CourseStream']);
    if (!stream || stream === '0') {
      errors.push(this._error('Stream', 'MISSING_FIELD', 'critical', 'Stream selection is mandatory'));
    }

    // College Name
    const collegeName = this._getField(formData, ['collegeName', 'CollegeName', 'ddlCollege', 'InstituteName']);
    if (!collegeName || collegeName.trim().length === 0 || collegeName === '0') {
      errors.push(this._error('College/Institute Name', 'MISSING_FIELD', 'critical', 'College or institute name is mandatory'));
    }

    // Course Name
    const courseName = this._getField(formData, ['courseName', 'CourseName', 'ddlCourse', 'txtCourse']);
    if (!courseName || courseName.trim().length === 0 || courseName === '0') {
      errors.push(this._error('Course Name', 'MISSING_FIELD', 'critical', 'Course name is mandatory'));
    }

    // Admission Type
    const admissionType = this._getField(formData, ['admissionType', 'AdmissionType', 'ddlAdmType', 'typeOfAdmission']);
    if (!admissionType || admissionType === '0') {
      errors.push(this._error('Admission Type', 'MISSING_FIELD', 'critical', 'Admission type is mandatory'));
    }

    // CET/Merit Percentage
    const cetPercentage = this._getField(formData, ['cetMeritPercentage', 'CETPercentage', 'txtCETPerc', 'MeritPercentage']);
    if (!cetPercentage || cetPercentage.trim().length === 0) {
      errors.push(this._error('CET/Merit Percentage', 'MISSING_FIELD', 'critical', 'CET/Merit percentage is required'));
    } else {
      const perc = parseFloat(cetPercentage);
      if (isNaN(perc) || perc < 0 || perc > 100) {
        errors.push(this._error('CET/Merit Percentage', 'INVALID_FORMAT', 'critical', 'CET/Merit percentage must be between 0 and 100'));
      }
    }

    // Application/Admission CAP ID
    const applicationId = this._getField(formData, ['applicationAdmissionId', 'CAPId', 'txtCAPId', 'AdmissionId', 'CLATAdmitCard']);
    if (!applicationId || applicationId.trim().length === 0) {
      errors.push(this._error('CAP/Application ID', 'MISSING_FIELD', 'critical',
        'Application/Admission CAP ID or CLAT Admit Card number is mandatory'));
    }

    // Admission Category
    const admissionCategory = this._getField(formData, ['admissionCategory', 'AdmCategory', 'ddlAdmCategory', 'CategoryInAdmission']);
    if (!admissionCategory || admissionCategory === '0') {
      errors.push(this._error('Admission Category', 'MISSING_FIELD', 'critical', 'Admission category (Open/Reserved) is mandatory'));
    }

    // Year of Study
    const yearOfStudy = this._getField(formData, ['yearOfStudy', 'YearOfStudy', 'ddlYearOfStudy', 'currentYear']);
    if (!yearOfStudy || yearOfStudy === '0') {
      errors.push(this._error('Year of Study', 'MISSING_FIELD', 'critical', 'Current year of study is mandatory'));
    }

    // Gap Years
    const gapYears = this._getField(formData, ['gapYears', 'GapYears', 'txtGapYears', 'numberOfGapYears']);
    if (gapYears !== null && gapYears !== '') {
      const gap = parseInt(gapYears);
      if (!isNaN(gap) && (gap < 0 || gap > 10)) {
        errors.push(this._error('Gap Years', 'INVALID_FORMAT', 'warning', 'Gap years must be between 0 and 10'));
      }
    }

    // Completed or Continuing
    const completedOrContinuing = this._getField(formData, ['completedOrContinuing', 'CourseStatus', 'rdCourseStatus', 'courseCompleted']);
    if (!completedOrContinuing || completedOrContinuing === '') {
      errors.push(this._error('Course Status', 'MISSING_FIELD', 'critical', 'Please specify if course is completed or continuing'));
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
