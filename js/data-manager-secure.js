// Secure Data Manager - ASP.NET Only  
// Enterprise-grade security with server-side authentication and AES encryption
// No client-side storage - all data encrypted server-side

window.DataManager = {
  // Authenticate with server
  async authenticate(password) {
    try {
      console.log(`🔐 [${new Date().toISOString()}] Starting authentication...`);
      const response = await fetch('secure-data-handler.aspx?v=' + Date.now(), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'authenticate',
          password: password
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          // Store session info
          sessionStorage.setItem('secureSession', JSON.stringify({
            authenticated: true,
            timestamp: Date.now(),
            expiresIn: 3600000 // 1 hour
          }));
          
          console.log(`✅ [${new Date().toISOString()}] Authentication successful!`);
          return { success: true, data: result.data };
        } else {
          throw new Error(result.message);
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
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
        // Session expired
        this.logout();
        return false;
      }
      
      return session && session.authenticated === true;
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  },

  // Load data from secure server storage
  async loadData() {
    try {
      console.log(`📥 [${new Date().toISOString()}] Starting data load...`);
      
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required for data access');
      }

      console.log(`📡 [${new Date().toISOString()}] Fetching data from server...`);
      const response = await fetch(`secure-data-handler.aspx?action=load&t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include'
      });

      console.log(`📊 [${new Date().toISOString()}] Response status: ${response.status}`);
      
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
        } else if (response.status === 500) {
          // Server configuration error - likely permissions
          const errorResult = await response.json();
          console.error(`🚨 [${new Date().toISOString()}] SERVER CONFIGURATION ERROR:`, errorResult.message);
          throw new Error(errorResult.message);
        }
        throw new Error(`Data load failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ [${new Date().toISOString()}] Data load error:`, error);
      throw error;
    }
  },

  // Save data to secure server storage
  async saveData(data) {
    try {
      console.log(`🔄 [${new Date().toISOString()}] Starting save operation...`);
      
      if (!this.isAuthenticated()) {
        console.log(`❌ [${new Date().toISOString()}] Not authenticated for saving!`);
        throw new Error('Authentication required for data saving');
      }

      console.log(`✅ [${new Date().toISOString()}] Authentication verified, sending save request...`);
      const response = await fetch('secure-data-handler.aspx?v=' + Date.now(), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save',
          data: data
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          console.log(`✅ [${new Date().toISOString()}] Save successful:`, result.message);
          return { success: true, message: result.message };
        } else {
          console.log(`❌ [${new Date().toISOString()}] Save failed:`, result.message);
          throw new Error(result.message);
        }
      } else {
        if (response.status === 401) {
          console.log(`❌ [${new Date().toISOString()}] Session expired during save!`);
          this.logout();
          throw new Error('Session expired - please log in again');
        } else if (response.status === 500) {
          // Server configuration error - likely permissions
          const errorResult = await response.json();
          console.error(`🚨 [${new Date().toISOString()}] SERVER CONFIGURATION ERROR:`, errorResult.message);
          throw new Error(errorResult.message);
        }
        console.log(`❌ [${new Date().toISOString()}] Save request failed:`, response.status);
        throw new Error(`Save failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`💥 [${new Date().toISOString()}] Save error:`, error.message);
      throw error;
    }
  },

  // Update specific data fields
  async updateData(updates) {
    try {
      console.log(`🔄 [${new Date().toISOString()}] Starting updateData with:`, updates);
      
      if (!this.isAuthenticated()) {
        throw new Error('Authentication required for data updates');
      }

      // CRITICAL: Load existing data first to avoid overwriting
      console.log(`� [${new Date().toISOString()}] Loading existing data for merge...`);
      const existingData = await this.loadData();
      console.log(`📊 [${new Date().toISOString()}] Existing data loaded:`, existingData);

      // Merge updates into existing data
      const mergedData = { ...existingData };
      
      // Handle different types of updates
      if (updates.statuses) {
        mergedData.statuses = { ...mergedData.statuses, ...updates.statuses };
        console.log(`🔀 [${new Date().toISOString()}] Merged statuses:`, mergedData.statuses);
      }
      if (updates.settings) {
        mergedData.settings = { ...mergedData.settings, ...updates.settings };
      }
      if (updates.commits !== undefined) {
        mergedData.commits = updates.commits;
      }
      if (updates.plotData !== undefined) {
        mergedData.plotData = updates.plotData;
      }
      if (updates.oli) {
        mergedData.oli = { ...mergedData.oli, ...updates.oli };
      }
      if (updates.notes !== undefined) {
        mergedData.notes = updates.notes;
      }

      console.log(`📡 [${new Date().toISOString()}] Sending merged data to server...`);
      const response = await fetch('secure-data-handler.aspx?v=' + Date.now(), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'save',
          data: mergedData
        })
      });

      console.log(`📊 [${new Date().toISOString()}] Update response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ [${new Date().toISOString()}] Update result:`, result);
        if (result.status === 'success') {
          return { success: true, message: result.message };
        } else {
          throw new Error(result.message);
        }
      } else {
        if (response.status === 401) {
          this.logout();
          throw new Error('Session expired - please log in again');
        }
        throw new Error(`Update failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ [${new Date().toISOString()}] Update error:`, error);
      throw error;
    }
  },

  // Logout and clear session
  logout() {
    try {
      sessionStorage.removeItem('secureSession');
      
      // Optional: notify server of logout (disabled - ASP.NET handler doesn't support logout action)
      /*
      fetch('secure-data-handler.aspx', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'logout'
        })
      }).catch(() => {
        // Ignore logout errors
      });
      */

      // Reload page to show login form
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.reload();
    }
  },

  // Get authentication status with details
  getAuthStatus() {
    const session = JSON.parse(sessionStorage.getItem('secureSession') || '{}');
    const now = Date.now();
    
    if (session && session.authenticated) {
      const timeLeft = session.expiresIn - (now - session.timestamp);
      if (timeLeft > 0) {
        return { 
          authenticated: true, 
          method: 'ASP.NET Server Session',
          timeRemaining: timeLeft,
          expiresAt: new Date(session.timestamp + session.expiresIn)
        };
      }
    }
    
    return { authenticated: false };
  }
};

// Initialize on load
if (window.DataManager && window.DataManager.isAuthenticated()) {
  // Auto-initialize if already authenticated
  console.log(`🔐 [${new Date().toISOString()}] Already authenticated - auto-initializing controller...`);
  if (typeof window.initializeController === 'function') {
    window.initializeController();
  }
}
