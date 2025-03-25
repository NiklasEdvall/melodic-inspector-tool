// ==UserScript==
// @name         MELODIC Inspector Tool
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add checkboxes and CSV export for MELODIC component inspection
// @author       Claude
// @match        */*.html
// @match        */nav.html
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        window.focus
// @grant        GM_addElement
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Mode and state management
    let mode = 'identify'; // 'identify' or 'decision'
    let reportsPath = '';
    let raterData = null;
    let uncertainComponents = new Set();

    // Store checked component IDs using GM_setValue/GM_getValue for better persistence across pages
    let checkedComponents = [];
    
    // Current subject/session info
    let currentSubject = '';
    let currentSession = '';

    // Load previously checked components
    function loadCheckedComponents() {
        const savedComponents = GM_getValue('melodicCheckedComponents', '[]');
        checkedComponents = JSON.parse(savedComponents);
    }

    // Save checked components
    function saveCheckedComponents() {
        GM_setValue('melodicCheckedComponents', JSON.stringify(checkedComponents));
    }

    // Add after the existing load/save functions
    function loadUncertainComponents() {
        try {
            const savedUncertain = GM_getValue('melodicUncertainComponents', '[]');
            const parsed = JSON.parse(savedUncertain);
            uncertainComponents = new Set(parsed);
            console.log('Loaded uncertain components:', [...uncertainComponents]);
        } catch (e) {
            console.error('Error loading uncertain components:', e);
            uncertainComponents = new Set();
        }
    }

    function saveUncertainComponents() {
        GM_setValue('melodicUncertainComponents', JSON.stringify([...uncertainComponents]));
    }

    function shouldShowComponent(componentId) {
        if(mode === 'identify') return true;
        
        if(!raterData || !currentSubject || !currentSession) return false;
        
        const sessionData = raterData[currentSubject]?.[currentSession];
        if(!sessionData) return false;
        
        return sessionData.disputed.includes(componentId);
    }

    // Add this function near the top with other utility functions
    function extractSubjectSession(path) {
        const match = path.match(/reports\/([^/]+)\/([^/]+)\//);
        if (!match) return null;
        return {
            subject: match[1],
            session: match[2]
        };
    }

    function getCurrentSubjectSession() {
        const path = window.location.pathname;
        const match = path.match(/reports\/([^/]+)\/([^/]+)\//);
        if (!match) {
            // Try to get from URL parameters or path segments
            const segments = path.split('/');
            const subIndex = segments.findIndex(s => s.startsWith('sub-'));
            const sesIndex = segments.findIndex(s => s.startsWith('ses-'));
            if (subIndex !== -1 && sesIndex !== -1) {
                return {
                    subject: segments[subIndex],
                    session: segments[sesIndex]
                };
            }
            return null;
        }
        return {
            subject: match[1],
            session: match[2]
        };
    }

    // Add checkbox to component pages
    function addCheckbox() {
        // Check if this is a component page
        const path = window.location.pathname;
        if (!path.includes('IC_') || !document.querySelector('h3')) {
            return;
        }

        // Extract subject and session from path
        const subjectInfo = extractSubjectSession(path);
        if (subjectInfo) {
            currentSubject = subjectInfo.subject;
            currentSession = subjectInfo.session;
        }

        // Extract the component number
        const match = path.match(/IC_(\d+)\.html/);
        if (!match) {
            return;
        }

        const componentId = parseInt(match[1], 10);
        
        // Add this near the top of addCheckbox() function
        console.log('Current path:', path);
        console.log('Subject/Session:', currentSubject, currentSession);
        console.log('Mode:', mode);
        console.log('Rater data:', raterData);
        console.log('Should show:', shouldShowComponent(componentId));

        if(!shouldShowComponent(componentId)) {
            // Hide this component from index
            if(document.querySelector('a[href*="IC_' + componentId + '.html"]')) {
                document.querySelector('a[href*="IC_' + componentId + '.html"]')
                    .parentElement.style.display = 'none';
            }
            return;
        }

        // Create checkbox container
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.position = 'fixed';
        checkboxContainer.style.top = '10px';
        checkboxContainer.style.right = '10px';
        checkboxContainer.style.backgroundColor = 'white';
        checkboxContainer.style.padding = '10px';
        checkboxContainer.style.border = '1px solid #ccc';
        checkboxContainer.style.borderRadius = '5px';
        checkboxContainer.style.zIndex = '9999';

        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'component-checkbox';
        checkbox.checked = checkedComponents.includes(componentId);
        checkbox.style.marginRight = '5px';

        // Create label
        const label = document.createElement('label');
        label.htmlFor = 'component-checkbox';
        label.textContent = `Exclude Component ${componentId}`;

        // Add event listener
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                if (!checkedComponents.includes(componentId)) {
                    checkedComponents.push(componentId);
                }
            } else {
                const index = checkedComponents.indexOf(componentId);
                if (index !== -1) {
                    checkedComponents.splice(index, 1);
                    // Also uncheck uncertain when main checkbox is unchecked
                    uncertainComponents.delete(componentId);
                    if (document.getElementById('uncertain-checkbox')) {
                        document.getElementById('uncertain-checkbox').checked = false;
                    }
                    saveUncertainComponents();
                }
            }
            saveCheckedComponents();
        });

        // Append elements
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        document.body.appendChild(checkboxContainer);

        if(mode === 'decision') {
            // Add uncertain checkbox
            const uncertainCheckbox = document.createElement('input');
            uncertainCheckbox.type = 'checkbox';
            uncertainCheckbox.id = 'uncertain-checkbox';
            uncertainCheckbox.style.marginLeft = '10px';
            uncertainCheckbox.checked = uncertainComponents.has(componentId);
            
            const uncertainLabel = document.createElement('label');
            uncertainLabel.htmlFor = 'uncertain-checkbox';
            uncertainLabel.textContent = 'Uncertain';
            uncertainLabel.style.marginLeft = '5px';
            
            uncertainCheckbox.addEventListener('change', function() {
                console.log('Uncertain checkbox changed for component:', componentId);
                if(this.checked) {
                    uncertainComponents.add(componentId);
                    console.log('Added to uncertain:', componentId);
                    // Also select the component if not already selected
                    if (!checkedComponents.includes(componentId)) {
                        checkedComponents.push(componentId);
                        checkbox.checked = true;
                    }
                } else {
                    uncertainComponents.delete(componentId);
                    console.log('Removed from uncertain:', componentId);
                }
                console.log('Current uncertain components:', [...uncertainComponents]);
                saveUncertainComponents();
                saveCheckedComponents();
            });
            
            checkboxContainer.appendChild(uncertainCheckbox);
            checkboxContainer.appendChild(uncertainLabel);
        }
    }

    // Add export button to index page
    function addExportButton() {
        // Check if this is the index page
        if (!window.location.pathname.includes('00index.html') &&
            !window.location.pathname.includes('index.html')) {
            return;
        }

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'fixed';
        buttonContainer.style.top = '10px';
        buttonContainer.style.right = '10px';
        buttonContainer.style.backgroundColor = 'white';
        buttonContainer.style.padding = '10px';
        buttonContainer.style.border = '1px solid #ccc';
        buttonContainer.style.borderRadius = '5px';
        buttonContainer.style.zIndex = '9999';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '10px';

        // Create mode selector
        const modeButton = document.createElement('button');
        modeButton.textContent = `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
        modeButton.style.padding = '5px 10px';
        modeButton.style.cursor = 'pointer';
        modeButton.addEventListener('click', async () => {
            if(mode === 'identify') {
                mode = 'decision';
                if(!raterData) {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt';
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        raterData = await loadRaterData(file);
                        GM_setValue('raterData', JSON.stringify(raterData));
                        GM_setValue('melodicMode', mode);
                        location.reload();
                    };
                    input.click();
                }
            } else {
                mode = 'identify';
                GM_setValue('melodicMode', mode);
                location.reload();
            }
            modeButton.textContent = `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
        });

        // Create export button
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Download CSV';
        exportButton.style.padding = '5px 10px';
        exportButton.style.cursor = 'pointer';

        // Create clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Selection';
        clearButton.style.padding = '5px 10px';
        clearButton.style.cursor = 'pointer';

        // Create component count display
        const countDisplay = document.createElement('div');
        updateCountDisplay();

        function updateCountDisplay() {
            loadCheckedComponents();
            loadUncertainComponents();

            const formattedComponents = checkedComponents.sort((a, b) => a - b)
                .map(comp => uncertainComponents.has(comp) ? `(${comp})` : comp)
                .join(', ');

            countDisplay.textContent = `Selected: ${checkedComponents.length} components`;
            if (checkedComponents.length > 0) {
                countDisplay.textContent += ` (${formattedComponents})`;
            }
        }

        // Add event listener for export
        exportButton.addEventListener('click', function() {
            // Reload the latest checked components before exporting
            loadCheckedComponents();
            promptAndExportCSV();
        });

        // Add event listener for clear
        clearButton.addEventListener('click', function() {
            checkedComponents = [];
            uncertainComponents.clear();
            saveCheckedComponents();
            saveUncertainComponents();
            updateCountDisplay();
        });

        // Append elements in this order
        buttonContainer.appendChild(modeButton);
        buttonContainer.appendChild(countDisplay);
        buttonContainer.appendChild(exportButton);
        buttonContainer.appendChild(clearButton);
        document.body.appendChild(buttonContainer);

        // Set interval to update count display
        setInterval(updateCountDisplay, 1000);
    }

    // Prompt for filename and export CSV
    function promptAndExportCSV() {
        if (checkedComponents.length === 0) {
            alert('No components selected!');
            return;
        }

        // Get current subject/session for default filename
        const info = getCurrentSubjectSession();
        const defaultFileName = info ? 
            `${info.subject}_${info.session}.csv` : 
            'melodic-components.csv';

        // Create CSV content
        const csvContent = getCSVContent();
        if (!csvContent) {
            alert('Error generating CSV content!');
            return;
        }

        // Prompt user for filename
        const fileName = prompt('Enter filename for CSV export:', defaultFileName);
        
        // Check if user cancelled the prompt
        if (fileName === null) {
            return;
        }

        // Use entered filename or default if empty
        const finalFileName = fileName.trim() || defaultFileName;

        // Ensure .csv extension
        const fileNameWithExtension = finalFileName.endsWith('.csv') ? finalFileName : `${finalFileName}.csv`;

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileNameWithExtension);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function getCSVContent() {
        if(mode === 'identify') {
            return checkedComponents.sort((a,b) => a-b).join(',');
        }
        
        // Decision mode
        const info = getCurrentSubjectSession();
        if (!info) {
            console.error('Could not determine subject/session from URL');
            return '';
        }
        
        const sessionData = raterData[info.subject]?.[info.session];
        if (!sessionData) {
            console.error('No session data found for', info.subject, info.session);
            return '';
        }

        // Get components both raters agreed on - convert to strings
        const agreed = sessionData.raterA
            .filter(x => sessionData.raterB.includes(x))
            .map(String);
        
        // Get selected disputed components and format them
        const selectedDisputed = checkedComponents
            .filter(x => sessionData.disputed.includes(x))
            .map(x => uncertainComponents.has(x) ? `(${x})` : String(x));
        
        // Combine and sort all components
        const allComponents = [...agreed, ...selectedDisputed];
        return allComponents
            .sort((a,b) => {
                const numA = parseInt(String(a).replace(/[()]/g, '') || '0');
                const numB = parseInt(String(b).replace(/[()]/g, '') || '0');
                return numA - numB;
            })
            .join(',');
    }

    // Load rater data from file
    async function loadRaterData(file) {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split('\t');
        
        const data = {};
        
        for(let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if(!line) continue;
            
            const [subject, session, raterA, raterB] = line.split('\t');
            
            // Parse component lists
            const compA = raterA.replace(/"/g, '').split(',').map(Number);
            const compB = raterB.replace(/"/g, '').split(',').map(Number);
            
            if(!data[subject]) data[subject] = {};
            data[subject][session] = {
                raterA: compA,
                raterB: compB,
                disputed: compA.filter(x => !compB.includes(x))
                    .concat(compB.filter(x => !compA.includes(x)))
            };
        }
        
        return data;
    }

    function addControls() {
        if (!window.location.pathname.includes('00index.html') &&
            !window.location.pathname.includes('index.html')) {
            return;
        }

        const controlContainer = document.createElement('div');
        // ...existing style code...

        // Mode selector
        const modeSelect = document.createElement('select');
        modeSelect.innerHTML = `
            <option value="identify">Identify Mode</option>
            <option value="decision">Decision Mode</option>
        `;
        modeSelect.addEventListener('change', async (e) => {
            mode = e.target.value;
            GM_setValue('melodicMode', mode);
            
            if(mode === 'decision' && !raterData) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    raterData = await loadRaterData(file);
                    GM_setValue('raterData', JSON.stringify(raterData));
                    location.reload();
                };
                input.click();
            } else {
                location.reload();
            }
        });

        // Reports path selector
        const pathButton = document.createElement('button');
        pathButton.textContent = 'Set Reports Path';
        pathButton.addEventListener('click', () => {
            const path = prompt('Enter path to reports folder:', reportsPath);
            if(path) {
                reportsPath = path;
                GM_setValue('reportsPath', path);
            }
        });

        controlContainer.appendChild(modeSelect);
        controlContainer.appendChild(pathButton);
        // ...rest of controls
    }

    // Add this new function after the other utility functions
    function updateNavigationBar() {
        // Only run this code if we're in the navigation frame
        if (!window.location.pathname.endsWith('nav.html')) {
            return;
        }

        try {
            const font = document.querySelector('font');
            if (!font) return;

            // Get mode and rater data from storage
            const currentMode = GM_getValue('melodicMode', 'identify');
            const currentRaterData = JSON.parse(GM_getValue('raterData', 'null'));

            if (currentMode === 'decision' && currentRaterData) {
                // Extract subject/session from URL
                const urlParts = window.location.pathname.split('/');
                const subIndex = urlParts.findIndex(p => p.startsWith('sub-'));
                const sesIndex = urlParts.findIndex(p => p.startsWith('ses-'));
                
                if (subIndex === -1 || sesIndex === -1) return;
                
                const subject = urlParts[subIndex];
                const session = urlParts[sesIndex];
                
                if (!currentRaterData[subject]?.[session]) return;

                const disputedSet = new Set(currentRaterData[subject][session].disputed);
                console.log('Disputed components:', [...disputedSet]);

                // Update visibility of component links
                const links = Array.from(font.getElementsByTagName('a'));
                links.forEach(link => {
                    const match = link.href?.match(/IC_(\d+)\.html/);
                    if (match) {
                        const componentId = parseInt(match[1], 10);
                        if (!disputedSet.has(componentId)) {
                            link.style.display = 'none';
                            if (link.nextSibling?.nodeType === Node.TEXT_NODE) {
                                link.nextSibling.textContent = '';
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Error updating navigation:', e);
        }
    }

    // Initialize
    loadCheckedComponents();
    loadUncertainComponents();

    // Load saved mode
    const savedMode = GM_getValue('melodicMode', 'identify');
    if(savedMode === 'decision') {
        const savedRaterData = GM_getValue('raterData', null);
        if(savedRaterData) {
            mode = 'decision';
            raterData = JSON.parse(savedRaterData);
        }
    }

    addCheckbox();
    addExportButton();
    addControls();
    updateNavigationBar();

    // Update navigation bar when page loads and after iframe loads
    document.addEventListener('DOMContentLoaded', updateNavigationBar);
    window.addEventListener('load', updateNavigationBar);
})();