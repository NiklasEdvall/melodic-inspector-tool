import os
import pandas as pd
from pathlib import Path
import tkinter as tk
from tkinter import filedialog

def get_folder_path(prompt):
    # Hide main tkinter window
    root = tk.Tk()
    root.withdraw()
    
    # Set default directory path
    default_dir = Path.home() / 'data'
    
    # Show folder selection dialog with default directory
    folder_path = filedialog.askdirectory(
        title=prompt,
        initialdir=default_dir if default_dir.exists() else None
    )
    return Path(folder_path) if folder_path else None

def get_subject_session(filename):
    # Extract subject and session from filename
    parts = filename.replace('.csv', '').split('_')
    return parts[0], parts[1]

def main():
    # Get folder paths from user
    folder_a = get_folder_path("Select folder containing components as CSV for rater A")
    if not folder_a:
        print("No folder selected for rater A. Exiting.")
        return
        
    folder_b = get_folder_path("Select folder containing components as CSV for rater B")
    if not folder_b:
        print("No folder selected for rater B. Exiting.")
        return
    
    # Set output file path in data directory - try multiple locations
    script_dir = Path(__file__).parent
    possible_data_dirs = [
        script_dir / 'data',  # Look for data folder next to script
        Path('data'),         # Look in current working directory
        Path('../data')       # Look in parent directory
    ]
    
    output_dir = next((d for d in possible_data_dirs if d.exists()), None)
    if not output_dir:
        print("Error: Could not find data directory. Looked in:")
        for d in possible_data_dirs:
            print(f"  - {d.absolute()}")
        return
    
    output_file = output_dir / 'identified_components.txt'
    
    # Get folder names for column headers
    rater_a_name = folder_a.name
    rater_b_name = folder_b.name
    
    # Store results
    results = []
    
    # Get all files from folders
    files_a = {f.name: f for f in folder_a.glob('*.csv')}
    files_b = {f.name: f for f in folder_b.glob('*.csv')}
    
    # Check for orphan files
    orphans_a = set(files_a.keys()) - set(files_b.keys())
    orphans_b = set(files_b.keys()) - set(files_a.keys())
    
    if orphans_a:
        print(f"Warning: Files in A without matching B files: {', '.join(orphans_a)}")
    if orphans_b:
        print(f"Warning: Files in B without matching A files: {', '.join(orphans_b)}")
    
    # Process matching files
    matching_files = set(files_a.keys()) & set(files_b.keys())
    
    for filename in matching_files:
        # Get subject and session
        subject, session = get_subject_session(filename)
        
        # Read content from both files
        with open(files_a[filename], 'r') as f:
            content_a = f.read().strip()
        with open(files_b[filename], 'r') as f:
            content_b = f.read().strip()
        
        # Add to results using folder names as column headers
        result_dict = {
            'Subject': subject,
            'Session': session
        }
        # Add rater data with folder names as column headers
        result_dict[rater_a_name] = content_a
        result_dict[rater_b_name] = content_b
        results.append(result_dict)
    
    # Create DataFrame with explicit column order
    columns = ['Subject', 'Session', rater_a_name, rater_b_name]
    df = pd.DataFrame(results, columns=columns)
    df.to_csv(output_file, sep='\t', index=False)
    print(f"Successfully created {output_file}")
    print(f"Column headers: Subject, Session, {rater_a_name}, {rater_b_name}")

if __name__ == "__main__":
    main()