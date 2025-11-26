import { useState, useEffect } from "react";
import {
    format,
    addDays,
    startOfDay,
    addMinutes,
    isSameDay,
    isBefore,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    setHours,
    setMinutes
} from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Label } from "./ui/Label";
import { ChevronLeft, ChevronRight, Clock, Calendar } from "lucide-react";

export const TimeSlotPicker = ({
    selectedSlots = [],
    onChange,
    readOnly = false,
    initialDuration = 30
}) => {
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
    const [duration, setDuration] = useState(initialDuration);
    const [hasAutoFocused, setHasAutoFocused] = useState(false);

    // Auto-focus the calendar on the first selected slot if available (only once)
    useEffect(() => {
        if (selectedSlots.length > 0 && !hasAutoFocused) {
            const firstSlotDate = new Date(selectedSlots[0].start);
            setCurrentMonth(startOfMonth(firstSlotDate));
            setSelectedDate(startOfDay(firstSlotDate));
            setHasAutoFocused(true);
        }
    }, [selectedSlots, hasAutoFocused]);

    // Generate calendar days
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    // Calculate padding days for proper calendar alignment
    const firstDayOfMonth = startOfMonth(currentMonth);
    const paddingDays = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Generate time slots for the selected date (8am - 6pm)
    const generateTimeSlots = (date) => {
        const slots = [];
        const start = setMinutes(setHours(date, 8), 0); // 8:00 AM
        const end = setMinutes(setHours(date, 18), 0);   // 6:00 PM
        const now = new Date();

        let currentTime = start;
        while (isBefore(currentTime, end)) {
            // Only include future time slots if the selected date is today
            if (isSameDay(date, now)) {
                if (currentTime > now) {
                    slots.push(currentTime);
                }
            } else {
                slots.push(currentTime);
            }
            currentTime = addMinutes(currentTime, 30); // Always 30 min intervals
        }
        return slots;
    };

    const timeSlots = generateTimeSlots(selectedDate);

    const isSelected = (time) => {
        return selectedSlots.some(slot =>
            new Date(slot.start).getTime() === time.getTime()
        );
    };

    const hasTimeslotOnDate = (date) => {
        return selectedSlots.some(slot => {
            const slotDate = new Date(slot.start);
            return isSameDay(slotDate, date);
        });
    };

    const handleTimeClick = (time) => {
        if (readOnly) return;

        const timeStr = time.toISOString();

        // Toggle selection
        const exists = isSelected(time);
        let newSlots;
        if (exists) {
            newSlots = selectedSlots.filter(s => s.start !== timeStr);
        } else {
            // Store just the start time. Duration is managed globally.
            newSlots = [...selectedSlots, { start: timeStr }];
        }
        onChange(newSlots, duration);
    };

    return (
        <div className="w-full max-w-4xl mx-auto shadow-lg rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border-2">
            {/* Left Panel: Calendar & Duration */}
            <Card className="rounded-none border-0 border-r-2 shadow-none">
                <CardHeader className="space-y-6">
                    {!readOnly && (
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 font-semibold text-lg">
                                <Clock className="w-5 h-5 text-primary" />
                                Duration: <span className="text-primary font-bold">{duration} mins</span>
                            </Label>
                            <input
                                type="range"
                                min="30"
                                max="240"
                                step="30"
                                value={duration}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 30;
                                    setDuration(val);
                                    // Just pass the new duration, slots don't need to change
                                    onChange(selectedSlots, val);
                                }}
                                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>30m</span>
                                <span>4h</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                {format(currentMonth, "MMMM yyyy")}
                            </h3>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addDays(startOfMonth(prev), -1))}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addDays(endOfMonth(prev), 1))}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-sm">
                            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                                <div key={d} className="text-muted-foreground py-1 font-medium">{d}</div>
                            ))}
                            {/* Padding cells to align the first day of month with correct day-of-week */}
                            {Array.from({ length: paddingDays }).map((_, i) => (
                                <div key={`padding-${i}`} className="w-9 h-9" />
                            ))}
                            {daysInMonth.map((day, i) => {
                                const isSelectedDate = isSameDay(day, selectedDate);
                                const isToday = isSameDay(day, new Date());
                                const hasSlots = hasTimeslotOnDate(day);
                                const isPastDate = isBefore(startOfDay(day), startOfDay(new Date()));
                                return (
                                    <button
                                        key={i}
                                        onClick={() => !isPastDate && setSelectedDate(day)}
                                        disabled={isPastDate}
                                        className={cn(
                                            "w-9 h-9 rounded-md flex items-center justify-center mx-auto transition-all relative text-sm",
                                            isPastDate
                                                ? "text-muted-foreground/30 cursor-not-allowed"
                                                : isSelectedDate
                                                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                                                    : isToday
                                                        ? "bg-primary/10 text-primary font-semibold border border-primary"
                                                        : "hover:bg-accent text-foreground"
                                        )}
                                    >
                                        {format(day, "d")}
                                        {hasSlots && !isSelectedDate && !isPastDate && (
                                            <div className="absolute bottom-0.5 w-1 h-1 bg-primary rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Right Panel: Time Slots */}
            <Card className="rounded-none border-0 shadow-none bg-accent/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Choose start time ({duration} min duration)</CardTitle>
                    <p className="text-sm text-muted-foreground">{format(selectedDate, "EEEE, MMMM d")}</p>

                </CardHeader>
                <CardContent className="flex flex-col">
                    {/* Added px-2 to fix left edge cut off when scaled */}
                    <div className="flex-1 overflow-y-auto max-h-[450px] space-y-2 px-2 custom-scrollbar">
                        {timeSlots.map((time, i) => {
                            const selected = isSelected(time);

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleTimeClick(time)}
                                    disabled={readOnly}
                                    className={cn(
                                        "w-full py-3 px-4 rounded-lg border text-left transition-all flex items-center justify-between",
                                        selected
                                            ? "bg-primary text-primary-foreground border-primary shadow-md transform scale-[1.02]"
                                            : "bg-background border-border hover:border-primary hover:shadow-sm hover:scale-[1.01]"
                                    )}
                                >
                                    <span className="font-medium">{format(time, "h:mm a")}</span>
                                    {selected && <span className="text-xs">✓</span>}
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
