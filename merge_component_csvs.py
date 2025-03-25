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
    
    output_file = 'identified_comps.txt'
    
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
        
        # Add to results
        results.append({
            'Subject': subject,
            'Session': session,
            'A': content_a,
            'B': content_b
        })
    
    # Create DataFrame and save to TSV
    df = pd.DataFrame(results)
    df.to_csv(output_file, sep='\t', index=False)
    print(f"Successfully created {output_file}")

if __name__ == "__main__":
    main()