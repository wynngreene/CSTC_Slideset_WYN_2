// Wait until HTML is fully loaded before running JS
document.addEventListener("DOMContentLoaded", async () => {

    // =====================================================
    // 📦 DATA MANAGER (GET DATA FROM BACKEND)
    // =====================================================
    // This object is responsible for loading ALL data
    // (notes, commits, durations, statuses, chart data)

    const SlideshowDataManager = {
        async loadData() {
            try {
                // Fetch data from backend (public access)
                const response = await fetch('secure-data-handler.aspx?action=load&public=true');
                
                // If request worked
                if (response.ok) {
                    const result = await response.json();
                    
                    // If backend returned success
                    if (result.status === 'success') {

                        // Transform data structure to match expected format
                        const data = result.data;

                        const transformedData = {
                        // Notes / announcements
                        notes: data.notes || '',

                        // Screen durations (converted from ms → seconds)
                        durations: {
                            text: Math.round((data.settings?.textDuration || 5000) / 1000),
                            plot: Math.round((data.settings?.plotDuration || 15000) / 1000),
                            notes: Math.round((data.settings?.notesDuration || 10000) / 1000)
                        },

                        // Production statuses
                        statuses: data.statuses || {},

                        // Commit list
                        commits: data.commits || [],

                        // OLI data (progress tracking)
                        oli: {
                            annualGoal: data.oli?.annualGoal || 0,
                            quarters: {
                                q1: data.oli?.q1 || 0,
                                q2: data.oli?.q2 || 0,
                                q3: data.oli?.q3 || 0,
                                q4: data.oli?.q4 || 0
                            }
                        },

                        // Chart data
                        plotData: data.plotData || []
                    };
                        
                        console.log('✅ Slideshow data loaded successfully:', transformedData);
                        return transformedData;
                    } else {
                        console.error('API returned error:', result.message);
                        alert('Failed to load slideshow data: ' + result.message);
                    }
                } else {
                    console.error('Failed to fetch data:', response.status);
                    alert('Slideshow data fetch failed: HTTP ' + response.status);
                }
            } catch (error) {
                console.error('Error loading slideshow data:', error);
                alert('Slideshow error: ' + error.message);
            }
            
            // Fallback data (if backend fails)
            return {
                notes: '',
                durations: { text: 5, plot: 15, notes: 10 },
                statuses: {},
                commits: [],
                oli: { annualGoal: 0, quarters: { q1: 0, q2: 0, q3: 0, q4: 0 } },
                plotData: []
            };
        }
    };

    // =====================================================
    // 🖥 SCREEN SYSTEM (SLIDESHOW LOGIC)
    // =====================================================

    const screens = document.querySelectorAll(".screen");
    let currentScreenIndex = 0; // Start with the first screen (text)
    let timeoutId; // Declare a timeout ID at a higher scope

    // =====================================================
    // 🔄 PRODUCTION STATUS (WITH CACHE)
    // =====================================================

    let lastStatusUpdate = 0; // Cache timestamp for status updates
    const STATUS_CACHE_DURATION = 30000; // 30 seconds cache

    // Update production area status display (with caching)
    async function updateProductionAreaStatus() {

        // Skip if recently updated (reduces API calls)
        const now = Date.now();
        if (now - lastStatusUpdate < STATUS_CACHE_DURATION) {
            return; // Skip if updated recently
        }
        
        try {
            const data = await SlideshowDataManager.loadData();
            const statuses = data.statuses || {};
            
            // Loop through each status and update UI
            Object.keys(statuses).forEach(area => {
                const areaCard = document.getElementById(area);

                if (areaCard) {
                    if (statuses[area]) {
                        areaCard.classList.remove('down'); // area is UP
                    } else {
                        areaCard.classList.add('down'); // area is DOWN
                    }
                }
            });
            
            // Also check for areas that don't have status data (default to DOWN)
            const allAreaCards = document.querySelectorAll('.area-card');
            allAreaCards.forEach(card => {
                const areaId = card.id;
                if (!statuses.hasOwnProperty(areaId)) {
                    card.classList.add('down');
                }
            });
            
            lastStatusUpdate = now; // Update cache timestamp
            
        } catch (error) {
            console.error('Error updating production area status:', error);
            // On error, mark all areas as down
            const allAreaCards = document.querySelectorAll('.area-card');
            allAreaCards.forEach(card => {
                card.classList.add('down');
            });
        }
    }

    // =====================================================
    // 🎬 SHOW CURRENT SCREEN
    // =====================================================

    function showScreen(index) {
        screens.forEach((screen, i) => {
            if (i === index) {
                screen.classList.remove("hidden"); // Show the active screen
            } else {
                screen.classList.add("hidden"); // Hide all other screens
            }
        });
    }
    
    // =====================================================
    // 📋 COMMITS DISPLAY
    // =====================================================

    // async function updateCommitsDisplay() {
    //     try {
    //         const data = await SlideshowDataManager.loadData();
    //         const commits = data.commits || [];

    //         const commitsBody = document.getElementById('commits-display-body');
    //         if (!commitsBody) return;

    //         // If no commits → show default message
    //         if (!commits.length) {
    //             commitsBody.innerHTML = `
    //                 <tr>
    //                     <td colspan="4" style="padding: 1.5rem; text-align: center;">
    //                         No commits available.
    //                     </td>
    //                 </tr>
    //             `;
    //             return;
    //         }
    //         // Render commits into table rows
    //         commitsBody.innerHTML = commits
    //             .slice(0, 10) // only show top 10
    //             .map(commit => `
    //                 <tr>
    //                     <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.12);">
    //                         ${commit.partNumber || ''}
    //                     </td>
    //                     <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.12);">
    //                         ${commit.quantity ?? ''}
    //                     </td>
    //                     <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.12);">
    //                         ${commit.date || ''}
    //                     </td>
    //                     <td style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.12);">
    //                         ${commit.location || ''}
    //                     </td>
    //                 </tr>
    //             `)
    //             .join('');
    //     } catch (error) {
    //         console.error('Error loading commits data:', error);

    //         const commitsBody = document.getElementById('commits-display-body');
    //         if (commitsBody) {
    //             commitsBody.innerHTML = `
    //                 <tr>
    //                     <td colspan="4" style="padding: 1.5rem; text-align: center;">
    //                         Error loading commits.
    //                     </td>
    //                 </tr>
    //             `;
    //         }
    //     }
    // }

    async function updateCommitsDisplay() {
    try {
        const data = await SlideshowDataManager.loadData();
        const commits = data.commits || [];

        const grid = document.getElementById('commits-grid');

        const col1 = document.getElementById('commits-col-1');
        const col2 = document.getElementById('commits-col-2');
        const col3 = document.getElementById('commits-col-3');

        if (!grid || !col1 || !col2 || !col3) return;

        // RESET
        col1.innerHTML = '';
        col2.innerHTML = '';
        col3.innerHTML = '';

        const count = commits.length;

        // =========================
        // CASE 0: NO COMMITS
        // =========================
        if (count === 0) {
            grid.className = 'commits-grid cols-1';

            col1.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">No commits.</td>
                </tr>
            `;

            col2.parentElement.classList.add('hidden');
            col3.parentElement.classList.add('hidden');
            return;
        }

        // =========================
        // DETERMINE COLUMNS
        // =========================
        let columns = 1;

        if (count <= 10) columns = 1;
        else if (count <= 20) columns = 2;
        else columns = 3;

        grid.className = `commits-grid cols-${columns}`;

        // SHOW/HIDE PANELS
        col1.parentElement.classList.remove('hidden');
        col2.parentElement.classList.toggle('hidden', columns < 2);
        col3.parentElement.classList.toggle('hidden', columns < 3);

        // =========================
        // SPLIT DATA EVENLY
        // =========================
        const perColumn = Math.ceil(count / columns);

        const groups = [
            commits.slice(0, perColumn),
            commits.slice(perColumn, perColumn * 2),
            commits.slice(perColumn * 2)
        ];

        const columnsArr = [col1, col2, col3];

        columnsArr.forEach((col, index) => {
            if (index >= columns) return;

            const group = groups[index];

            col.innerHTML = group.map(c => `
                <tr>
                    <td>${c.partNumber || ''}</td>
                    <td>${c.quantity ?? ''}</td>
                    <td>${c.date || ''}</td>
                    <td>${c.location || ''}</td>
                </tr>
            `).join('');
        });

    } catch (error) {
        console.error('Error loading commits:', error);
    }
}

    // =====================================================
    // 🔄 SWITCH SCREENS (CORE LOGIC)
    // =====================================================

    async function switchScreen() {

        // Move to next screen
        let nextScreenIndex;
        let attempts = 0;
        
        do {
            // Increment the screen index
            currentScreenIndex = (currentScreenIndex + 1) % screens.length;
            nextScreenIndex = currentScreenIndex;
            attempts++;
            
            // ===== NOTES SCREEN LOGIC =====
            // Check if this is the notes screen and if we should skip it
            if (screens[currentScreenIndex].id === "notes-screen") {
                try {
                    const data = await SlideshowDataManager.loadData();
                    const notes = data.notes || '';
                    const notesContent = document.getElementById('notes-content');

                    if (notesContent) {
                        // If empty → show fallback
                        if (!notes || notes.trim() === '' || notes.trim() === 'Enter announcements here...') {
                            notesContent.innerHTML = '<p style="opacity: 0.7;">No announcements available.</p>';
                        } else {
                            notesContent.innerHTML = notes;
                        }
                    }
                } catch (error) {
                    console.error('Error loading notes data:', error);
                    continue; // Skip this screen on error
                }
            }
            
            break; // Found a valid screen to show
            
        } while (attempts < screens.length); // Prevent infinite loop
    
        // Show the current screen
        showScreen(currentScreenIndex);
        
        // ===== SPECIAL SCREEN ACTIONS =====
        // Update production area status only on text screen or every 3rd screen change to reduce API calls
        if (screens[currentScreenIndex].id === "text-screen" || currentScreenIndex % 3 === 0) {
            await updateProductionAreaStatus();
        }
        
        // If switching to plot screen, refresh the chart data
        if (screens[currentScreenIndex].id === "plot-screen") {
            await createAbsorptionChart();
            await updateOLIProgressBar(); // Update OLI data when showing plot
        }

        if (screens[currentScreenIndex].id === "commits-screen") {
            await updateCommitsDisplay();
        }
    
          // ===== SET SCREEN DURATION =====
        // Determine the duration for the current screen
        const currentScreenId = screens[currentScreenIndex].id;
        let nextDuration;
        
        try {
            const data = await SlideshowDataManager.loadData();
            const durations = data.durations || { text: 5, plot: 15, notes: 10 };
            
            switch (currentScreenId) {
                case "text-screen":
                    nextDuration = (durations.text || 5) * 1000;
                    break;
                case "plot-screen":
                    nextDuration = (durations.plot || 15) * 1000;
                    break;
                case "notes-screen":
                    nextDuration = (durations.notes || 10) * 1000;
                    break;
                case "commits-screen":
                    nextDuration = (durations.notes || 10) * 1000;
                    break;
                default:
                    nextDuration = 5000;
            }

        } catch (error) {
            console.error('Error loading duration data:', error);
            nextDuration = currentScreenId === "text-screen" ? 5000 : 15000; // Fallback
        }
    
        // Schedule the next screen switch
        timeoutId = setTimeout(switchScreen, nextDuration);
    }

    // =====================================================
    // ▶ START SLIDESHOW
    // =====================================================

    async function startScreenSwitching() {
        clearTimeout(timeoutId); // Clear any existing timeout
        showScreen(currentScreenIndex); // Show the first screen
        
        // Get initial duration from data
        let initialDuration = 5000; // Default
        try {
            const data = await SlideshowDataManager.loadData();
            const durations = data.durations || { text: 5, plot: 15, notes: 10 };
            initialDuration = (durations.text || 5) * 1000;
        } catch (error) {
            console.error('Error loading initial duration:', error);
        }
        
        timeoutId = setTimeout(switchScreen, initialDuration);
    }

    // Get today's date
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.toLocaleString("default", { month: "long" }); // Get the current month name

    // Generate x-axis labels (days of the month up to current day)
    const days = Array.from({ length: currentDay }, (_, i) => i + 1);

    // =====================================================
    // 📊 CHART LOGIC (Chart.js)
    // =====================================================

    let absorptionChart = null;

    // Fetch plot data from data manager
    async function createAbsorptionChart() {
        try {
            const config = await SlideshowDataManager.loadData();
            const plotData = config.plotData || [];
            
            // Sort plot data by date
            plotData.sort((a, b) => a.date - b.date);
            
            // Filter data to only include days up to current day
            const filteredData = plotData.filter(item => item.date <= currentDay);
            
            // Prepare data arrays for different datasets
            const cleanroomData = [];
            const smtData = [];
            const cstcData = [];
            
            // Fill arrays with data from controller table
            for (let day = 1; day <= currentDay; day++) {
                const dataPoint = filteredData.find(item => item.date === day);
                if (dataPoint) {
                    cleanroomData.push(dataPoint.cleanroom || null);
                    smtData.push(dataPoint.smt || null);
                    cstcData.push(dataPoint.cstc || null);
                } else {
                    // Fill missing days with null to create gaps in the chart
                    cleanroomData.push(null);
                    smtData.push(null);
                    cstcData.push(null);
                }
            }
            
            createLineChart(
                "absorption-chart",
                `${currentMonth} Absorption`,
                cleanroomData,
                smtData,
                cstcData
            );
        } catch (error) {
            console.error('Error fetching plot data:', error);
            // Fallback to empty data if fetch fails
            createLineChart(
                "absorption-chart",
                `${currentMonth} Absorption`,
                [],
                [],
                []
            );
        }
    }

    function createLineChart(canvasId, title, cleanroomData, smtData, cstcData) {
        // Set the HTML title
        document.getElementById('absorption-title').textContent = title;

        // If chart already exists → update instead of recreate
        if (absorptionChart) {
            absorptionChart.data.datasets[0].data = cleanroomData;
            absorptionChart.data.datasets[1].data = smtData;
            absorptionChart.data.datasets[2].data = cstcData;
            absorptionChart.data.labels = days;
            absorptionChart.update('none'); // Update without animation to prevent flickering
            return;
        }

        const ctx = document.getElementById(canvasId).getContext("2d");
        absorptionChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: days, // X-axis labels (1 to current day)
                datasets: [
                    {
                        label: "Cleanroom",
                        data: cleanroomData,
                        borderColor: "rgba(0, 123, 255, 0.8)",
                        backgroundColor: "rgba(0, 123, 255, 0.8)",
                        fill: false,
                        tension: 0.3,
                        spanGaps: false, // Don't connect across null values
                    },
                    {
                        label: "SMT",
                        data: smtData,
                        borderColor: "rgba(40, 167, 69, 0.8)",
                        backgroundColor: "rgba(40, 167, 69, 0.8)",
                        fill: false,
                        tension: 0.3,
                        spanGaps: false,
                    },
                    {
                        label: "CSTC",
                        data: cstcData,
                        borderColor: "rgba(255, 193, 7, 0.8)",
                        backgroundColor: "rgba(255, 193, 7, 0.8)",
                        fill: false,
                        tension: 0.3,
                        spanGaps: false,
                    }
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allow chart to fill container height
                plugins: {
                    legend: {
                        display: false, // Hide Chart.js built-in legend
                    }
                },
                scales: {
                    x: {
                        min: 1,
                        max: currentDay,
                        title: {
                            display: true,
                            text: 'Day of Month',
                            color: 'white',
                            font: { 
                                size: 28, // Increased from 20 to 28
                                weight: 'bold'
                            }
                        },
                        ticks: { 
                            color: "white", 
                            font: { size: 24 }, // Increased from 18 to 24
                            stepSize: 1
                        },
                        grid: { color: "rgba(255,255,255,0.2)" }
                    },
                    y: {
                        min: 0,
                        max: 120,
                        ticks: {
                            color: "white",
                            font: { size: 24 }, // Increased from 18 to 24
                            callback: value => value + "%"
                        },
                        grid: { color: "rgba(255,255,255,0.2)" }
                    }
                }
            }
        });
        // Use the custom legend
        document.getElementById('absorption-legend').innerHTML = generateLegend(absorptionChart);
    }

    function generateLegend(chart) {
        const datasets = chart.data.datasets;
        let legendHtml = '<ul style="list-style:none;display:flex;gap:32px;padding:0;margin:0;font-size:1.4em;">';
        datasets.forEach(ds => {
            legendHtml += `
                <li style="display:flex;align-items:center;">
                    <span style="display:inline-block;width:24px;height:24px;background:${ds.borderColor};border-radius:50%;margin-right:12px;"></span>
                    <span style="padding:0 16px;font-weight:bold;">${ds.label}</span>
                </li>
            `;
        });
        legendHtml += '</ul>';
        return legendHtml;
    }

    // =====================================================
    // 📈 OLI PROGRESS BAR
    // =====================================================

    // async function updateOLIProgressBar() {
    //     try {
    //         const config = await SlideshowDataManager.loadData();
    //         const oli = config.oli || { annualGoal: 100, quarters: { q1: 0, q2: 0, q3: 0, q4: 0 } };
    //         const goal = Number(oli.annualGoal) || 100;
    //         const q1 = Number(oli.quarters?.q1) || 0;
    //         const q2 = Number(oli.quarters?.q2) || 0;
    //         const q3 = Number(oli.quarters?.q3) || 0;
    //         const q4 = Number(oli.quarters?.q4) || 0;
    //         const current = q1 + q2 + q3 + q4;
            
    //         // Calculate widths as percent of goal for each quarter
    //         const q1Width = Math.max((q1 / goal) * 100, 0);
    //         const q2Width = Math.max((q2 / goal) * 100, 0);
    //         const q3Width = Math.max((q3 / goal) * 100, 0);
    //         const q4Width = Math.max((q4 / goal) * 100, 0);
            
    //         // Set bar widths and update values
    //         const q1Bar = document.getElementById('oli-q1-bar');
    //         const q2Bar = document.getElementById('oli-q2-bar');
    //         const q3Bar = document.getElementById('oli-q3-bar');
    //         const q4Bar = document.getElementById('oli-q4-bar');
            
    //         q1Bar.style.width = q1Width + '%';
    //         q2Bar.style.width = q2Width + '%';
    //         q3Bar.style.width = q3Width + '%';
    //         q4Bar.style.width = q4Width + '%';
            
    //         // Update the values displayed in each quarter
    //         document.getElementById('q1-value').textContent = q1;
    //         document.getElementById('q2-value').textContent = q2;
    //         document.getElementById('q3-value').textContent = q3;
    //         document.getElementById('q4-value').textContent = q4;
            
    //         // Set data attributes for CSS styling (show/hide values based on width)
    //         q1Bar.setAttribute('data-width', q1Width > 0 ? q1Width : '0');
    //         q2Bar.setAttribute('data-width', q2Width > 0 ? q2Width : '0');
    //         q3Bar.setAttribute('data-width', q3Width > 0 ? q3Width : '0');
    //         q4Bar.setAttribute('data-width', q4Width > 0 ? q4Width : '0');
            
    //         // Position quarter labels under the center of each segment
    //         const q1Label = document.querySelector('.quarter-labels span:nth-child(1)');
    //         const q2Label = document.querySelector('.quarter-labels span:nth-child(2)');
    //         const q3Label = document.querySelector('.quarter-labels span:nth-child(3)');
    //         const q4Label = document.querySelector('.quarter-labels span:nth-child(4)');
            
    //         // Calculate cumulative positions for segment centers
    //         const q1Center = q1Width / 2;
    //         const q2Center = q1Width + (q2Width / 2);
    //         const q3Center = q1Width + q2Width + (q3Width / 2);
    //         const q4Center = q1Width + q2Width + q3Width + (q4Width / 2);
            
    //         // Only position labels if segments have width > 0
    //         if (q1Width > 0) q1Label.style.left = q1Center + '%';
    //         else q1Label.style.left = '0%';
            
    //         if (q2Width > 0) q2Label.style.left = q2Center + '%';
    //         else q2Label.style.left = '25%';
            
    //         if (q3Width > 0) q3Label.style.left = q3Center + '%';
    //         else q3Label.style.left = '50%';
            
    //         if (q4Width > 0) q4Label.style.left = q4Center + '%';
    //         else q4Label.style.left = '75%';
            
    //         // Update progress text - cleaner format
    //         const progressPercentage = Math.round((current / goal) * 100);
    //         const remaining = Math.max(goal - current, 0);
    //         document.getElementById('progress-text').textContent = `${current} / ${goal} Ideas (${progressPercentage}%) • ${remaining} Remaining`;
    //     } catch (err) {
    //         document.getElementById('progress-text').textContent = 'Error loading OLI progress';
    //     }
    // }

    async function updateOLIProgressBar() {
    try {
        const config = await SlideshowDataManager.loadData();
        const oli = config.oli || { annualGoal: 100, quarters: { q1: 0, q2: 0, q3: 0, q4: 0 } };

        const goal = Number(oli.annualGoal) || 100;
        const q1 = Number(oli.quarters?.q1) || 0;
        const q2 = Number(oli.quarters?.q2) || 0;
        const q3 = Number(oli.quarters?.q3) || 0;
        const q4 = Number(oli.quarters?.q4) || 0;

        const current = q1 + q2 + q3 + q4;

        const q1Bar = document.getElementById('oli-q1-bar');
        const q2Bar = document.getElementById('oli-q2-bar');
        const q3Bar = document.getElementById('oli-q3-bar');
        const q4Bar = document.getElementById('oli-q4-bar');

        const q1Value = document.getElementById('q1-value');
        const q2Value = document.getElementById('q2-value');
        const q3Value = document.getElementById('q3-value');
        const q4Value = document.getElementById('q4-value');

        const progressText = document.getElementById('progress-text');

        const labels = document.querySelectorAll('.quarter-labels span');

        if (!q1Bar || !q2Bar || !q3Bar || !q4Bar || !q1Value || !q2Value || !q3Value || !q4Value || !progressText || labels.length < 4) {
            console.error('OLI display elements are missing.');
            return;
        }

        const q1Width = Math.max((q1 / goal) * 100, q1 > 0 ? 2 : 0);
        const q2Width = Math.max((q2 / goal) * 100, q2 > 0 ? 2 : 0);
        const q3Width = Math.max((q3 / goal) * 100, q3 > 0 ? 2 : 0);
        const q4Width = Math.max((q4 / goal) * 100, q4 > 0 ? 2 : 0);

        q1Bar.style.width = `${q1Width}%`;
        q2Bar.style.width = `${q2Width}%`;
        q3Bar.style.width = `${q3Width}%`;
        q4Bar.style.width = `${q4Width}%`;

        q1Value.textContent = q1;
        q2Value.textContent = q2;
        q3Value.textContent = q3;
        q4Value.textContent = q4;

        q1Bar.setAttribute('data-width', q1Width > 0 ? q1Width : '0');
        q2Bar.setAttribute('data-width', q2Width > 0 ? q2Width : '0');
        q3Bar.setAttribute('data-width', q3Width > 0 ? q3Width : '0');
        q4Bar.setAttribute('data-width', q4Width > 0 ? q4Width : '0');

        const progressPercentage = Math.round((current / goal) * 100);
        const remaining = Math.max(goal - current, 0);

        progressText.textContent = `${current} / ${goal} Ideas (${progressPercentage}%) • ${remaining} Remaining`;

    } catch (err) {
        console.error('Error loading OLI progress:', err);

        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = 'Error loading OLI progress';
        }
    }
}

    // =====================================================
    // 🚀 INIT APP
    // =====================================================
    
    try {
        await createAbsorptionChart();
        await updateOLIProgressBar();
        await updateCommitsDisplay();
        startScreenSwitching();
    } catch (error) {
        console.error('Slideshow initialization failed:', error);
        
        // Show error message to user
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            font-family: Arial, sans-serif;
            font-size: 1.2rem;
            max-width: 600px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        if (error.message.includes('Backend unavailable')) {
            errorMessage.innerHTML = `
                <h3>⚠️ Data Backend Unavailable</h3>
                <p>This slideshow requires a data backend to function properly.</p>
                <p>Please contact IT support to ensure the backend service is running.</p>
                <small style="opacity: 0.8; display: block; margin-top: 1rem;">
                    Technical details: ${error.message}
                </small>
            `;
        } else {
            errorMessage.innerHTML = `
                <h3>⚠️ Slideshow Error</h3>
                <p>Unable to initialize the slideshow display.</p>
                <p>Please refresh the page or contact IT support.</p>
                <small style="opacity: 0.8; display: block; margin-top: 1rem;">
                    Error: ${error.message}
                </small>
            `;
        }
        
        document.body.appendChild(errorMessage);
        
        // Hide all screens to prevent broken display
        screens.forEach(screen => {
            screen.style.display = 'none';
        });
    }
});