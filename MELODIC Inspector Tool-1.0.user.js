// ==UserScript==
// @name         MELODIC Inspector Tool
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add checkboxes and CSV export for MELODIC component inspection
// @author       Claude
// @match        */*.html
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Store checked component IDs using GM_setValue/GM_getValue for better persistence across pages
    let checkedComponents = [];

    // Load previously checked components
    function loadCheckedComponents() {
        const savedComponents = GM_getValue('melodicCheckedComponents', '[]');
        checkedComponents = JSON.parse(savedComponents);
    }

    // Save checked components
    function saveCheckedComponents() {
        GM_setValue('melodicCheckedComponents', JSON.stringify(checkedComponents));
    }

    // Add checkbox to component pages
    function addCheckbox() {
        // Check if this is a component page
        const path = window.location.pathname;
        if (!path.includes('IC_') || !document.querySelector('h3')) {
            return;
        }

        // Extract the component number
        const match = path.match(/IC_(\d+)\.html/);
        if (!match) {
            return;
        }

        const componentId = parseInt(match[1], 10);

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
        label.textContent = `Select Component ${componentId}`;

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
                }
            }
            saveCheckedComponents();
        });

        // Append elements
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        document.body.appendChild(checkboxContainer);
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
            // Reload the latest checked components
            loadCheckedComponents();

            countDisplay.textContent = `Selected: ${checkedComponents.length} components`;
            if (checkedComponents.length > 0) {
                countDisplay.textContent += ` (${checkedComponents.sort((a, b) => a - b).join(', ')})`;
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
            saveCheckedComponents();
            updateCountDisplay();
        });

        // Append elements
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

        // Sort component IDs numerically
        const sortedComponents = [...checkedComponents].sort((a, b) => a - b);

        // Create CSV content
        const csvContent = sortedComponents.join(',');

        // Prompt user for filename
        const defaultFileName = 'melodic-components.csv';
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

    // Initialize
    loadCheckedComponents();
    addCheckbox();
    addExportButton();
})();