// Server-Wide Data Manager: Uses ASP.NET Application State
// Provides true multi-user persistent storage without file system access

window.DataManager = {
  authData: null,

  async _readErrorMessage(response) {
    try {
      const text = await response.text();
      if (!text) return '';
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.message === 'string') return parsed.message;
        return text;
      } catch {
        return text;
      }
    } catch {
      return '';
    }
  },
  
  // Authentication methods
  async authenticate(password) {
    try {
      
      const response = await fetch('secure-data-handler.aspx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'authenticate',
          password: password
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          this.authData = {
            authenticated: true,
            method: result.method,
            expiresIn: result.expiresIn,
            timestamp: Date.now()
          };
          
          // Store auth session
          sessionStorage.setItem('secureSession', JSON.stringify(this.authData));
          
          return { success: true, message: result.message };
        } else {
          throw new Error(result.message);
        }
      } else {
        const message = await this._readErrorMessage(response);
        throw new Error(message ? `Authentication failed: ${message}` : `Authentication failed: ${response.status}`);
      }
    } catch (error) {
      throw error;
    }
  },

  // Check authentication status
  isAuthenticated() {
    try {
      const session = JSON.parse(sessionStorage.getItem('secureSession') || '{}');
      const now = Date.now();
      
      // Check if session has expired
      if (session && (now - session.timestamp) > session.expiresIn) {
        this.logout();
        return false;
      }
      
      return session && session.authenticated === true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  },

  // Get authentication status for display
  getAuthStatus() {
    const session = JSON.parse(sessionStorage.getItem('secureSession') || '{}');
    if (session.authenticated) {
      const timeRemaining = Math.max(0, session.expiresIn - (Date.now() - session.timestamp));
      return {
        authenticated: true,
        method: session.method,
        timeRemaining: timeRemaining,
        expiresAt: new Date(session.timestamp + session.expiresIn)
      };
    }
    return { authenticated: false };
  },

  // Logout and clear sessions
  logout() {
    sessionStorage.removeItem('secureSession');
    this.authData = null;
    console.log('🚪 Authentication session cleared');
  },

  // Load data from server-wide storage
  async loadData() {
    try {
      
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required for data access');
      }

      const response = await fetch(`secure-data-handler.aspx?action=load&t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include'
      });

      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ [${new Date().toISOString()}] Data load result:`, result);
        if (result.status === 'success') {
          return result.data;
        } else {
          throw new Error(result.message);
        }
      } else {
        if (response.status === 401) {
          this.logout();
          throw new Error('Session expired - please log in again');
        }
        const message = await this._readErrorMessage(response);
        throw new Error(message ? `Data load failed: ${message}` : `Data load failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ [${new Date().toISOString()}] Data load error:`, error);
      throw error;
    }
  },

  // Save data to server-wide storage
  async saveData(data) {
    try {
      
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required for data save');
      }

      const response = await fetch('secure-data-handler.aspx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'save',
          data: data
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          console.log(`✅ [${new Date().toISOString()}] Save successful:`, result);
          return { success: true, message: result.message };
        } else {
          console.log(`❌ [${new Date().toISOString()}] Save failed:`, result.message);
          throw new Error(result.message);
        }
      } else {
        if (response.status === 401) {
          this.logout();
          throw new Error('Session expired - please log in again');
        }
        const message = await this._readErrorMessage(response);
        console.log(`❌ [${new Date().toISOString()}] Save request failed:`, response.status, message);
        throw new Error(message ? `Save failed: ${message}` : `Save failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`💥 [${new Date().toISOString()}] Save error:`, error.message);
      throw error;
    }
  },

  // Update specific data fields with load-merge-save pattern
  async updateData(updates) {
    try {
      console.log(`🔄 [${new Date().toISOString()}] Starting updateData with:`, updates);
      
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required for data updates');
      }

      // Load existing data first
      const existingData = await this.loadData();
      console.log(`📊 [${new Date().toISOString()}] Existing data loaded:`, existingData);

      // Merge updates with existing data
      const mergedData = { ...existingData };
      
      Object.keys(updates).forEach(key => {
        if (key === 'statuses' && typeof updates[key] === 'object') {
          mergedData.statuses = { ...mergedData.statuses, ...updates[key] };
          console.log(`🔀 [${new Date().toISOString()}] Merged statuses:`, mergedData.statuses);
        } else {
          mergedData[key] = updates[key];
          console.log(`🔀 [${new Date().toISOString()}] Updated ${key}:`, updates[key]);
        }
      });

      // Save merged data
      const saveResult = await this.saveData(mergedData);
      
      return saveResult;
      
    } catch (error) {
      console.error(`❌ [${new Date().toISOString()}] Update error:`, error.message);
      throw error;
    }
  },

  // Clear all stored data (server-side)
  async clearAllData() {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required to clear data');
      }
      
      // Save empty data structure to clear server storage
      const emptyData = {
        settings: { textDuration: 5000, plotDuration: 15000, notesDuration: 10000 },
        commits: [],
        users: [],
        plotData: [],
        statuses: {},
        notes: "",
        oli: { annualGoal: 0, q1: 0, q2: 0, q3: 0, q4: 0 }
      };
      
      await this.saveData(emptyData);
      console.log('🗑️ Server-wide data cleared');
    } catch (error) {
      console.error('Failed to clear server data:', error);
      throw error;
    }
  }
};
