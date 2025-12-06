# Workout Import Format for the Tracker

The app accepts three import shapes via **Settings → Import Data → choose file**:

1. **Single workout** (`exportType: "workout"` + `workout` object)
2. **Workout session** (`exportType: "workout-session"` + `workoutSummary` and `sessions`)
3. **Backup/merge import** (`sessions` array is required; optional `workouts` and `exerciseLibrary`)

Because the JSON you shared only contains workouts, wrap them in the backup/merge format and provide an empty `sessions` array. The app will add workouts whose names do not already exist and skip duplicates by name.

## Ready-to-import file (all three workouts)
Save the following as `workouts-import.json` and import it.

```json
{
  "version": "2.0",
  "exportType": "workouts",
  "exportDate": "2025-12-06T11:15:00Z",
  "sessions": [],
  "workouts": [
    {
      "id": 7,
      "name": "1 – Upper A (Horizontal Push / Vertical Pull)",
      "exercises": [
        {
          "name": "Chest Press - Flat Bench (Dumbbells)",
          "muscle_group": "Chest",
          "sets": 3,
          "reps": 8,
          "weight_kg": 22.5,
          "notes": "RPE 8; add 1 rep or +2 kg when all sets hit 8 reps cleanly",
          "form_video": "https://www.youtube.com/watch?v=pKZMNVbfUzQ"
        },
        {
          "name": "Seated Cable Row",
          "muscle_group": "Back",
          "sets": 3,
          "reps": 10,
          "weight_kg": 35,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=A77hAjcpN1s"
        },
        {
          "name": "Single Arm Pulldown - Kneeling",
          "muscle_group": "Back",
          "sets": 3,
          "reps": 8,
          "weight_kg": 22.5,
          "notes": "Neutral-grip to spare elbow",
          "form_video": "https://www.youtube.com/watch?v=Vu3OrBHrMNk"
        },
        {
          "name": "Landmine Shoulder Press",
          "muscle_group": "Shoulders",
          "sets": 3,
          "reps": 8,
          "weight_kg": null,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=M1k-y3X-xkc"
        },
        {
          "name": "Rope Tricep Extension",
          "muscle_group": "Triceps",
          "sets": 3,
          "reps": 12,
          "weight_kg": 45,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=vB5OHsJ3EME"
        },
        {
          "name": "EZ-Bar Curl",
          "muscle_group": "Biceps",
          "sets": 3,
          "reps": 10,
          "weight_kg": 30,
          "notes": "Use moderate grip width; keep elbows fixed",
          "form_video": "https://www.youtube.com/watch?v=cdrd8DcMDwk"
        },
        {
          "name": "Cable Pallof Press",
          "muscle_group": "Core",
          "sets": 2,
          "reps": "12–15/side",
          "weight_kg": 7.5,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=xeFp4MXad98"
        }
      ]
    },
    {
      "id": 8,
      "name": "2 – Lower & Posterior Chain",
      "exercises": [
        {
          "name": "Leg Press",
          "muscle_group": "Quads",
          "sets": 3,
          "reps": 10,
          "weight_kg": 80,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=SWd6n6T9Fcw"
        },
        {
          "name": "Stiff-Leg Deadlift",
          "muscle_group": "Hamstrings/Glutes",
          "sets": 3,
          "reps": 8,
          "weight_kg": null,
          "notes": "DB or barbell; keep slight knee bend, neutral spine",
          "form_video": "https://www.youtube.com/watch?v=CN_7cz3P-1U"
        },
        {
          "name": "DB Hip Thrust",
          "muscle_group": "Glutes",
          "sets": 3,
          "reps": 12,
          "weight_kg": null,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=LM8XHLYJoYs"
        },
        {
          "name": "Reverse Alternating Lunge (Kettlebell)",
          "muscle_group": "Legs",
          "sets": 2,
          "reps": "12/side",
          "weight_kg": 6,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=iwRSeGbZ1uw"
        },
        {
          "name": "Farmers Carry (Kettlebell)",
          "muscle_group": "Full Body",
          "sets": 3,
          "reps": "20 m",
          "weight_kg": 20,
          "notes": "Strap if forearm flares; upright posture",
          "form_video": "https://www.youtube.com/watch?v=fxwrTkKUkTo"
        },
        {
          "name": "Roman Chair Side Bend",
          "muscle_group": "Core",
          "sets": 2,
          "reps": "10/side",
          "weight_kg": null,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=SkWTRlKzs6A"
        }
      ]
    },
    {
      "id": 9,
      "name": "3 – Upper B (Vertical Push / Horizontal Pull)",
      "exercises": [
        {
          "name": "Landmine Lateral-Raise→Press",
          "muscle_group": "Shoulders",
          "sets": 3,
          "reps": "8/arm",
          "weight_kg": 12,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=F03UQPq2t9k"
        },
        {
          "name": "Close-Grip Cable Row",
          "muscle_group": "Back",
          "sets": 3,
          "reps": 10,
          "weight_kg": 40,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=TLRdVjMPfG0"
        },
        {
          "name": "Angled Cable Chest Fly (High-to-Low)",
          "muscle_group": "Chest",
          "sets": 3,
          "reps": 15,
          "weight_kg": 15,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=Iweqb_Yd_14"
        },
        {
          "name": "Straight Arm Lat Pulldown",
          "muscle_group": "Back",
          "sets": 3,
          "reps": 12,
          "weight_kg": null,
          "notes": "Elbow-friendly lat isolation",
          "form_video": "https://www.youtube.com/watch?v=G6NdR5nO1Go"
        },
        {
          "name": "Reverse Pec Deck / Rear Delt Flys",
          "muscle_group": "Shoulders",
          "sets": 3,
          "reps": 15,
          "weight_kg": null,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=H530fW3y9bk"
        },
        {
          "name": "Rope Overhead Triceps Extension",
          "muscle_group": "Triceps",
          "sets": 3,
          "reps": 12,
          "weight_kg": 17.5,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=nRiJVZDpdLg"
        },
        {
          "name": "EZ Bar Curl",
          "muscle_group": "Biceps",
          "sets": 3,
          "reps": 10,
          "weight_kg": 30,
          "notes": null,
          "form_video": "https://www.youtube.com/watch?v=2_an9taJ9UY"
        },
        {
          "name": "Cable Face Pulls / Rear Delt Flys",
          "muscle_group": "Shoulders",
          "sets": 2,
          "reps": 15,
          "weight_kg": 20,
          "notes": "Extra rear-delt volume for posture",
          "form_video": "https://www.youtube.com/watch?v=cuTBqxntdso"
        }
      ]
    }
  ]
}
```

## How to import
1. Open the app and go to **Settings → Import Data**.
2. Select the saved `workouts-import.json` file.
3. Confirm the prompt. The app assigns fresh IDs as needed and skips workouts that share a name with an existing one.

## If you prefer one-file-per-workout
You can also import individually. Save each workout in its own file using this shape:

```json
{
  "version": "2.0",
  "exportType": "workout",
  "exportDate": "2025-12-06T11:15:00Z",
  "workout": { /* single workout object (same fields as above) */ }
}
```
