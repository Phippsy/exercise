# Coach Performance Summary: Implementation Brief

This brief translates the proposed coaching insights into implementable product requirements for the Workout Tracker. It focuses on outputs that can be generated from existing logged workout data, plus clearly labeled inferred fields where necessary.

## Goals
- Surface consistency, balance, and intensity patterns so coaches can judge whether training supports adaptation.
- Highlight distribution across muscle groups and recent training blocks.
- Flag imbalances, recovery risks, and data blind spots with transparent confidence indicators.

## Scope & Data Sources
- Inputs: logged sessions, exercises (with muscle tags), sets/reps/weights, timestamps, RPE (if present), and any existing PR detection.
- Inference allowed where noted; inferred metrics must be labeled (e.g., “estimated”, “inferred”).

## Required Outputs

### 1) Training Frequency & Consistency (High Priority)
- **Sessions per week:** rolling 7/14/28-day averages.
- **Upper- vs lower-body sessions per week:** derived from dominant muscle tags in each session.
- **Consistency band:** Low / Moderate / High based on adherence to planned or typical cadence (use available schedule; otherwise infer from rolling averages).

### 2) Weekly Muscle Exposure Table (Critical)
For each major muscle group in the last rolling week (7 days, also expose 28-day view):
- Total sets, % of weekly volume, sessions trained.
- Status flag thresholds (configurable): `Underexposed`, `Productive`, `High`, `Excessive`.

### 3) Intensity & Effort Representation
- **Effort band per workout:** Easy (≤6 RPE), Moderate (6–7), Hard (7–8), Very Hard (8–9). If RPE is missing, infer from rep drop-off or proximity to targets; mark as inferred.
- **Effort distribution:** % of workouts by band over 28 days and last 7 days.

### 4) Session Density & Recoverability
- Average session duration (if time data exists; else estimate from set counts and typical pacing, labeled as estimate).
- Sets per hour and volume per minute.
- Density trend: ↑ / → / ↓ comparing recent 7 days vs prior 7 days.

### 5) Lower-Body Representation & Balance Flags
- Lower-body frequency warning (e.g., “⚠ Legs trained once in last 7 days”).
- Lower- vs upper-body volume ratio with configurable alert bands.

### 6) Progress Quality (Beyond PR Counts)
- Repeat-performance stability: loads held across weeks for recurring movements.
- Emerging trends (mark as inferred if rest time missing):
  - Volume ↑ at same load
  - Reps before failure ↑
  - Rest time ↓ at same output

### 7) Core Training Classification
- Classify core work by function: Anti-extension, Anti-rotation, Lateral flexion, Flexion/hip flexion.
- Summarize weekly exposure by function and flag redundancy (e.g., flexion-heavy week).

### 8) Recency-Weighted Insights
- Recent microcycle summary (last 7–10 days): muscle coverage, volume distribution, intensity mix, gaps/overloads.
- 30-day view remains available but secondary.

### 9) Coach-Facing Narrative Layer (Optional)
- Generate 2–4 short insights translating metrics into coaching language (e.g., “Upper-body balance is strong; legs are trained infrequently but at high volume.”).

### 10) Transparency & Confidence Indicators
- Data completeness score and capture confidence (High / Medium / Low).
- Flag likely under-reporting when frequency or volume is below historical baselines.

## Acceptance Criteria
- All new metrics appear in the Coach Performance Summary output payload/UI with clear labels for inferred vs logged values.
- No changes required to set logging flows; all calculations run on existing historical data.
- Status thresholds (for exposure, balance, density) are configurable and documented.
- Version numbers in `index.html` remain unchanged unless JS/CSS assets are modified (not required for this brief).
