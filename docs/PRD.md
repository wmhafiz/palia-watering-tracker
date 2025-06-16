# Palia Clock - Logic Overview & React Implementation Guide

## Project Overview

The Palia Clock is a real-time tool for players of the game Palia that displays the in-game time, helping players track when crops need water or when NPCs are awake. The clock shows both the current Palia time and the day/cycle information within the game's weekly schedule.

## Core Time Logic

### Real Time Conversion

```javascript
// Convert real-world time to Palia time base (PST)
const PST_UTC_SUNDAY_OFFSET = 60 * 60 * (8 + 3 * 24); // 8 hours PST + 3 days offset
const realTimePST = Date.now() / 1000 - PST_UTC_SUNDAY_OFFSET;
```

### Palia Time Calculation

```javascript
// One Palia day = 1 real-world hour
// Palia time runs 24x faster than real time
const palianTimeOfDay = (realTimePST * 24) % (24 * 60 * 60); // seconds in a day

// Convert to hours and minutes for display
const palianMinutes = Math.floor(palianTimeOfDay / 60);
const hours = Math.floor(palianMinutes / 60);
const minutes = palianMinutes % 60;
const clockTime = `${hours.toString().padStart(2, "0")}:${minutes
  .toString()
  .padStart(2, "0")}`;
```

### Day/Cycle System

```javascript
// Week starts Sunday 9 PM PST
const timeSincePSTWeek = (realTimePST - 21 * 3600) % (7 * 24 * 3600);
const palianCycleThisWeek = timeSincePSTWeek / 3600;
const palianDayThisWeek = Math.floor(palianCycleThisWeek / 24);
const palianCycleThisDay = Math.floor(palianCycleThisWeek) % 24;

const dayText = `Day ${palianDayThisWeek + 1} Cycle ${(palianCycleThisDay + 1)
  .toString()
  .padStart(2, "0")}`;
```

### Time of Day Periods

```javascript
const getPartOfDay = (hours) => {
  if (hours >= 21 || hours < 3) return "Night"; // 21:00 - 03:00
  if (hours >= 18) return "Evening"; // 18:00 - 21:00
  if (hours >= 6) return "Day"; // 06:00 - 18:00
  return "Morning"; // 03:00 - 06:00
};
```

## Visual Components

### Clock Dial

- Circular SVG clock with 4 colored segments representing time periods:
  - **Morning (3-6)**: Gold
  - **Day (6-18)**: Light Blue
  - **Evening (18-21)**: Dark Orange
  - **Night (21-3)**: Navy Blue
- Rotating dial pointer that moves 360° per Palia day
- Pointer rotation: `(360 * palianTimeOfDay) / (24 * 60 * 60) + 90` degrees

### Display Elements

- **Large Time Display**: HH:MM format in center
- **Period Label**: Morning/Day/Evening/Night
- **Day/Cycle Info**: "Day X Cycle Y" format
- **Dynamic Page Title**: Updates with current time

## React Implementation Requirements

### State Management

```javascript
const [currentTime, setCurrentTime] = useState(Date.now());

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(Date.now());
  }, 250); // Update every 250ms for smooth animation

  return () => clearInterval(interval);
}, []);
```

### Computed Values (useMemo)

- `realTimePST`: Base PST time calculation
- `palianTimeOfDay`: Current Palia time in seconds
- `clockTime`: Formatted HH:MM string
- `partOfDay`: Current time period
- `dayText`: Day/Cycle information
- `dialRotation`: Pointer rotation angle

### Responsive Design Considerations

- Use `aspect-square` for circular clock
- Implement proper scaling with `w-full max-w-md` or similar
- Use responsive text sizes (`text-sm sm:text-base lg:text-lg`)
- Ensure touch-friendly sizing on mobile
- Consider horizontal layout on very small screens

### TailwindCSS Color Scheme

- **Morning**: `bg-yellow-400` or `bg-amber-400`
- **Day**: `bg-sky-300` or `bg-blue-200`
- **Evening**: `bg-orange-500` or `bg-amber-600`
- **Night**: `bg-indigo-900` or `bg-slate-800`
- **Background**: `bg-gray-600` or `bg-slate-500`
- **Pointer**: `bg-black`

### Key Features to Implement

1. **Real-time Updates**: Smooth 250ms refresh rate
2. **Responsive Design**: Works on mobile and desktop
3. **Modern UI**: Clean, game-themed design with good contrast
4. **Accessibility**: Proper ARIA labels and semantic HTML
5. **Performance**: Optimized re-renders with useMemo/useCallback
6. **Title Updates**: Dynamic document title showing current time

### Optional Enhancements

- Add smooth transitions for dial rotation
- Include visual indicators for important game times
- Add sound notifications for specific hours
- Implement theme switching (light/dark mode)
- Add countdown timers for specific events
- Include tooltip information about time periods

## Technical Notes

- SVG is used for the circular clock design
- Time calculations assume PST (UTC-8) without DST adjustments
- The week cycle starts Sunday 9 PM PST
- Each real hour equals one Palia day (24 Palia hours)
