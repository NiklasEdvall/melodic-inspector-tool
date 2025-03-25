# melodic-inspector-tool
Browser plug-in to streamline inspection of MR data in FSL MELODIC report. Code by [Claude](https://claude.ai/login?returnTo=%2F%3F), use at your own risk.

## WIP

## Background
Using [FSL Melodic](https://web.mit.edu/fsl_v5.0.10/fsl/doc/wiki/MELODIC.html) to pre-process functional MR data results in a html-report that summarize each independent component identified in the analysis. For further pre-processing it is often desirable to inspect the components and identify noise-components to remove from the data before further analysis. This is a pretty manual process, I tasked [Claude](https://claude.ai/login?returnTo=%2F%3F) to write a browser plug-in that streamlines the process by allowing:

* Overlaying a check-box in the top right corner of your browser to select a component for exclusion
* Dowloading a CSV with selected components from the report main page
* Display only components disputed by two raters to make a combined decsision or mark components as 'uncertain'

## Get started
* Tested in browser Firefox 135.0.1
* Get the [tampermonkey extension](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) for firefox
* Create new script in the tampermonkey extension
* Paste code from _MELODIC Inspector Tool-2.0.js_
* Open the MELDOIC result report in firefox with the script you created enabled

## Use to identify components
* In **Mode: Identify** - look through components and check 'Exclude' for components to exclude
* Return to _Main_ page of html-report to download CSV file.
* **Note:** The list of selected components is saved with your browser, not the html-report itself. Make sure to use _Clear selection_ from the main page of the MELODIC report when you are switching between reports for different data.

The page for a component in **Mode: Identify**. <br>
<img width="599" alt="Screenshot 2025-03-25 151222" src="https://github.com/user-attachments/assets/a7a8bb70-dd21-4903-bf77-e6cd29e2a243" />

## Use to make decision on components
If you are multiple raters identifying comopents to exclude and want to combine your decisions:

* Switch to **Mode: Decision** on the main page of any report.
* You are prompted for a 

