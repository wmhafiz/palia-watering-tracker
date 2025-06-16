import React, { useState, useEffect, useMemo } from 'react';

interface TimeData {
    clockTime: string;
    partOfDay: string;
    dayText: string;
    dialRotation: number;
    hours: number;
}

const App: React.FC = () => {
    const [currentTime, setCurrentTime] = useState<number>(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 250); // Update every 250ms for smooth animation

        return () => clearInterval(interval);
    }, []);

    const timeData = useMemo((): TimeData => {
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
            hours
        };
    }, [currentTime]);

    // Update document title
    useEffect(() => {
        document.title = `${timeData.clockTime} - ${timeData.partOfDay} - Palia Clock`;
    }, [timeData.clockTime, timeData.partOfDay]);

    const getTimeSegments = () => {
        return [
            { start: 0, end: 90, color: 'fill-palia-night', period: 'Night' }, // 21:00 - 03:00 (270° - 90°)
            { start: 90, end: 180, color: 'fill-palia-morning', period: 'Morning' }, // 03:00 - 06:00 (90° - 180°)
            { start: 180, end: 360, color: 'fill-palia-day', period: 'Day' }, // 06:00 - 18:00 (180° - 360°)
            { start: 270, end: 360, color: 'fill-palia-evening', period: 'Evening' }, // 18:00 - 21:00 (270° - 360°)
        ];
    };

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

    return (
        <div className={`min-h-screen bg-gradient-to-br ${getBackgroundGradient(timeData.partOfDay)} flex items-center justify-center p-4`}>
            <div className="w-full max-w-md mx-auto">
                {/* Main Clock Container */}
                <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-white/10">
                    {/* Clock SVG */}
                    <div className="relative aspect-square w-full mb-6">
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

                    {/* Time Display */}
                    <div className="text-center space-y-4">
                        <div className="text-4xl sm:text-5xl font-bold text-white font-mono tracking-wider">
                            {timeData.clockTime}
                        </div>

                        <div className={`text-xl sm:text-2xl font-semibold ${getPeriodColor(timeData.partOfDay)}`}>
                            {timeData.partOfDay}
                        </div>

                        <div className="text-lg sm:text-xl text-gray-300 font-medium">
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

                {/* Footer */}
                <div className="text-center mt-4 text-gray-400 text-sm">
                    Palia Clock - Real-time in-game time tracker
                </div>
            </div>
        </div>
    );
};

export default App;