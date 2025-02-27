# melodic-inspector-tool
Browser plug-in to streamline inspection of MR data in FSL MELODIC report. Code by [Claude](https://claude.ai/login?returnTo=%2F%3F), use at your own risk.

## Background
Using [FSL Melodic](https://web.mit.edu/fsl_v5.0.10/fsl/doc/wiki/MELODIC.html) to pre-process functional MR data results in a html-report that summarize each independent componen identified in the analysis. For further pre-processing it is often desirable to inspect the components and identify noise-components to remove from the data before further analysis. This is a pretty manual process, I tasked [Claude](https://claude.ai/login?returnTo=%2F%3F) to write a browser plug-in that streamlines the process by allowing:

* Switching between components in the report using keyboard arrow keys
* Overlaying a check-box in the top right corner of your browser to select a component for exclusion
* Dowloading a CSV with selected components from the report main page

## How to use
* Tested in browser Firefox 135.0.1
* Get the [tampermonkey extension](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) for firefox
* Create new script in the tampermonkey extension
* Paste code from _MELODIC Inspector Tool-1.0.user.js_
* Open the MELDOIC result report in firefox with the script you created enabled

## Note
* The list of selected components is saved with your browser, not the html-report itself. Make sure to use _Clear selection_ from the main page of the MELODIC report when you are switching between reports for different data.

## Screenshots
The page for a component. <br>
<img width="689" alt="Screenshot 2025-02-27 113024" src="https://github.com/user-attachments/assets/242e6230-c0b7-495b-b973-1a5c509239fb" />

<br>
<br>
The main page of a report. Download CSV or clear selection from here. <br>
<img width="959" alt="Screenshot 2025-02-27 112813" src="https://github.com/user-attachments/assets/a327c735-e2f8-4d6f-9567-53cd54b9723b" />
