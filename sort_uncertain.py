import os
import re
from pathlib import Path
import csv

def ensure_directories(base_path):
    # Create output directories if they don't exist
    for dir_name in ['strict', 'conservative']:
        Path(base_path / 'data' / dir_name).mkdir(exist_ok=True, parents=True)

def count_parenthetical_numbers(content):
    return len(re.findall(r'\(\d+\)', content))

def process_files(base_dir):
    # Convert string path to Path object if it's a string
    base_path = Path(base_dir)
    input_dir = base_path / 'data' / 'decision'
    
    # Ensure the input directory exists
    if not input_dir.exists():
        raise FileNotFoundError(f"Directory not found: {input_dir}")

    # Create output directories
    ensure_directories(base_path)
    
    removal_stats = []

    # Process each file in the input directory
    for file_path in input_dir.glob('*.csv'):
        # Read the content of the file
        content = file_path.read_text().strip()

        # Count numbers in parentheses before removal
        removed_count = count_parenthetical_numbers(content)

        # Process for strict version (remove numbers in parentheses)
        strict_content = re.sub(r'\(\d+\)', '', content)
        # Clean up multiple commas
        strict_content = re.sub(r',+', ',', strict_content)
        # Remove leading/trailing commas
        strict_content = strict_content.strip(',')

        # Process for conservative version (just remove parentheses)
        conservative_content = content.replace('(', '').replace(')', '')

        # Write strict version
        strict_file = base_path / 'data' / 'strict' / file_path.name
        strict_file.write_text(strict_content)

        # Write conservative version
        conservative_file = base_path / 'data' / 'conservative' / file_path.name
        conservative_file.write_text(conservative_content)

        # Store statistics
        removal_stats.append({
            'filename': file_path.name,
            'n_uncertain': removed_count
        })

    # Write summary CSV
    summary_file = base_path / 'data' / 'uncertain_summary.csv'
    with open(summary_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['filename', 'n_uncertain'])
        writer.writeheader()
        writer.writerows(removal_stats)

if __name__ == '__main__':
    # Use script location as base directory
    script_dir = Path(__file__).parent
    process_files(script_dir)
    print("Processing complete!")