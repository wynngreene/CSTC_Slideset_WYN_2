// =====================================================
// LOCAL DEVELOPMENT MODE
// Automatically authenticate when running locally
// so the controller UI can load without login.
//
// Only activates on:
// localhost
// 127.0.0.1
// =====================================================

const LOCAL_DEV_MODE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

if (LOCAL_DEV_MODE) {
    console.log("⚡ Local Dev Mode Enabled: Controller auto-authenticated");

    // Mock DataManager auth functions if they exist
    if (window.DataManager) {
        window.DataManager.isAuthenticated = () => true;
        window.DataManager.authenticate = async () => ({ success: true });
    }
}

// Function to run controller initialization
function runControllerInitialization() {
    setupController();
}

// Check if DOM is already ready or wait for it
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runControllerInitialization);
} else {
    runControllerInitialization();
}

function setupController() {
    
    const table = document.getElementById('user-table');
  const addRowBtn = document.getElementById('add-row');
  const deleteRowBtn = document.getElementById('delete-row');
  const updateCommitsBtn = document.getElementById('update-commits');
  // Function to populate table from settings after authentication
  async function populateCommitsTable() {
    try {
      const data = await window.DataManager.loadData();
      console.log(`📊 [${new Date().toISOString()}] Commits data received:`, data);
      
      if (data && data.commits && Array.isArray(data.commits)) {
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        data.commits.forEach(row => {
          const tr = document.createElement('tr');
          // partNumber, quantity, date, location
          const fields = [row.partNumber, row.quantity, row.date, row.location];
          fields.forEach(val => {
            const td = document.createElement('td');
            td.innerText = val || '';
            td.style.height = '20px';
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        makeCellsFocusable(); // Ensure focus/edit after table update
      } else {
      }
    } catch (error) {
      console.error(`❌ [${new Date().toISOString()}] Error loading commits data:`, error);
    }
  }
  
  // Expose function globally so authentication handler can call it
  window.populateCommitsTable = populateCommitsTable;

  // Function to populate plot data table from settings after authentication
  async function populatePlotTable() {
    try {
      const data = await window.DataManager.loadData();
      console.log(`📊 [${new Date().toISOString()}] Plot data received:`, data);
      
      if (data && data.plotData && Array.isArray(data.plotData)) {
        const plotTable = document.getElementById("plot-data-table");
        const tbody = plotTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        data.plotData.forEach(row => {
          const tr = document.createElement('tr');
          // date, cleanroom, smt, cstc
          const fields = [row.date || '', row.cleanroom || '', row.smt || '', row.cstc || ''];
          fields.forEach(val => {
            const td = document.createElement('td');
            td.innerText = val;
            td.style.height = '20px';
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        makePlotCellsFocusable(); // Ensure focus/edit after table update
      } else {
      }
    } catch (error) {
      console.error(`❌ [${new Date().toISOString()}] Error loading plot data:`, error);
    }
  }
  
  // Function to make plot table cells focusable and editable
  function makePlotCellsFocusable() {
    const plotTable = document.getElementById("plot-data-table");
    const tbody = plotTable.querySelector('tbody');
    Array.from(tbody.querySelectorAll('td')).forEach(td => {
      td.setAttribute('tabindex', '0');
      td.setAttribute('contenteditable', 'true');
      td.removeEventListener('keydown', handleTabNavigation);
      td.addEventListener('keydown', handleTabNavigation);
    });
  }
  
  // Expose function globally so authentication handler can call it
  window.populatePlotTable = populatePlotTable;

  // Plot table management - similar to commits table
  const plotTable = document.getElementById('plot-data-table');
  const addPlotRowBtn = document.getElementById('add-plot-row');
  const deletePlotRowBtn = document.getElementById('delete-plot-row');
  let selectedPlotCell = null;

  // Track selected cell for delete and tab navigation
  plotTable.addEventListener('click', function(e) {
    const td = e.target.closest('td');
    if (td && td.parentNode.parentNode === plotTable.querySelector('tbody')) {
      selectedPlotCell = td;
    }
  });

  // Add row to plot table
  addPlotRowBtn.addEventListener('click', function() {
    const tbody = plotTable.querySelector('tbody');
    const newRow = document.createElement('tr');
    for (let i = 0; i < 4; i++) { // Date, Cleanroom, SMT, CSTC
      const td = document.createElement('td');
      td.innerHTML = '';
      td.style.height = '20px';
      newRow.appendChild(td);
    }
    tbody.appendChild(newRow);
    makePlotCellsFocusable(); // Ensure new row cells are focusable/editable
  });

  // Delete row from plot table (delete row containing selected cell)
  deletePlotRowBtn.addEventListener('click', function() {
    if (selectedPlotCell) {
      const tr = selectedPlotCell.parentNode;
      tr.parentNode.removeChild(tr);
      selectedPlotCell = null;
      makePlotCellsFocusable(); // Reapply listeners after row removal
    }
  });

  // Make plot table cells focusable initially
  makePlotCellsFocusable();
  // Update commits table data in backend
  updateCommitsBtn.addEventListener('click', async function() {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    // Map each row to commit object
    const commits = rows.map(tr => {
      const tds = Array.from(tr.querySelectorAll('td'));
      return {
        partNumber: tds[0]?.innerText || '',
        quantity: Number(tds[1]?.innerText) || 0,
        date: tds[2]?.innerText || '',
        location: tds[3]?.innerText || ''
      };
    });
    try {
      const response = await window.DataManager.updateData({ commits });
      if (response) {
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
    }
  });
  let selectedCell = null;

  // Track selected cell for delete and tab navigation
  table.addEventListener('click', function(e) {
    const td = e.target.closest('td');
    if (td && td.parentNode.parentNode === table.querySelector('tbody')) {
      selectedCell = td;
    }
  });

  // Add row
  addRowBtn.addEventListener('click', function() {
    const tbody = table.querySelector('tbody');
    const newRow = document.createElement('tr');
    for (let i = 0; i < 4; i++) {
      const td = document.createElement('td');
      td.innerHTML = '';
      td.style.height = '20px';
      newRow.appendChild(td);
    }
    tbody.appendChild(newRow);
    makeCellsFocusable(); // Ensure new row cells are focusable/editable
  });

  // Delete row (delete row containing selected cell)
  deleteRowBtn.addEventListener('click', function() {
    if (selectedCell) {
      const tr = selectedCell.parentNode;
      tr.parentNode.removeChild(tr);
      selectedCell = null;
      makeCellsFocusable(); // Reapply listeners after row removal
    }
  });

  // Tab navigation for table cells
  function setCaretToEnd(el) {
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function handleTabNavigation(e) {
    if (e.key === 'Tab') {
      const td = e.target.closest('td');
      if (!td) return;
      e.preventDefault();
      const tr = td.parentNode;
      const tds = Array.from(tr.querySelectorAll('td'));
      let idx = tds.indexOf(td);
      let nextCell = null;
      if (idx < tds.length - 1) {
        nextCell = tds[idx + 1];
      } else {
        const nextTr = tr.nextElementSibling;
        if (nextTr) {
          nextCell = nextTr.querySelector('td');
        }
      }
      if (nextCell) {
        nextCell.focus({preventScroll: true});
        setTimeout(() => {
          if (nextCell.isContentEditable) {
            // If cell is empty, insert a zero-width space so caret can be placed
            if (!nextCell.textContent) {
              nextCell.textContent = '\u200B';
            }
            const range = document.createRange();
            range.selectNodeContents(nextCell);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          } else if (nextCell.setSelectionRange) {
            nextCell.setSelectionRange(nextCell.value.length, nextCell.value.length);
          }
        }, 0);
      }
    }
  }

  function makeCellsFocusable() {
    const tbody = table.querySelector('tbody');
    Array.from(tbody.querySelectorAll('td')).forEach(td => {
      td.setAttribute('tabindex', '0');
      td.setAttribute('contenteditable', 'true');
      td.removeEventListener('keydown', handleTabNavigation);
      td.addEventListener('keydown', handleTabNavigation);
    });
  }
  makeCellsFocusable();
  // Re-apply focusable/editable when rows are added
  addRowBtn.addEventListener('click', makeCellsFocusable);

    // Get references to DOM elements for settings panel
    const updateSettingsButton = document.getElementById("update-settings");
    const toggles = document.querySelectorAll(".toggle-container");
    const updateNotesButton = document.getElementById("update-notes");
    const clearNotesButton = document.getElementById("clear-notes");
    const updatePlotDataButton = document.getElementById("update-plot-data");
    const notesInput = document.getElementById("notes-input");
    const fontSizeSelector = document.getElementById("font-size-selector");
    const fontColorSelector = document.getElementById("font-color-selector");

    // Session expiration handler
    function handleSessionExpiration(error) {
        if (error.message && error.message.includes('Session expired')) {
            window.location.reload();
            return true;
        }
        return false;
    }

    // Enable styleWithCSS to allow inline styles
    document.execCommand("styleWithCSS", false, true);

    // Apply custom font size
    fontSizeSelector.addEventListener("change", () => {
        const fontSize = fontSizeSelector.value; // Get the selected font size (e.g., "36pt")
        if (fontSize) {
            const scaledFontSize = parseInt(fontSize, 10) / 3 + "pt"; // Scale down by a factor of 3

            // Apply scaled font size to the selected text in the text box
            document.execCommand("fontSize", false, "7"); // Use a placeholder size
            const selectedElements = notesInput.querySelectorAll("font[size='7']");
            selectedElements.forEach((el) => {
                el.removeAttribute("size"); // Remove the placeholder size
                el.style.fontSize = scaledFontSize; // Apply the scaled-down font size
            });

            // Apply scaled font size to lists (ordered and unordered)
            const selectedLists = notesInput.querySelectorAll("ul, ol");
            selectedLists.forEach((list) => {
                list.style.fontSize = scaledFontSize; // Apply the scaled-down font size
            });
        }
    });

    // Apply the selected font color
    fontColorSelector.addEventListener("input", () => {
        const color = fontColorSelector.value;
        document.execCommand("foreColor", false, color);
    });

    // Handle updating slide durations and notes
    if (!updateSettingsButton.hasEventListener) {
        updateSettingsButton.hasEventListener = true;
        updateSettingsButton.addEventListener("click", async () => {
        const textDuration = parseInt(document.getElementById("text-duration").value, 10);
        const plotDuration = parseInt(document.getElementById("plot-duration").value, 10);
        const notesDuration = parseInt(document.getElementById("notes-duration").value, 10);

        try {
            // Only update slideshow timing here
            const updates = {
                settings: {
                    textDuration: textDuration * 1000,
                    plotDuration: plotDuration * 1000,
                    notesDuration: notesDuration * 1000
                }
            };

            const result = await window.DataManager.updateData(updates);
            if (!result) {
                throw new Error("Failed to update settings");
            }

        } catch (error) {
            if (!handleSessionExpiration(error)) {
            }
        }
    });
    }

    // Clear the default message when the user clicks into the text box
    notesInput.addEventListener("focus", () => {
        if (notesInput.textContent.trim() === "Enter announcements here...") {
            notesInput.textContent = ""; // Clear the default message
        }
    });


    // Handle clearing notes
    if (!clearNotesButton.hasEventListener) {
        clearNotesButton.hasEventListener = true;
        clearNotesButton.addEventListener("click", async () => {
        notesInput.innerHTML = ""; // Clear the text area

        try {
            // Clear notes in the settings
            const response = await window.DataManager.updateData({ notes: "" });
            if (response) {
            } else {
                throw new Error("Failed to clear notes");
            }
        } catch (error) {
            if (!handleSessionExpiration(error)) {
            }
        }
    });
    }

    // Handle updating notes
    if (!updateNotesButton.hasEventListener) {
        updateNotesButton.hasEventListener = true;
        updateNotesButton.addEventListener("click", async () => {
        const notes = notesInput.innerHTML; // Get the rich text content (with scaled font sizes)

        // Replace scaled font sizes with the original sizes before saving
        const updatedNotes = notes.replace(/font-size:\s?(\d+)pt;/g, (match, size) => {
            const originalSize = parseInt(size, 10) * 3; // Scale back to the original size
            return `font-size: ${originalSize}pt;`;
        });

        try {
            const response = await window.DataManager.updateData({ notes: updatedNotes });
            if (response) {
            } else {
                throw new Error("Failed to update Announcements");
            }
        } catch (error) {
            if (!handleSessionExpiration(error)) {
            }
        }
    });
    }

    // Handle updating plot data
    if (!updatePlotDataButton.hasEventListener) {
        updatePlotDataButton.hasEventListener = true;
        updatePlotDataButton.addEventListener("click", async () => {
        try {
            
            // Get all rows from the plot data table
            const table = document.getElementById("plot-data-table");
            const rows = table.querySelectorAll("tbody tr");
            const plotData = [];

            rows.forEach((row, index) => {
                const cells = row.querySelectorAll("td");
                if (cells.length >= 4) {
                    const date = parseInt(cells[0].textContent.trim());
                    const cleanroom = parseFloat(cells[1].textContent.trim());
                    const smt = parseFloat(cells[2].textContent.trim());
                    const cstc = parseFloat(cells[3].textContent.trim());
                    
                    // Only add if date is valid and at least one value is valid
                    if (!isNaN(date) && (!isNaN(cleanroom) || !isNaN(smt) || !isNaN(cstc))) {
                        plotData.push({ 
                            date: date,
                            cleanroom: isNaN(cleanroom) ? null : cleanroom,
                            smt: isNaN(smt) ? null : smt,
                            cstc: isNaN(cstc) ? null : cstc
                        });
                    }
                }
            });

            console.log(`📈 [${new Date().toISOString()}] Plot data prepared:`, plotData);

            const response = await window.DataManager.updateData({ plotData });
            if (response) {
            } else {
                throw new Error("Failed to update plot data");
            }
        } catch (error) {
            if (!handleSessionExpiration(error)) {
                console.error(`❌ [${new Date().toISOString()}] Failed to update plot data:`, error);
            }
        }
    });
    }

    // Fetch current settings from the server
    const fetchSettings = async () => {
        try {
            const settings = await window.DataManager.loadData();
            console.log(`✅ [${new Date().toISOString()}] Settings loaded:`, settings);
            populateFromSettings(settings);
        } catch (error) {
            console.error(`❌ [${new Date().toISOString()}] Error fetching settings:`, error);
            console.warn('Settings fetch failed - will retry later');
        }
    };

    // Helper function to populate UI from settings
    const populateFromSettings = (settings) => {
        const statuses = settings.statuses || {};

        // Set the initial toggle positions (only if not recently clicked)
        toggles.forEach((toggle) => {
            const area = toggle.dataset.area;
            const status = statuses[area]; // true = up, false = down

            // Don't override if user recently clicked (within last 2 seconds)
            if (toggle.lastClickTime && Date.now() - toggle.lastClickTime < 2000) {
                return;
            }

            // Clear existing classes and set correct state
            toggle.classList.remove("down", "up");
            if (status === false) {
                toggle.classList.add("down");
            } else {
                toggle.classList.add("up");
            }
        });

        // Populate notes input
        if (settings.notes) {
            notesInput.innerHTML = settings.notes;
        }

        // Populate durations
        if (settings.settings) {
            if (settings.settings.textDuration) {
                document.getElementById("text-duration").value = Math.floor(settings.settings.textDuration / 1000);
            }
            if (settings.settings.plotDuration) {
                document.getElementById("plot-duration").value = Math.floor(settings.settings.plotDuration / 1000);
            }
            if (settings.settings.notesDuration) {
                document.getElementById("notes-duration").value = Math.floor(settings.settings.notesDuration / 1000);
            }
        }

        // Populate OLI data
        if (settings.oli) {
            document.getElementById('oli-annual-goal').value = settings.oli.annualGoal || 0;
            document.getElementById('oli-q1').value = settings.oli.q1 || 0;
            document.getElementById('oli-q2').value = settings.oli.q2 || 0;
            document.getElementById('oli-q3').value = settings.oli.q3 || 0;
            document.getElementById('oli-q4').value = settings.oli.q4 || 0;
        }
    };

    // Initialize controller after authentication
    window.initializeController = async function() {
        try {
            await fetchSettings();
            if (window.populateCommitsTable) {
                await window.populateCommitsTable();
            }
            if (window.populatePlotTable) {
                await window.populatePlotTable();
            }
            
            // Initialize toggle functionality after authentication
            const toggles = document.querySelectorAll(".toggle-container");
            
            toggles.forEach((toggle, index) => {
                // Skip if already has listener
                if (toggle.hasToggleListener) return;
                toggle.hasToggleListener = true;
                                
                toggle.addEventListener("click", async () => {
                    const area = toggle.dataset.area;
                    toggle.lastClickTime = Date.now(); // Track when user clicked
                    
                    const isDown = toggle.classList.toggle("down"); // Toggle "down" class
                    toggle.classList.toggle("up", !isDown); // Toggle "up" class
                    const status = isDown ? "down" : "up";

                    try {
                        const updates = { statuses: {} };
                        updates.statuses[area] = (status === 'up');
                        
                        const response = await window.DataManager.updateData(updates);
                        if (!response) {
                            // Revert the toggle state on failure
                            toggle.classList.toggle("down", !isDown);
                            toggle.classList.toggle("up", isDown);
                        }
                    } catch (error) {
                        console.error("Error updating status:", error);
                        // Revert the toggle state on failure
                        toggle.classList.toggle("down", !isDown);
                        toggle.classList.toggle("up", isDown);
                    }
                });
            });
            
            
        } catch (error) {
            console.error(`❌ [${new Date().toISOString()}] Controller initialization failed:`, error.message);
            console.error('Controller initialization failed:', error);
        }
    };

    // Auto-initialize if already authenticated - IMMEDIATE EXECUTION
    // if (window.DataManager && window.DataManager.isAuthenticated()) {
    //     window.initializeController();

    // Allow auto initialization in local dev mode
    if (LOCAL_DEV_MODE || (window.DataManager && window.DataManager.isAuthenticated())) {
        window.initializeController();
    } else {
    }
    

    // Add logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout(); // Use the global logout function
        });
    }

    // OLI update logic
    const updateOLIButton = document.getElementById('update-oli');
    if (updateOLIButton) {
      updateOLIButton.addEventListener('click', async function() {
        const annualGoal = Number(document.getElementById('oli-annual-goal').value) || 0;
        const q1 = Number(document.getElementById('oli-q1').value) || 0;
        const q2 = Number(document.getElementById('oli-q2').value) || 0;
        const q3 = Number(document.getElementById('oli-q3').value) || 0;
        const q4 = Number(document.getElementById('oli-q4').value) || 0;
        // Get current commits from table
        const table = document.getElementById('user-table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const commits = rows.map(tr => {
          const tds = Array.from(tr.querySelectorAll('td'));
          return {
            partNumber: tds[0]?.innerText || '',
            quantity: Number(tds[1]?.innerText) || 0,
            date: tds[2]?.innerText || '',
            location: tds[3]?.innerText || ''
          };
        });
        try {
          const response = await window.DataManager.updateData({ oli: { annualGoal, q1, q2, q3, q4 }, commits });
          if (response) {
          } else {
            throw new Error('Failed to update OLI');
          }
        } catch (err) {
        }
      });
    }
} // End of setupController function