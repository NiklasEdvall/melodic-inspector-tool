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
        console.log('shouldShowComponent called with:', componentId, 'mode:', mode);
        
        if(mode === 'identify') {
            console.log('In identify mode - showing component');
            return true;
        }
        
        if(!raterData || !currentSubject || !currentSession) {
            console.log('Missing data:', {
                raterData: !!raterData,
                currentSubject,
                currentSession
            });
            // In decision mode, if we don't have the required data, still show the component
            // This prevents components from being hidden when they shouldn't be
            return true;
        }
        
        const sessionData = raterData[currentSubject]?.[currentSession];
        if(!sessionData) {
            console.log('No session data found for', currentSubject, currentSession);
            return true; // Show component if no session data
        }
        
        const shouldShow = sessionData.disputed.includes(componentId);
        console.log('Component', componentId, 'is disputed:', shouldShow);
        return shouldShow;
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
        console.log('Checking path:', path);
        
        // More flexible check for component pages
        if (!path.includes('IC_') && !path.match(/IC_\d+\.html/)) {
            console.log('Not a component page - no IC_ pattern found');
            return;
        }

        // Extract the component number
        const match = path.match(/IC_(\d+)\.html/);
        if (!match) {
            console.log('No component ID match found in path');
            return;
        }

        const componentId = parseInt(match[1], 10);
        console.log('Found component ID:', componentId);

        // Extract subject and session from path - try multiple patterns
        let subjectInfo = extractSubjectSession(path);
        if (!subjectInfo) {
            // Try alternative extraction methods
            const pathSegments = path.split('/');
            const subIndex = pathSegments.findIndex(s => s.startsWith('sub-'));
            const sesIndex = pathSegments.findIndex(s => s.startsWith('ses-'));
            if (subIndex !== -1 && sesIndex !== -1) {
                subjectInfo = {
                    subject: pathSegments[subIndex],
                    session: pathSegments[sesIndex]
                };
            }
        }
        
        if (subjectInfo) {
            currentSubject = subjectInfo.subject;
            currentSession = subjectInfo.session;
            console.log('Extracted subject/session:', currentSubject, currentSession);
        } else {
            console.log('Could not extract subject/session from path');
        }
        
        console.log('Mode:', mode);
        console.log('Rater data available:', !!raterData);
        console.log('Should show component:', shouldShowComponent(componentId));

        if(!shouldShowComponent(componentId)) {
            console.log('Component should not be shown, hiding');
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

        // Add uncertain checkbox for both modes
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

        // Add rater statistics for decision mode
        if(mode === 'decision' && raterData && currentSubject && currentSession) {
            const sessionData = raterData[currentSubject]?.[currentSession];
            if(sessionData && sessionData.componentStatuses && sessionData.componentStatuses[componentId]) {
                const stats = sessionData.componentStatuses[componentId];
                
                const statsDiv = document.createElement('div');
                statsDiv.style.marginTop = '10px';
                statsDiv.style.fontSize = '16px';
                statsDiv.style.borderTop = '1px solid #ccc';
                statsDiv.style.paddingTop = '5px';
                
                statsDiv.innerHTML = `
                    <div>Include: ${stats.include}</div>
                    <div>Uncertain: ${stats.uncertain}</div>
                    <div>Exclude: ${stats.exclude}</div>
                `;
                
                checkboxContainer.appendChild(statsDiv);
            }
        }

        // Append elements
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        checkboxContainer.appendChild(uncertainCheckbox);
        checkboxContainer.appendChild(uncertainLabel);
        
        document.body.appendChild(checkboxContainer);
    }

    // Add keyboard navigation for identify mode
    function addKeyboardNavigation() {
        // Only add in identify mode and on component pages
        if (mode !== 'identify') return;
        
        const path = window.location.pathname;
        if (!path.includes('IC_') || !path.match(/IC_\d+\.html$/)) return;
        
        // Prevent adding multiple event listeners
        if (document.keyboardNavigationAdded) return;
        document.keyboardNavigationAdded = true;
        
        // Extract current component number
        const match = path.match(/IC_(\d+)\.html/);
        if (!match) return;
        
        const currentComponent = parseInt(match[1], 10);
        console.log('Current component for navigation:', currentComponent);
        
        // Add keyboard event listener
        document.addEventListener('keydown', function(event) {
            // Only handle arrow keys if not typing in an input field
            if (document.activeElement && 
                (document.activeElement.tagName === 'INPUT' || 
                 document.activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            
            let targetComponent = null;
            
            if (event.key === 'ArrowLeft') {
                targetComponent = currentComponent - 1;
                event.preventDefault();
            } else if (event.key === 'ArrowRight') {
                targetComponent = currentComponent + 1;
                event.preventDefault();
            }
            
            if (targetComponent !== null && targetComponent > 0) {
                // Construct new URL
                const newPath = path.replace(/IC_\d+\.html/, `IC_${targetComponent}.html`);
                console.log('Navigating to:', newPath);
                window.location.href = newPath;
            }
        });
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

    // Modify the promptAndExportCSV function
    function promptAndExportCSV() {
        if (mode === 'identify' && checkedComponents.length === 0) {
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

        // Clear selection after download
        checkedComponents = [];
        uncertainComponents.clear();
        saveCheckedComponents();
        saveUncertainComponents();
        updateCountDisplay();
    }

    // Modify the getCSVContent function
    function getCSVContent() {
        if(mode === 'identify') {
            // Format components with uncertain ones in parentheses
            return checkedComponents
                .sort((a, b) => a - b)
                .map(comp => uncertainComponents.has(comp) ? `(${comp})` : comp)
                .join(',');
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

        // Get components both raters agreed on (auto-included)
        const agreed = sessionData.agreed || [];
        
        // Get selected disputed components and format them
        const selectedDisputed = checkedComponents
            .filter(x => sessionData.disputed.includes(x))
            .map(x => uncertainComponents.has(x) ? `(${x})` : String(x));
        
        // Combine agreed and selected disputed components
        return [...agreed, ...selectedDisputed]
            .sort((a,b) => {
                const numA = parseInt(String(a).replace(/[()]/g, '') || '0');
                const numB = parseInt(String(b).replace(/[()]/g, '') || '0');
                return numA - numB;
            })
            .join(',');
    }

    // Parse component list with uncertain markings
    function parseComponentList(listStr) {
        const components = [];
        const uncertainComponents = [];
        
        const items = listStr.replace(/"/g, '').split(',');
        for(const item of items) {
            const trimmed = item.trim();
            if(trimmed.startsWith('(') && trimmed.endsWith(')')) {
                // Uncertain component
                const compId = parseInt(trimmed.slice(1, -1), 10);
                if(!isNaN(compId)) {
                    components.push(compId);
                    uncertainComponents.push(compId);
                }
            } else {
                // Regular component
                const compId = parseInt(trimmed, 10);
                if(!isNaN(compId)) {
                    components.push(compId);
                }
            }
        }
        
        return { components, uncertainComponents };
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
            
            // Parse the 4-column format: Subject, Session, RaterA, RaterB
            const [subject, session, raterA, raterB] = line.split('\t');
            
            // Parse component lists with uncertain markings
            const parsedA = parseComponentList(raterA);
            const parsedB = parseComponentList(raterB);
            
            // Find all unique components mentioned by either rater
            const allComponents = [...new Set([...parsedA.components, ...parsedB.components])];
            
            // Calculate component statuses
            const componentStatuses = {};
            const displayComponents = []; // Components to show in decision mode
            const agreedComponents = []; // Components both raters agreed to include (not uncertain)
            
            for(const compId of allComponents) {
                const aHas = parsedA.components.includes(compId);
                const bHas = parsedB.components.includes(compId);
                const aUncertain = parsedA.uncertainComponents.includes(compId);
                const bUncertain = parsedB.uncertainComponents.includes(compId);
                
                let includeCount = 0;
                let uncertainCount = 0;
                let excludeCount = 0;
                
                if(aHas) {
                    if(aUncertain) uncertainCount++;
                    else excludeCount++; // Component selected = vote to exclude
                } else {
                    includeCount++; // Component not selected = vote to include
                }
                
                if(bHas) {
                    if(bUncertain) uncertainCount++;
                    else excludeCount++; // Component selected = vote to exclude
                } else {
                    includeCount++; // Component not selected = vote to include
                }
                
                componentStatuses[compId] = {
                    include: includeCount,
                    uncertain: uncertainCount,
                    exclude: excludeCount
                };
                
                // Show component if there's any uncertainty or disagreement
                if(uncertainCount > 0 || (includeCount > 0 && excludeCount > 0)) {
                    displayComponents.push(compId);
                } else if(excludeCount === 2) {
                    // Both raters agreed to exclude (not uncertain) - these go in final CSV automatically
                    agreedComponents.push(compId);
                }
            }
            
            if(!data[subject]) data[subject] = {};
            data[subject][session] = {
                raterA: parsedA.components,
                raterB: parsedB.components,
                raterAUncertain: parsedA.uncertainComponents,
                raterBUncertain: parsedB.uncertainComponents,
                componentStatuses: componentStatuses,
                disputed: displayComponents, // Components to show in decision mode
                agreed: agreedComponents // Components both raters agreed on (will be auto-included)
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
    function debugPageState() {
        console.log('=== MELODIC Inspector Debug Info ===');
        console.log('Current URL:', window.location.href);
        console.log('Current pathname:', window.location.pathname);
        console.log('Mode:', mode);
        console.log('Rater data available:', !!raterData);
        console.log('Current subject:', currentSubject);
        console.log('Current session:', currentSession);
        console.log('Document title:', document.title);
        console.log('Page has h3 elements:', document.querySelectorAll('h3').length);
        console.log('Checkbox already exists:', !!document.getElementById('component-checkbox'));
        
        // Check if this looks like a component page
        const isComponentPage = window.location.pathname.includes('IC_') && window.location.pathname.match(/IC_\d+\.html/);
        console.log('Appears to be component page:', isComponentPage);
        
        if (isComponentPage) {
            const match = window.location.pathname.match(/IC_(\d+)\.html/);
            const componentId = match ? parseInt(match[1], 10) : null;
            console.log('Component ID:', componentId);
            if (componentId) {
                console.log('Should show this component:', shouldShowComponent(componentId));
            }
        }
        console.log('=====================================');
    }

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

                const disputedSet = new Set(currentRaterData[subject][session].disputed || []);
                console.log('Components to display:', [...disputedSet]);

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

    // Debug the current state
    debugPageState();

    // Try adding controls immediately
    addCheckbox();
    addExportButton();
    addControls();
    addKeyboardNavigation();
    updateNavigationBar();

    // Also try adding controls when DOM is ready and after load
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM Content Loaded - trying to add controls again');
        debugPageState();
        addCheckbox();
        addExportButton();
        addKeyboardNavigation();
        updateNavigationBar();
    });
    
    window.addEventListener('load', () => {
        console.log('Window Load - trying to add controls again');
        debugPageState();
        addCheckbox();
        addExportButton();
        addKeyboardNavigation();
        updateNavigationBar();
    });

    // Additional fallback - try again after a short delay
    setTimeout(() => {
        console.log('Timeout fallback - trying to add controls');
        debugPageState();
        addCheckbox();
        addExportButton();
        addKeyboardNavigation();
    }, 1000);
})();