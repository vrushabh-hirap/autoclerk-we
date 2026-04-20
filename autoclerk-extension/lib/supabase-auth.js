// lib/supabase-auth.js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

/**
 * Lightweight Auth Utility for Supabase REST API
 */
export const SupabaseAuth = {
  /**
   * Get the current session from chrome.storage
   */
  async getSession() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sbSession'], (result) => {
        resolve(result.sbSession || null);
      });
    });
  },

  /**
   * Save session to chrome.storage
   */
  async saveSession(session) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ sbSession: session }, resolve);
    });
  },

  /**
   * Clear session from chrome.storage
   */
  async logout() {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['sbSession'], resolve);
    });
  },

  /**
   * Fetch user details from 'user_details' table using the access token
   */
  async getUserDetails(userId, accessToken) {
    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) return null;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_details?id=eq.${userId}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch user details:', await response.text());
        return null;
      }

      const data = await response.json();
      return data[0] || null;
    } catch (err) {
      console.error('Error fetching user details:', err);
      return null;
    }
  },

  /**
   * Check if session is valid and fetch user info
   */
  async checkAuth() {
    const session = await this.getSession();
    if (!session || !session.access_token) return null;

    const { user } = session;
    if (!user) return null;

    // Fetch extended profile data
    const profile = await this.getUserDetails(user.id, session.access_token);
    
    return {
      session,
      profile: profile || {
        full_name: user.user_metadata?.full_name || 'User',
        avatar_url: user.user_metadata?.avatar_url || '',
        email: user.email
      }
    };
  }
};
