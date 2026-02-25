#!/usr/bin/env python3
"""
Workout Export Report Generator

This script reads all workout session JSON files from the exports/ directory
and converts them into a simple CSV format that can be easily shared with
a personal trainer.

Output: workout_report.csv containing all exercises from all sessions in a
tabular format with columns for date, workout name, exercise, muscle group,
sets, reps, and volume.
"""

import json
import csv
from pathlib import Path
from datetime import datetime


def parse_date(date_str):
    """Convert ISO date string to readable format."""
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d')
    except:
        return date_str


def load_workout_sessions(exports_dir='exports'):
    """Load all JSON workout session files from the exports directory."""
    sessions = []
    exports_path = Path(exports_dir)
    
    if not exports_path.exists():
        print(f"Error: {exports_dir} directory not found!")
        return sessions
    
    json_files = sorted(exports_path.glob('*.json'))
    
    for json_file in json_files:
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
                if data.get('exportType') == 'workout-session':
                    sessions.append(data)
                    print(f"Loaded: {json_file.name}")
        except Exception as e:
            print(f"Error loading {json_file.name}: {e}")
    
    return sessions


def generate_report(sessions, output_file='workout_report.csv'):
    """Generate CSV report from workout sessions."""
    
    if not sessions:
        print("No workout sessions found!")
        return
    
    # Prepare rows for CSV
    rows = []
    
    for session in sessions:
        summary = session.get('workoutSummary', {})
        workout_name = summary.get('workoutName', 'Unknown')
        date = parse_date(summary.get('date', ''))
        
        for exercise in summary.get('exercises', []):
            rows.append({
                'Date': date,
                'Workout': workout_name,
                'Exercise': exercise.get('name', ''),
                'Muscle Group': exercise.get('muscleGroup', ''),
                'Sets': exercise.get('sets', 0),
                'Reps': exercise.get('reps', 0),
                'Volume (lbs)': exercise.get('volume', 0)
            })
    
    # Write to CSV
    if rows:
        fieldnames = ['Date', 'Workout', 'Exercise', 'Muscle Group', 'Sets', 'Reps', 'Volume (lbs)']
        
        with open(output_file, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        
        print(f"\n✓ Report generated: {output_file}")
        print(f"  Total exercises logged: {len(rows)}")
        print(f"  Workout sessions: {len(sessions)}")
    else:
        print("No data to write!")


def main():
    """Main execution function."""
    print("Workout Export Report Generator")
    print("=" * 50)
    
    # Load all workout sessions from JSON files
    sessions = load_workout_sessions('exports')
    
    # Generate CSV report
    generate_report(sessions, 'workout_report.csv')
    
    print("\nDone! You can now share workout_report.csv with your trainer.")


if __name__ == '__main__':
    main()
