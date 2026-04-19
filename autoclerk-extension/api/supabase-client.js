// api/supabase-client.js
// Supabase integration via REST API (no npm module needed in extension)

class SupabaseExtClient {
  constructor() {
    this.supabaseUrl = null;
    this.supabaseKey = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getConfig' }, resolve);
    });

    if (response?.supabaseConfig?.supabaseUrl && response?.supabaseConfig?.supabaseAnonKey) {
      this.supabaseUrl = response.supabaseConfig.supabaseUrl.replace(/\/$/, '');
      this.supabaseKey = response.supabaseConfig.supabaseAnonKey;
      this.initialized = true;
      return true;
    }

    console.warn('AutoClerk: Supabase not configured. Errors will not be logged remotely.');
    return false;
  }

  isConfigured() {
    return this.initialized && this.supabaseUrl && this.supabaseKey;
  }

  /**
   * Insert rows into a table
   */
  async insert(table, data) {
    if (!this.isConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(Array.isArray(data) ? data : [data])
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        return { data: null, error: { message: errBody.message || `HTTP ${response.status}` } };
      }

      const result = await response.json();
      return { data: result, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  /**
   * Query rows from a table
   */
  async select(table, { filter = {}, order = null, limit = null } = {}) {
    if (!this.isConfigured()) {
      return { data: null, error: { message: 'Supabase not configured' } };
    }

    try {
      let url = `${this.supabaseUrl}/rest/v1/${table}?select=*`;

      for (const [key, value] of Object.entries(filter)) {
        url += `&${key}=eq.${encodeURIComponent(value)}`;
      }

      if (order) {
        url += `&order=${order.column}.${order.ascending ? 'asc' : 'desc'}`;
      }

      if (limit) {
        url += `&limit=${limit}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        return { data: null, error: { message: errBody.message || `HTTP ${response.status}` } };
      }

      const result = await response.json();
      return { data: result, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  /**
   * Get next check number for a student
   */
  async getNextCheckNumber(studentId) {
    const { data, error } = await this.select('error_logs', {
      filter: { student_id: studentId },
      order: { column: 'check_number', ascending: false },
      limit: 1
    });

    if (error || !data || data.length === 0) return 1;
    return (data[0].check_number || 0) + 1;
  }

  /**
   * Log errors to the database
   */
  async logErrors(studentId, checkNumber, section, errors, formSnapshot) {
    if (errors.length === 0) return { data: null, error: null };

    const rows = errors.map(err => ({
      student_id: studentId,
      check_number: checkNumber,
      section: section,
      error_type: err.type,
      field_name: err.field,
      error_description: err.message,
      severity: err.severity,
      resolved: false,
      form_snapshot: formSnapshot,
      created_at: new Date().toISOString()
    }));

    return this.insert('error_logs', rows);
  }
}
