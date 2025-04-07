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
* Return to the _Main_ page of html-report to download CSV file.
* **Note:** Selection is automatically cleared when you download CSV.
* Use a file naming convention common to your project. If your data is in a BIDS structure `sub-01_ses-01.csv` is suggested for subject: `sub-01` session: `ses-01` by default.
* The file is downloaded to your browsers download folder, collect your resulting CSVs somewhere safe.

The page for a component in **Mode: Identify** <br>
<img width="500" alt="Identify components" src="https://github.com/user-attachments/assets/a7a8bb70-dd21-4903-bf77-e6cd29e2a243" />

## Workflow for decision-mode
Generally two or more raters look through the same dataset to identify noise components to remove. To combine components identified by different raters, the tool expect a [BIDS](https://bids-specification.readthedocs.io/en/stable/) structure and filenames, i.e. that the MELODIC reports are written to: `..sub-0002/ses-02/sub-0002_ses-02.feat/melodic.ica/report/00index.html` for subject: `sub-0002`, session: `ses-02` 

This is because the html-report itself does not hold info on subject or session, so in **Mode: Decision** this info is read from the file path of the report. Assuming you use this standard pathing and filenaming convention, you can use this tool to check through components that are disputed between raters.

## Preparation
* Use **merge_component_csvs.py** to merge identified components from two raters CSV-files to one combined tsv, by default named **identified_components.txt**
* When switching to **Mode: Decision** select the file **identified_components.txt** you created. Some mock-up data is included in this repository `/data` to work as a template.

_Switch between modes here_ <br>
<img width="500" alt="Switch modes" src="https://github.com/user-attachments/assets/9a4286d7-516e-4b4c-9e69-e3f39fef63f7" />

## Make decision for components
* Go through the components disputed by raters and make a final descision.
* Check uncertain if you want a component to be reviewed by a third reviewer or you want to experiment with how inclusion/exclusion of this component affect your analysis.
* Return to _Main_ page of the html-report to download CSV file.
* The CSV downloaded in **Mode: Decision** contain all components both raters agreed to exclude, plus components selected in this mode. Components marked 'uncertain' are exported in parenthesis.
  <br><br>
    For example: Rater A have selected components 1,2,4 and rater B selected 1,2,3 in **Mode: Identify**. When combined and displayed in **Mode: Decision** the report will display component 3 and 4, as these are selected by only one rater. If component 3 is now selected for exclusion and 4 as 'uncertain' the resulting CSV downloaded will contain: 1,2,(4). <br><br>
* **Note:** Selection is automatically cleared when you download CSV.
* Use a file naming convention common to your project. If your data is in a BIDS structure `sub-01_ses-01.csv` is suggested for subject: `sub-01` session: `ses-01` by default.
* The file is downloaded to your browsers download folder, collect your resulting CSVs somewhere safe.

In **Mode: Decision**, only the components that are disputed between the two raters are displayed in the navigation-bar. <br>
<img width="500" alt="mode_decision" src="https://github.com/user-attachments/assets/f08b3a15-5a10-4e0e-a836-8837eeb650ab" />

## Handle uncertain components
Depending on your design you may want a third rater to make final decisions on 'uncertain' components or try your pipeline both with and without these components. For the latter case you can run the script **sort_uncertain.py**. It takes all CSV-files with components in `data/decision` and either includes uncertain components and writes the file to `data/conservative` or excludes it and writes to `data/strict`. For example, a file with: 1,2,(3),4 would be copied as 1,2,3,4 to `data/conservative` and 1,2,4 to `data/strict`

## Workflow overview
![MELODIC report](https://github.com/user-attachments/assets/7de8cc14-11f0-40e0-a9b1-410b7a3fa0c9)
