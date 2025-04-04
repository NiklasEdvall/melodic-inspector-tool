# melodic-inspector-tool
Browser plug-in to streamline inspection of MR data in FSL MELODIC report.

## Background
Using [FSL Melodic](https://web.mit.edu/fsl_v5.0.10/fsl/doc/wiki/MELODIC.html) to pre-process functional MR data results in a html-report that summarize each independent component identified in the analysis. For further pre-processing it is often desirable to inspect the components and identify noise-components to remove from the data before further analysis. This is a pretty manual process, this browser plug-in streamlines the process by:

* Overlaying a check-box in the top right corner of your browser to select a component for exclusion
* Dowloading a CSV with selected components from the report main page
* Display only components disputed by two raters to make a combined decsision or mark components as 'uncertain'

## Get started
* Tested in browser Firefox 135.0.1
* Get the [tampermonkey extension](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) for firefox
* Create new script in the tampermonkey extension
* Paste code from _MELODIC Inspector Tool-2.0.js_ in your new script
* Open the MELDOIC result report in firefox with the script you created enabled

## Use to identify components
* In **Mode: Identify** - look through components and check 'Exclude' for components to exclude
* Return to _Main_ page of html-report to download CSV file.
* **Note:** Selection is automatically cleared when you download CSV.
* Use a file naming convention common to your project. If your data is in a BIDS structure `sub-01_ses-01.csv` is suggested for subject: `sub-01_ses-01` by default.
* The file is downloaded to your browsers download folder, collect your resulting CSVs somewhere safe.

The page for a component in **Mode: Identify** <br>
<img width="500" alt="Identify components" src="https://github.com/user-attachments/assets/a7a8bb70-dd21-4903-bf77-e6cd29e2a243" />

## Workflow for decision-mode
Generally two or more raters look through the same dataset to identify noise components to remove. To combine components identified by different raters, the tool expect a [BIDS](https://bids-specification.readthedocs.io/en/stable/) structure and filenames, i.e. that the MELODIC reports are written to: `..sub-0002/ses-02/sub-0002_ses-02.feat/melodic.ica/report/00index.html` for subject: `sub-0002`, session: `ses-02` 

This is because the html-report itself does not hold info on subject or session, so in **Mode: Decision** this info is read from the file path of the report. Assuming you use this standard pathing and filenaming convention, you can use this tool to check through components that are disputed between raters.

## Preparation
* Use **merge_component_csvs.py** to merge identified components from two raters CSV-files to one combined csv, by default named **identified_components.txt**
* When switching to **Mode: Decision** select the file **identified_components.txt** you created

<img width="500" alt="Switch modes" src="https://github.com/user-attachments/assets/9a4286d7-516e-4b4c-9e69-e3f39fef63f7" />

<br>

_To be continued.._
