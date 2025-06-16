import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface TimeData {
    clockTime: string;
    partOfDay: string;
    dayText: string;
    dialRotation: number;
    hours: number;
}

interface CropWateringState {
    watered: { [cropName: string]: boolean };
    lastResetDay: string;
}

interface CycleWateringState {
    cycleHistory: Array<{
        cycleId: string;
        watered: boolean;
        timestamp: number;
        dayText: string;
    }>;
}

const CropListItem: React.FC<{
    crop: any;
    checked?: boolean;
    onCheck?: (checked: boolean) => void;
    onClick?: () => void;
    showCheckbox?: boolean;
    rightContent?: React.ReactNode;
}> = ({ crop, checked, onCheck, onClick, showCheckbox, rightContent }) => (
    <label
        className={`flex items-center space-x-3 py-2 cursor-pointer border-b border-gray-200 last:border-b-0 ${onClick ? 'hover:bg-gray-800 transition' : ''}`}
        onClick={onClick}
        style={onClick ? { cursor: 'pointer' } : {}}
    >
        {showCheckbox && (
            <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-600"
                checked={checked}
                onChange={e => {
                    e.stopPropagation();
                    onCheck && onCheck(e.target.checked);
                }}
                onClick={e => e.stopPropagation()}
            />
        )}
        <img src={crop.picture_url} alt={crop.name} className="w-12 h-12 object-contain rounded bg-gray-100 border border-gray-300" />
        <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-300 truncate">{crop.name}</div>
            <div className="text-xs text-gray-400 flex flex-wrap gap-x-2 gap-y-1 mt-1">
                <span>⏱ {crop.harvest_time}</span>
                <span>💰 {crop.base_value}/{crop.star_value}</span>
                <span>🌱 {crop.garden_buff}</span>
                <span>🏷 {crop.group}</span>
            </div>
        </div>
        {rightContent}
    </label>
);

const App: React.FC = () => {
    const [currentTime, setCurrentTime] = useState<number>(Date.now());
    const [cropWateringState, setCropWateringState] = useState<CropWateringState>(() => {
        const saved = localStorage.getItem('paliaWateringState');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            watered: {},
            lastResetDay: ''
        };
    });

    const [cycleWateringState, setCycleWateringState] = useState<CycleWateringState>(() => {
        const saved = localStorage.getItem('paliaCycleWateringState');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            cycleHistory: []
        };
    });

    const [trackedCrops, setTrackedCrops] = useState<string[]>(() => {
        const saved = localStorage.getItem('paliaTrackedCrops');
        if (saved) return JSON.parse(saved);
        return [];
    });

    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [allCrops, setAllCrops] = useState<any[]>([]);
    const [tempSelectedCrops, setTempSelectedCrops] = useState<string[] | null>(null);
    const [filterBuff, setFilterBuff] = useState('');
    const [filterRarity, setFilterRarity] = useState('');
    const [filterGroup, setFilterGroup] = useState('');
    const [filterPrice, setFilterPrice] = useState([0, 999]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 250); // Update every 250ms for smooth animation

        return () => clearInterval(interval);
    }, []);

    const timeData = useMemo((): TimeData & { weekIdentifier: string; dayOfWeek: number; cycleId: string } => {
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

        // Calculate cycle identifier (unique for each cycle)
        const totalCycles = Math.floor(realTimePST / 3600);
        const cycleId = `cycle-${totalCycles}`;

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
            dayOfWeek: palianDayThisWeek,
            cycleId
        };
    }, [currentTime]);

    useEffect(() => {
        fetch('crops.json')
            .then(res => res.json())
            .then(data => setAllCrops(data.sort((a: any, b: any) => a.base_value - b.base_value)));
    }, []);

    useEffect(() => {
        localStorage.setItem('paliaTrackedCrops', JSON.stringify(trackedCrops));
    }, [trackedCrops]);

    useEffect(() => {
        const currentDay = timeData.dayText;
        const isNewDay = currentDay !== cropWateringState.lastResetDay;
        const is6amOrLater = timeData.hours >= 6;
        if (isNewDay && is6amOrLater) {
            const resetState: CropWateringState = {
                watered: Object.fromEntries(trackedCrops.map(crop => [crop, false])),
                lastResetDay: currentDay
            };
            setCropWateringState(resetState);
            localStorage.setItem('paliaWateringState', JSON.stringify(resetState));
        }
    }, [timeData.dayText, timeData.hours, cropWateringState.lastResetDay, trackedCrops]);

    useEffect(() => {
        localStorage.setItem('paliaCycleWateringState', JSON.stringify(cycleWateringState));
    }, [cycleWateringState]);

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


    const getCycleProgress = (): number => {
        const wateredCycles = cycleWateringState.cycleHistory.filter(cycle => cycle.watered).length;
        return Math.round((wateredCycles / 5) * 100);
    };

    const getCurrentCycleStatus = (): boolean => {
        return cycleWateringState.cycleHistory.some(cycle => cycle.cycleId === timeData.cycleId && cycle.watered);
    };

    const openCropModal = useCallback(() => {
        setTempSelectedCrops(trackedCrops);
        setIsCropModalOpen(true);
    }, [trackedCrops]);
    const closeCropModal = useCallback(() => setIsCropModalOpen(false), []);
    const handleTrackedCropsChange = (newTracked: string[]) => {
        setTrackedCrops(newTracked);
        // Also reset watering state for new crops
        setCropWateringState(prev => ({
            watered: Object.fromEntries(newTracked.map(crop => [crop, prev.watered[crop] || false])),
            lastResetDay: prev.lastResetDay
        }));
    };

    // Helper to get unique values for dropdowns
    const unique = (arr: any[], key: string): string[] => Array.from(new Set(arr.map((item: any) => String(item[key])))).filter(Boolean) as string[];

    // Filtered crops for modal
    const filteredCrops = allCrops.filter(crop => {
        return (
            (!filterBuff || crop.garden_buff === filterBuff) &&
            (!filterRarity || crop.rarity === filterRarity) &&
            (!filterGroup || crop.group === filterGroup) &&
            crop.base_value >= filterPrice[0] && crop.base_value <= filterPrice[1]
        );
    });

    // Helper to update cycle status based on watered crops
    const updateCycleStatus = (watered: { [cropName: string]: boolean }) => {
        const allWatered = trackedCrops.length > 0 && trackedCrops.every(crop => watered[crop]);
        setCycleWateringState(prev => {
            const exists = prev.cycleHistory.some(c => c.cycleId === timeData.cycleId);
            let newHistory;
            if (exists) {
                newHistory = prev.cycleHistory.map(c =>
                    c.cycleId === timeData.cycleId ? { ...c, watered: allWatered } : c
                );
            } else {
                newHistory = [
                    { cycleId: timeData.cycleId, watered: allWatered, timestamp: Date.now(), dayText: timeData.dayText },
                    ...prev.cycleHistory.slice(0, 4)
                ];
            }
            return { ...prev, cycleHistory: newHistory };
        });
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br ${getBackgroundGradient(timeData.partOfDay)} flex items-center justify-center p-4`}>
            <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">

                {/* Clock SVG - hidden on small screens */}
                <div className="hidden sm:block">
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
                    {/* Legend - hidden on small screens */}
                    <div className="mt-6 flex flex-row gap-2 items-center justify-center text-sm">
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

                {/* Time Display - always visible */}
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

                        <p className="text-md text-gray-400 font-medium">
                            Palia week begins on Sundays 9 PM PST (UTC-8), which will show as "Day 1 Cycle 1". Each Day has 24 Cycles, the Week has 7 Days.
                        </p>
                    </div>
                </div>

                {/* Watering Trackers - always visible */}
                <div>
                    {/* Crop Watering Tracker */}
                    <div className="mt-4 bg-black/20 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-white">🌱 Daily Crop Watering</h3>
                            <div className="text-sm text-gray-300">Resets at 6:00 AM</div>
                        </div>
                        {trackedCrops.length === 0 ? (
                            <div className="text-gray-400 text-center py-4">No crops tracked. </div>
                        ) : (
                            <>
                                <div className="flex justify-end gap-2 mb-2">
                                    <button
                                        className="px-3 py-1 rounded bg-green-600/80 text-white text-xs hover:bg-green-700"
                                        onClick={() => {
                                            const newWatered = Object.fromEntries(trackedCrops.map(crop => [crop, true]));
                                            setCropWateringState(prev => ({ ...prev, watered: newWatered }));
                                            updateCycleStatus(newWatered);
                                        }}
                                    >Water All</button>
                                    <button
                                        className="px-3 py-1 rounded bg-gray-400/80 text-white text-xs hover:bg-gray-500"
                                        onClick={() => {
                                            const newWatered = Object.fromEntries(trackedCrops.map(crop => [crop, false]));
                                            setCropWateringState(prev => ({ ...prev, watered: newWatered }));
                                            updateCycleStatus(newWatered);
                                        }}
                                    >Water None</button>
                                </div>
                                <div className="space-y-2">
                                    {trackedCrops.map(cropName => {
                                        const crop = allCrops.find(c => c.name === cropName);
                                        if (!crop) return null;
                                        return (
                                            <CropListItem
                                                key={cropName}
                                                crop={crop}
                                                onClick={() => {
                                                    setCropWateringState(prev => {
                                                        const newWatered = {
                                                            ...prev.watered,
                                                            [cropName]: !prev.watered[cropName]
                                                        };
                                                        updateCycleStatus(newWatered);
                                                        return { ...prev, watered: newWatered };
                                                    });
                                                }}
                                                rightContent={
                                                    <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${cropWateringState.watered[cropName]
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-400'
                                                        }`}>
                                                        {cropWateringState.watered[cropName] ? '✓' : '○'}
                                                    </span>
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}
                        <div className="mt-3 text-center">
                            <button className="underline text-blue-300" onClick={openCropModal}>Manage Tracked Crops</button>
                        </div>
                    </div>
                    {/* Last 5 Cycles Watering Status */}
                    <div className="mt-4 bg-black/20 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">🔄 Last 5 Cycles Status</h3>
                            <div className="text-sm text-gray-300">
                                {getCycleProgress()}% Complete
                            </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="mb-4 bg-gray-700/30 rounded-full h-3 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 ease-out"
                                style={{ width: `${getCycleProgress()}%` }}
                            ></div>
                        </div>
                        {/* Cycle History Grid */}
                        <div className="grid grid-cols-5 gap-2">
                            {Array.from({ length: 5 }, (_, index) => {
                                const cycleEntry = cycleWateringState.cycleHistory[index];
                                const isCurrentCycle = cycleEntry?.cycleId === timeData.cycleId;
                                const isWatered = cycleEntry?.watered || false;

                                return (
                                    <div
                                        key={index}
                                        className={`relative p-3 rounded-lg text-center transition-all duration-200 ${isCurrentCycle
                                            ? 'bg-blue-600/30 border-2 border-blue-400/50 ring-2 ring-blue-300/20'
                                            : 'bg-gray-700/20 border border-gray-600/30'
                                            }`}
                                    >
                                        <div className="text-xs font-medium text-gray-300 mb-2">
                                            {cycleEntry ? cycleEntry.dayText.split(' ').slice(-2).join(' ') : `C${index + 1}`}
                                        </div>
                                        <div className={`w-8 h-8 mx-auto rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isWatered
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : isCurrentCycle
                                                ? 'border-blue-400 text-blue-300'
                                                : 'border-gray-500 text-gray-400'
                                            }`}>
                                            {isWatered ? '✓' : cycleEntry ? '○' : '-'}
                                        </div>
                                        {isCurrentCycle && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {/* Cycle Summary */}
                        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">
                                    Cycles Watered: {cycleWateringState.cycleHistory.filter(cycle => cycle.watered).length}/5
                                </span>
                                <span className="text-gray-300">
                                    Current: {getCurrentCycleStatus() ? 'Watered' : 'Not Watered'}
                                </span>
                            </div>
                            {getCycleProgress() === 100 && (
                                <div className="mt-2 p-2 bg-green-600/20 border border-green-500/30 rounded text-center">
                                    <span className="text-green-300 font-medium text-sm">🎉 Perfect! Last 5 cycles all watered!</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {isCropModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div
                        className={`rounded-2xl shadow-2xl max-w-lg w-full p-6 relative bg-gradient-to-br ${getBackgroundGradient(timeData.partOfDay)} ${['Night', 'Evening'].includes(timeData.partOfDay) ? 'text-white' : 'text-gray-900'}`}
                    >
                        <h2 className="text-2xl font-bold mb-4 text-gray-900">Select Crops to Track</h2>
                        {/* Filters */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <select className="border rounded px-2 py-1 text-sm" value={filterBuff} onChange={e => setFilterBuff(e.target.value)}>
                                <option value="">All Buffs</option>
                                {unique(allCrops, 'garden_buff').map(buff => (
                                    <option key={String(buff)} value={String(buff)}>{String(buff)}</option>
                                ))}
                            </select>
                            <select className="border rounded px-2 py-1 text-sm" value={filterRarity} onChange={e => setFilterRarity(e.target.value)}>
                                <option value="">All Rarities</option>
                                {unique(allCrops, 'rarity').map(rarity => (
                                    <option key={String(rarity)} value={String(rarity)}>{String(rarity)}</option>
                                ))}
                            </select>
                            <select className="border rounded px-2 py-1 text-sm" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                                <option value="">All Groups</option>
                                {unique(allCrops, 'group').map(group => (
                                    <option key={String(group)} value={String(group)}>{String(group)}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">💰</span>
                                <input
                                    type="range"
                                    min={Math.min(...allCrops.map(c => c.base_value))}
                                    max={Math.max(...allCrops.map(c => c.base_value))}
                                    value={filterPrice[0]}
                                    onChange={e => setFilterPrice([Number(e.target.value), filterPrice[1]])}
                                    className="w-16"
                                />
                                <input
                                    type="range"
                                    min={Math.min(...allCrops.map(c => c.base_value))}
                                    max={Math.max(...allCrops.map(c => c.base_value))}
                                    value={filterPrice[1]}
                                    onChange={e => setFilterPrice([filterPrice[0], Number(e.target.value)])}
                                    className="w-16"
                                />
                                <span className="text-xs text-gray-500">{filterPrice[0]} - {filterPrice[1]}</span>
                            </div>
                            <button
                                className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs hover:bg-gray-300"
                                onClick={e => {
                                    e.preventDefault();
                                    setFilterBuff('');
                                    setFilterRarity('');
                                    setFilterGroup('');
                                    setFilterPrice([Math.min(...allCrops.map(c => c.base_value)), Math.max(...allCrops.map(c => c.base_value))]);
                                }}
                            >Reset Filter</button>
                        </div>
                        {/* Tick All / None */}
                        <div className="flex gap-2 mb-2">
                            <button
                                className="px-3 py-1 rounded bg-gray-300 text-gray-700 text-xs hover:bg-gray-400"
                                onClick={e => {
                                    e.preventDefault();
                                    setTempSelectedCrops([]);
                                }}
                            >Tick None</button>
                            <button
                                className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                                onClick={e => {
                                    e.preventDefault();
                                    if (filterBuff || filterRarity || filterGroup || filterPrice[0] !== Math.min(...allCrops.map(c => c.base_value)) || filterPrice[1] !== Math.max(...allCrops.map(c => c.base_value))) {
                                        setTempSelectedCrops(filteredCrops.map(c => c.name));
                                    } else {
                                        setTempSelectedCrops(allCrops.map(c => c.name));
                                    }
                                }}
                            >Tick All</button>
                            <button
                                className="px-3 py-1 rounded bg-green-500 text-white text-xs hover:bg-green-600"
                                onClick={e => {
                                    e.preventDefault();
                                    setTempSelectedCrops(["Rice", "Tomato", "Wheat", "Potato"]);
                                }}
                            >Tick Default</button>
                            <button
                                className="px-3 py-1 rounded bg-yellow-400 text-gray-900 text-xs hover:bg-yellow-500"
                                onClick={e => {
                                    e.preventDefault();
                                    setTempSelectedCrops(trackedCrops);
                                }}
                            >Reset</button>
                        </div>
                        <div className="max-h-72 overflow-y-auto mb-4">
                            {allCrops.length === 0 ? (
                                <div className="text-gray-500">Loading crops...</div>
                            ) : (
                                <form id="crop-select-form">
                                    {filteredCrops.map((crop: any) => (
                                        <CropListItem
                                            key={crop.name}
                                            crop={crop}
                                            checked={!!tempSelectedCrops?.includes(crop.name)}
                                            onCheck={checked => {
                                                setTempSelectedCrops(prev => {
                                                    if (!prev) prev = trackedCrops;
                                                    if (checked) {
                                                        return [...prev, crop.name];
                                                    } else {
                                                        return prev.filter((name: string) => name !== crop.name);
                                                    }
                                                });
                                            }}
                                            showCheckbox
                                        />
                                    ))}
                                </form>
                            )}
                        </div>
                        <div className="flex justify-end space-x-3 mt-4">
                            <button
                                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                                onClick={closeCropModal}
                            >Cancel</button>
                            <button
                                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                                onClick={() => {
                                    handleTrackedCropsChange(tempSelectedCrops ?? trackedCrops);
                                    closeCropModal();
                                }}
                            >Save</button>
                        </div>
                        <button
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            onClick={closeCropModal}
                            aria-label="Close"
                        >&times;</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;