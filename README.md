# Workout Tracker Application

A clean, minimalist workout tracking application designed to help you monitor your weekly workouts, track reps and weights, and monitor your progress over time.

## Features

✅ **Workout Management**
- View all your predefined workouts
- See exercise count for each workout
- Quick navigation between workouts

✅ **Exercise Tracking**
- Select exercises from your workout
- View last session details automatically
- See when you last performed each exercise

✅ **Session Logging**
- Auto-populate sets from previous session
- Easy increment/decrement controls for reps and weights
- Add or remove sets as needed
- Save sessions with one click

✅ **Progress Monitoring**
- View complete session history for each exercise
- See your last 5 sessions at a glance
- Track improvements over time

✅ **Data Persistence**
- All sessions saved to browser localStorage
- Data persists between sessions
- No account or server required

## Getting Started

### Installation

1. Ensure all files are in the same directory:
   ```
   /exercise
   ├── index.html
   ├── styles.css
   ├── app.js
   ├── README.md
   └── data/
       └── exercises.json
   ```

2. Open `index.html` in a modern web browser

### Usage

#### 1. Select a Workout
- When you open the app, you'll see all your available workouts
- Click on any workout to view its exercises

#### 2. Choose an Exercise
- Browse the list of exercises in your selected workout
- Each exercise shows when it was last performed
- Click on an exercise to open the tracking interface

#### 3. Log Your Session
- The "Previous Session" section shows what you did last time
- The form auto-populates with your last session's data
- Use the **+/-** buttons to quickly adjust weights and reps
- Click **Add Set** to add more sets
- Click the **X** button to remove a set
- Click **Save Session** when done

#### 4. Monitor Progress
- The "Session History" section shows your last 5 sessions
- Each entry shows the date and all sets performed
- Use this to track your progress over time

## Design Philosophy

This application follows these core principles:

### Clarity 🎯
- Clear labels and explicit data context
- Numeric counts and precise metadata
- Unambiguous action buttons

### Simplicity
- Clean, dark interface reduces eye strain
- Focus on the essential data
- No unnecessary features or distractions

### Accessibility ♿
- Full keyboard navigation support
- High contrast ratios (WCAG 2.1 AA compliant)
- Visible focus indicators
- Semantic HTML structure

### Trust 🛡️
- All data stored locally in your browser
- Complete session history maintained
- Easy to review past performance

## Design System

The application uses a cohesive design system inspired by modern UI principles:

- **Color Palette**: Purple primary accent with semantic status colors
- **Typography**: Inter font family optimized for readability
- **Spacing**: Consistent 4px-based spacing system
- **Components**: Reusable card, button, and form components

## Technical Details

### Technologies Used
- **HTML5**: Semantic structure
- **CSS3**: Modern styling with CSS custom properties
- **JavaScript (ES6+)**: Vanilla JS, no frameworks
- **localStorage**: Browser-based data persistence

### Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

### Data Storage
Sessions are stored in browser localStorage as JSON:
```javascript
{
  id: timestamp,
  workoutId: number,
  workoutName: string,
  exerciseName: string,
  muscleGroup: string,
  date: ISO string,
  sets: [{ reps: number, weight_kg: number }]
}
```

## Keyboard Navigation

- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and select items
- **Escape**: (Future enhancement) Close modals

## Tips for Best Results

1. **Be Consistent**: Log your workouts immediately after completing them
2. **Progressive Overload**: Use the increment buttons to gradually increase weights
3. **Track Everything**: Even if you don't increase weight, tracking helps identify patterns
4. **Review History**: Check your progress regularly to stay motivated

## Customization

### Adding New Workouts
Edit `data/exercises.json` to add new workouts or exercises:

```json
{
  "id": 5,
  "name": "Your Workout Name",
  "date": null,
  "exercises": [
    {
      "name": "Exercise Name",
      "muscle_group": "Muscle Group",
      "sets": 3,
      "reps": 10,
      "weight_kg": 20,
      "notes": null
    }
  ]
}
```

### Modifying Colors
Edit CSS custom properties in `styles.css`:

```css
:root {
  --color-primary: #633c99;  /* Change to your preferred color */
  --dark-bg-page: #0a0a0a;   /* Background color */
  /* ... more variables */
}
```

## Future Enhancements

Potential features for future versions:
- Export/import data functionality
- Charts and progress graphs
- Rest timer between sets
- Exercise notes and form cues
- Workout templates
- Mobile app version

## Troubleshooting

**Q: My sessions aren't saving**
- Check that your browser allows localStorage
- Try refreshing the page
- Check browser console for errors

**Q: How do I reset my data?**
- Open browser developer tools (F12)
- Go to Application/Storage → Local Storage
- Find and delete `workoutSessions` key

**Q: Can I access this on multiple devices?**
- Currently no - data is stored locally per browser
- Consider exporting data manually if needed

## License

This is a personal project. Feel free to modify and use as needed.

## Credits

- Design inspiration from Focus Portal Design System
- Icons: Inline SVG (similar to Lucide Icons style)
- Font: Inter by Rasmus Andersson

---

**Made for tracking gains, one rep at a time.** 💪
