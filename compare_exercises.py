#!/usr/bin/env python3
import json
import sys

def compare_exercises(file1, file2):
    """Compare two exercise JSON files and verify structure is identical except for YouTube links."""
    
    with open(file1, 'r') as f1:
        data1 = json.load(f1)
    
    with open(file2, 'r') as f2:
        data2 = json.load(f2)
    
    differences = []
    youtube_changes = []
    
    # Check top-level structure
    if set(data1.keys()) != set(data2.keys()):
        differences.append(f"Top-level keys differ: {data1.keys()} vs {data2.keys()}")
        return differences, youtube_changes
    
    # Check workouts array length
    if len(data1['workouts']) != len(data2['workouts']):
        differences.append(f"Different number of workouts: {len(data1['workouts'])} vs {len(data2['workouts'])}")
        return differences, youtube_changes
    
    # Compare each workout
    for i, (w1, w2) in enumerate(zip(data1['workouts'], data2['workouts'])):
        workout_path = f"workouts[{i}]"
        
        # Check workout-level keys
        if set(w1.keys()) != set(w2.keys()):
            differences.append(f"{workout_path}: Different keys - {w1.keys()} vs {w2.keys()}")
            continue
        
        # Check workout-level fields (except exercises)
        for key in ['id', 'name', 'date']:
            if w1.get(key) != w2.get(key):
                differences.append(f"{workout_path}.{key}: '{w1.get(key)}' vs '{w2.get(key)}'")
        
        # Check exercises array length
        if len(w1['exercises']) != len(w2['exercises']):
            differences.append(f"{workout_path}: Different number of exercises - {len(w1['exercises'])} vs {len(w2['exercises'])}")
            continue
        
        # Compare each exercise
        for j, (ex1, ex2) in enumerate(zip(w1['exercises'], w2['exercises'])):
            exercise_path = f"{workout_path}.exercises[{j}]"
            
            # Check exercise-level keys
            if set(ex1.keys()) != set(ex2.keys()):
                differences.append(f"{exercise_path}: Different keys - {ex1.keys()} vs {ex2.keys()}")
                continue
            
            # Compare each field
            for key in ex1.keys():
                val1 = ex1[key]
                val2 = ex2[key]
                
                if key == 'form_video':
                    # Track YouTube link changes separately
                    if val1 != val2:
                        youtube_changes.append({
                            'exercise': ex1['name'],
                            'workout': w1['name'],
                            'old': val1,
                            'new': val2
                        })
                else:
                    # All other fields must be identical
                    if val1 != val2:
                        differences.append(f"{exercise_path}.{key}: '{val1}' vs '{val2}'")
    
    return differences, youtube_changes

if __name__ == '__main__':
    file1 = 'data/exercises.json'
    file2 = 'data/exercises-2.json'
    
    print("=" * 80)
    print("COMPARING EXERCISE FILES")
    print("=" * 80)
    print(f"File 1: {file1}")
    print(f"File 2: {file2}")
    print()
    
    differences, youtube_changes = compare_exercises(file1, file2)
    
    if differences:
        print("❌ STRUCTURAL DIFFERENCES FOUND:")
        print("-" * 80)
        for diff in differences:
            print(f"  • {diff}")
        print()
    else:
        print("✅ NO STRUCTURAL DIFFERENCES - All keys, values, and structure identical (except YouTube links)")
        print()
    
    if youtube_changes:
        print(f"📹 YOUTUBE LINK CHANGES ({len(youtube_changes)} total):")
        print("-" * 80)
        for change in youtube_changes:
            print(f"\n  Exercise: {change['exercise']}")
            print(f"  Workout:  {change['workout']}")
            print(f"  Old:      {change['old']}")
            print(f"  New:      {change['new']}")
    else:
        print("No YouTube links were changed")
    
    print()
    print("=" * 80)
    
    # Exit with error code if structural differences found
    sys.exit(1 if differences else 0)
