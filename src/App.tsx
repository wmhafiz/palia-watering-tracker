import React, { useState, useEffect, useMemo } from 'react';

interface TimeData {
    clockTime: string;
    partOfDay: string;
    dayText: string;
    dialRotation: number;
    hours: number;
}

interface CropWateringState {
    cropsWatered: boolean;
    lastResetDay: string;
}

interface WeeklyWateringState {
    weeklyChecklist: boolean[];
    lastResetWeek: string;
    currentWeekStart: string;
}

const App: React.FC = () => {
    const [currentTime, setCurrentTime] = useState<number>(Date.now());
    const [cropWateringState, setCropWateringState] = useState<CropWateringState>(() => {
        const saved = localStorage.getItem('paliaWateringState');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            cropsWatered: false,
            lastResetDay: ''
        };
    });

    const [weeklyWateringState, setWeeklyWateringState] = useState<WeeklyWateringState>(() => {
        const saved = localStorage.getItem('paliaWeeklyWateringState');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            weeklyChecklist: [false, false, false, false, false, false, false],
            lastResetWeek: '',
            currentWeekStart: ''
        };
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 250); // Update every 250ms for smooth animation

        return () => clearInterval(interval);
    }, []);

    const timeData = useMemo((): TimeData & { weekIdentifier: string; dayOfWeek: number } => {
        // Convert real-world time to Palia time base (PST)
        const PST_UTC_SUNDAY_OFFSET = 60 * 60 * (8 + 3 * 24); // 8 hours PST + 3 days offset
        const realTimePST = currentTime / 1000 - PST_UTC_SUNDAY_OFFSET;

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

        // Week starts Sunday 9 PM PST
        const timeSincePSTWeek = (realTimePST - 21 * 3600) % (7 * 24 * 3600);
        const palianCycleThisWeek = timeSincePSTWeek / 3600;
        const palianDayThisWeek = Math.floor(palianCycleThisWeek / 24);
        const palianCycleThisDay = Math.floor(palianCycleThisWeek) % 24;

        const dayText = `Day ${palianDayThisWeek + 1} Cycle ${(palianCycleThisDay + 1)
            .toString()
            .padStart(2, "0")}`;

        // Calculate week identifier for weekly reset
        const weekNumber = Math.floor((realTimePST - 21 * 3600) / (7 * 24 * 3600));
        const weekIdentifier = `week-${weekNumber}`;

        // Determine time period
        const getPartOfDay = (hours: number): string => {
            if (hours >= 21 || hours < 3) return "Night"; // 21:00 - 03:00
            if (hours >= 18) return "Evening"; // 18:00 - 21:00
            if (hours >= 6) return "Day"; // 06:00 - 18:00
            return "Morning"; // 03:00 - 06:00
        };

        const partOfDay = getPartOfDay(hours);

        // Pointer rotation: 6 AM (start of day) should point to 0° (top)
        // Subtract 6 hours worth of degrees (6 * 15 = 90°) to align 6 AM with top
        const dialRotation = (360 * palianTimeOfDay) / (24 * 60 * 60) - 90;

        return {
            clockTime,
            partOfDay,
            dayText,
            dialRotation,
            hours,
            weekIdentifier,
            dayOfWeek: palianDayThisWeek
        };
    }, [currentTime]);

    // Handle daily reset at 6am game time
    useEffect(() => {
        const currentDay = timeData.dayText;
        const isNewDay = currentDay !== cropWateringState.lastResetDay;
        const is6amOrLater = timeData.hours >= 6;

        // Reset crops if it's a new day and it's 6am or later
        if (isNewDay && is6amOrLater) {
            const resetState: CropWateringState = {
                cropsWatered: false,
                lastResetDay: currentDay
            };
            setCropWateringState(resetState);
            localStorage.setItem('paliaWateringState', JSON.stringify(resetState));
        }
    }, [timeData.dayText, timeData.hours, cropWateringState.lastResetDay]);

    // Handle weekly reset
    useEffect(() => {
        const currentWeek = timeData.weekIdentifier;
        const isNewWeek = currentWeek !== weeklyWateringState.lastResetWeek;

        // Reset weekly checklist if it's a new week
        if (isNewWeek) {
            const resetWeeklyState: WeeklyWateringState = {
                weeklyChecklist: [false, false, false, false, false, false, false],
                lastResetWeek: currentWeek,
                currentWeekStart: currentWeek
            };
            setWeeklyWateringState(resetWeeklyState);
            localStorage.setItem('paliaWeeklyWateringState', JSON.stringify(resetWeeklyState));
        }
    }, [timeData.weekIdentifier, weeklyWateringState.lastResetWeek]);

    // Update weekly checklist when daily watering is completed
    useEffect(() => {
        if (cropWateringState.cropsWatered && timeData.dayOfWeek >= 0 && timeData.dayOfWeek < 7) {
            const newChecklist = [...weeklyWateringState.weeklyChecklist];
            if (!newChecklist[timeData.dayOfWeek]) {
                newChecklist[timeData.dayOfWeek] = true;
                const updatedWeeklyState = {
                    ...weeklyWateringState,
                    weeklyChecklist: newChecklist
                };
                setWeeklyWateringState(updatedWeeklyState);
                localStorage.setItem('paliaWeeklyWateringState', JSON.stringify(updatedWeeklyState));
            }
        }
    }, [cropWateringState.cropsWatered, timeData.dayOfWeek, weeklyWateringState]);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('paliaWateringState', JSON.stringify(cropWateringState));
    }, [cropWateringState]);

    useEffect(() => {
        localStorage.setItem('paliaWeeklyWateringState', JSON.stringify(weeklyWateringState));
    }, [weeklyWateringState]);

    const toggleCropsWatered = () => {
        setCropWateringState(prev => ({
            ...prev,
            cropsWatered: !prev.cropsWatered
        }));
    };

    // Update document title
    useEffect(() => {
        document.title = `${timeData.clockTime} - ${timeData.partOfDay} - Palia Clock`;
    }, [timeData.clockTime, timeData.partOfDay]);

    const getPeriodColor = (period: string): string => {
        switch (period) {
            case 'Morning': return 'text-amber-400';
            case 'Day': return 'text-sky-300';
            case 'Evening': return 'text-orange-500';
            case 'Night': return 'text-indigo-300';
            default: return 'text-gray-300';
        }
    };

    const getBackgroundGradient = (period: string): string => {
        switch (period) {
            case 'Morning': return 'from-amber-900 to-amber-700';
            case 'Day': return 'from-sky-900 to-sky-700';
            case 'Evening': return 'from-orange-900 to-orange-700';
            case 'Night': return 'from-indigo-900 to-indigo-800';
            default: return 'from-gray-900 to-gray-700';
        }
    };

    const getDayName = (dayIndex: number): string => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayIndex];
    };

    const getWeeklyProgress = (): number => {
        const completedDays = weeklyWateringState.weeklyChecklist.filter(day => day).length;
        return Math.round((completedDays / 7) * 100);
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br ${getBackgroundGradient(timeData.partOfDay)} flex items-center justify-center p-4`}>
            <div className="w-full mx-auto grid grid-cols-3 gap-3">

                {/* Clock SVG */}
                <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-white/10">
                    <svg
                        viewBox="0 0 200 200"
                        className="w-full h-full transform -rotate-90"
                        aria-label="Palia Clock"
                    >
                        {/* Background Circle */}
                        <circle
                            cx="100"
                            cy="100"
                            r="90"
                            fill="rgba(0,0,0,0.3)"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="2"
                        />

                        {/* Time Period Segments */}
                        {/* Day: 06:00-18:00 (0°-180°) - starts at top (12 o'clock) */}
                        <path
                            d="M 100 100 L 100 10 A 90 90 0 1 1 100 190 Z"
                            className="fill-sky-300/80"
                        />

                        {/* Evening: 18:00-21:00 (180°-225°) */}
                        <path
                            d="M 100 100 L 100 190 A 90 90 0 0 1 36.36 163.64 Z"
                            className="fill-orange-500/80"
                        />

                        {/* Night: 21:00-03:00 (225°-315°) */}
                        <path
                            d="M 100 100 L 36.36 163.64 A 90 90 0 0 1 36.36 36.36 Z"
                            className="fill-indigo-900/80"
                        />

                        {/* Morning: 03:00-06:00 (315°-360°/0°) */}
                        <path
                            d="M 100 100 L 36.36 36.36 A 90 90 0 0 1 100 10 Z"
                            className="fill-amber-400/80"
                        />

                        {/* Hour Markers */}
                        {Array.from({ length: 24 }, (_, i) => {
                            const angle = (i * 15) - 90; // 15 degrees per hour, offset by 90
                            const isMainHour = i % 6 === 0;
                            const radius = isMainHour ? 75 : 80;
                            const x1 = 100 + 85 * Math.cos((angle * Math.PI) / 180);
                            const y1 = 100 + 85 * Math.sin((angle * Math.PI) / 180);
                            const x2 = 100 + radius * Math.cos((angle * Math.PI) / 180);
                            const y2 = 100 + radius * Math.sin((angle * Math.PI) / 180);

                            return (
                                <line
                                    key={i}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="rgba(255,255,255,0.6)"
                                    strokeWidth={isMainHour ? "2" : "1"}
                                />
                            );
                        })}

                        {/* Clock Pointer */}
                        <line
                            x1="100"
                            y1="100"
                            x2="100"
                            y2="25"
                            stroke="#ffffff"
                            strokeWidth="3"
                            strokeLinecap="round"
                            transform={`rotate(${timeData.dialRotation} 100 100)`}
                            className="transition-transform duration-200 ease-out"
                        />

                        {/* Center Dot */}
                        <circle
                            cx="100"
                            cy="100"
                            r="4"
                            fill="#ffffff"
                        />
                    </svg>
                </div>

                <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-white/10 flex flex-col items-center justify-center">

                    {/* Time Display */}
                    <div className="text-center space-y-4">
                        <div className="text-4xl sm:text-8xl font-bold text-white font-mono tracking-wider">
                            {timeData.clockTime}
                        </div>

                        <div className={`text-xl sm:text-4xl font-semibold ${getPeriodColor(timeData.partOfDay)}`}>
                            {timeData.partOfDay}
                        </div>

                        <div className="text-lg sm:text-2xl text-gray-300 font-medium">
                            {timeData.dayText}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                            <span className="text-gray-300">Morning (3-6)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-sky-300"></div>
                            <span className="text-gray-300">Day (6-18)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="text-gray-300">Evening (18-21)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-indigo-900 border border-indigo-300"></div>
                            <span className="text-gray-300">Night (21-3)</span>
                        </div>
                    </div>
                </div>

                <div >
                    {/* Crop Watering Tracker */}
                    <div className="mt-4 bg-black/20 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-white">🌱 Daily Crop Watering</h3>
                            <div className="text-sm text-gray-300">
                                Resets at 6:00 AM
                            </div>
                        </div>

                        <button
                            onClick={toggleCropsWatered}
                            className={`w-full p-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 ${cropWateringState.cropsWatered
                                ? 'bg-green-600/30 border-2 border-green-500/50 text-green-300'
                                : 'bg-gray-700/30 border-2 border-gray-600/50 text-white hover:border-green-400/50'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${cropWateringState.cropsWatered
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-400'
                                }`}>
                                {cropWateringState.cropsWatered && '✓'}
                            </div>
                            <span className="text-xl font-semibold">
                                {cropWateringState.cropsWatered ? 'Crops Watered Today!' : 'Mark Crops as Watered'}
                            </span>
                        </button>

                        {cropWateringState.cropsWatered && (
                            <div className="mt-3 p-3 bg-green-600/20 border border-green-500/30 rounded-lg text-center">
                                <span className="text-green-300 font-medium">🎉 Great job! Your crops are watered for today!</span>
                            </div>
                        )}
                    </div>

                    {/* Weekly Crop Watering Checklist */}
                    <div className="mt-4 bg-black/20 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">📅 Weekly Watering Progress</h3>
                            <div className="text-sm text-gray-300">
                                {getWeeklyProgress()}% Complete
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4 bg-gray-700/30 rounded-full h-3 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 ease-out"
                                style={{ width: `${getWeeklyProgress()}%` }}
                            ></div>
                        </div>

                        {/* Weekly Checklist Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {weeklyWateringState.weeklyChecklist.map((isWatered, dayIndex) => {
                                const isCurrentDay = dayIndex === timeData.dayOfWeek;
                                const dayName = getDayName(dayIndex);

                                return (
                                    <div
                                        key={dayIndex}
                                        className={`relative p-3 rounded-lg text-center transition-all duration-200 ${isCurrentDay
                                            ? 'bg-blue-600/30 border-2 border-blue-400/50 ring-2 ring-blue-300/20'
                                            : 'bg-gray-700/20 border border-gray-600/30'
                                            }`}
                                    >
                                        <div className="text-xs font-medium text-gray-300 mb-2">
                                            {dayName.slice(0, 3)}
                                        </div>

                                        <div className={`w-8 h-8 mx-auto rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isWatered
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : isCurrentDay
                                                ? 'border-blue-400 text-blue-300'
                                                : 'border-gray-500 text-gray-400'
                                            }`}>
                                            {isWatered ? '✓' : dayIndex + 1}
                                        </div>

                                        {isCurrentDay && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Weekly Summary */}
                        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">
                                    Days Completed: {weeklyWateringState.weeklyChecklist.filter(day => day).length}/7
                                </span>
                                <span className="text-gray-300">
                                    Current: Day {timeData.dayOfWeek + 1}
                                </span>
                            </div>

                            {getWeeklyProgress() === 100 && (
                                <div className="mt-2 p-2 bg-green-600/20 border border-green-500/30 rounded text-center">
                                    <span className="text-green-300 font-medium text-sm">🎉 Perfect week! All crops watered!</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default App;