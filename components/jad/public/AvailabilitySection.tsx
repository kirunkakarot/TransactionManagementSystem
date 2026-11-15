"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Users, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchAvailabilityRadar, checkClashApi } from '@/services/api';
import {
  EventType,
  EVENT_TIME_OPTIONS,
  validateEventTimeRange,
  formatEventTimeRange,
  calculateEventDurationLabel,
} from '../types';

interface AvailabilityDay {
  date: string;
  dayNumber: number;
  status: 'available' | 'limited' | 'booked';
  slotsRemaining: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getInitialDateParts(): { year: number; month: number; dateStr: string } {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, month] = dateStr.split('-').map((v) => parseInt(v, 10));
  return { year, month, dateStr };
}

function buildDefaultMonthDays(year: number, month: number): AvailabilityDay[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    return {
      date: dateStr,
      dayNumber: dayNum,
      status: 'available',
      slotsRemaining: 1,
    };
  });
}

interface AvailabilitySectionProps {
  eventTypes?: EventType[];
  onDirectInquireWithDate: (
    date: string,
    eventType: string,
    venue: string,
    guests: string,
    startTime?: string,
    endTime?: string
  ) => void;
}

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  eventTypes = [],
  onDirectInquireWithDate
}) => {
  const initial = useMemo(() => getInitialDateParts(), []);

  const [selectedDate, setSelectedDate] = useState<string>(initial.dateStr);
  const [viewYear, setViewYear] = useState<number>(initial.year);
  const [viewMonth, setViewMonth] = useState<number>(initial.month);
  const [eventType, setEventType] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('12:00');
  const [endTime, setEndTime] = useState<string>('20:00');
  const [venue, setVenue] = useState<string>('');
  const [guestCount, setGuestCount] = useState<string>('100');
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>(() =>
    buildDefaultMonthDays(initial.year, initial.month)
  );
  const [isLoadingMonth, setIsLoadingMonth] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkedState, setCheckedState] = useState<{
    checked: boolean;
    available: boolean;
    slotsRemaining: number;
    message?: string;
  } | null>(null);

  const activeEventTypes = useMemo(
    () => eventTypes.filter((et) => et.isActive !== false),
    [eventTypes]
  );

  // Synchronize default eventType from database-backed activeEventTypes
  useEffect(() => {
    if (activeEventTypes.length > 0) {
      const exists =
        eventType === 'Other' ||
        activeEventTypes.some((et) => et.name === eventType);
      if (!exists) {
        setEventType(activeEventTypes[0].name);
      }
    } else if (!eventType) {
      setEventType('Birthday Celebration');
    }
  }, [activeEventTypes, eventType]);

  const checkedStateRef = useRef(checkedState);
  useEffect(() => {
    checkedStateRef.current = checkedState;
  }, [checkedState]);

  // Load live monthly availability from database whenever viewYear or viewMonth changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingMonth(true);
    setAvailabilityDays(buildDefaultMonthDays(viewYear, viewMonth));

    fetchAvailabilityRadar(viewYear, viewMonth)
      .then((res) => {
        if (!isMounted) return;
        if (res && Array.isArray(res.days) && res.days.length > 0) {
          setAvailabilityDays(res.days);
          // If the currently selected date is in this month and is occupied, move default selection to first open upcoming date
          setSelectedDate((currSelectedDate) => {
            const selectedDayRecord = res.days.find((d: AvailabilityDay) => d.date === currSelectedDate);
            if (
              selectedDayRecord &&
              (selectedDayRecord.status === 'booked' || selectedDayRecord.slotsRemaining <= 0)
            ) {
              const firstOpenDay = res.days.find(
                (d: AvailabilityDay) =>
                  d.date >= initial.dateStr && d.status !== 'booked' && d.slotsRemaining > 0
              );
              if (firstOpenDay && !checkedStateRef.current) {
                return firstOpenDay.date;
              }
            }
            return currSelectedDate;
          });
        }
      })
      .catch((err) => {
        console.warn('Availability radar fallback:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMonth(false);
      });

    return () => {
      isMounted = false;
    };
  }, [viewYear, viewMonth, initial.dateStr]);

  // Calculate weekday offset (0 = Sun ... 6 = Sat) for the 1st of the viewed month
  const firstDayOffset = useMemo(() => {
    return new Date(viewYear, viewMonth - 1, 1).getDay();
  }, [viewYear, viewMonth]);

  const handleDateInputChange = (val: string) => {
    setSelectedDate(val);
    if (!val) {
      setCheckedState(null);
      return;
    }
    const parts = val.split('-').map((p) => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (parts[0] !== viewYear || parts[1] !== viewMonth) {
        setViewYear(parts[0]);
        setViewMonth(parts[1]);
      }
    }

    if (val < initial.dateStr) {
      setCheckedState({
        checked: true,
        available: false,
        slotsRemaining: 0,
        message: 'Past dates cannot be selected. Please choose an upcoming available date.',
      });
      return;
    }

    const dayInView = availabilityDays.find((d) => d.date === val);
    if (dayInView && (dayInView.status === 'booked' || dayInView.slotsRemaining <= 0)) {
      setCheckedState({
        checked: true,
        available: false,
        slotsRemaining: 0,
        message:
          'Only one event booking is accommodated per day. This date already has an active booking and is unavailable.',
      });
    } else {
      setCheckedState(null);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToCurrentMonth = () => {
    const current = getInitialDateParts();
    setViewYear(current.year);
    setViewMonth(current.month);
    setSelectedDate(current.dateStr);
  };

  const timeValidation = useMemo(
    () => validateEventTimeRange(startTime, endTime, { required: true }),
    [startTime, endTime]
  );

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    if (!timeValidation.valid) {
      setCheckedState({
        checked: true,
        available: false,
        slotsRemaining: 0,
        message: timeValidation.message || 'Please select a valid event start time and end time.',
      });
      return;
    }

    if (selectedDate < initial.dateStr) {
      setCheckedState({
        checked: true,
        available: false,
        slotsRemaining: 0,
        message: 'Past dates cannot be selected. Please choose an upcoming available date.',
      });
      return;
    }

    setIsChecking(true);

    try {
      const clashResult = await checkClashApi({
        eventDate: selectedDate,
        startTime,
        endTime,
        venue: venue.trim(),
      });

      const isDateOpen = Boolean(clashResult.isAvailable) && (clashResult.remainingSlots ?? 0) > 0;

      setCheckedState({
        checked: true,
        available: isDateOpen,
        slotsRemaining: clashResult.remainingSlots ?? (isDateOpen ? 1 : 0),
        message:
          clashResult.conflicts && clashResult.conflicts.length > 0
            ? clashResult.conflicts[0].message
            : !isDateOpen
            ? 'Only one event booking is accommodated per day. Dates with existing bookings are unavailable.'
            : undefined,
      });
    } catch (err) {
      const dayData = availabilityDays.find((d) => d.date === selectedDate);
      const isDateOpen = dayData ? dayData.status !== 'booked' && dayData.slotsRemaining > 0 : true;
      setCheckedState({
        checked: true,
        available: isDateOpen,
        slotsRemaining: dayData ? dayData.slotsRemaining : 1,
        message: !isDateOpen
          ? 'Only one event booking is accommodated per day. Dates with existing bookings are unavailable.'
          : undefined,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDayClick = (day: AvailabilityDay) => {
    const isPast = day.date < initial.dateStr;
    const isBooked = day.status === 'booked' || day.slotsRemaining <= 0;
    if (isPast || isBooked) {
      return;
    }
    setSelectedDate(day.date);
    setCheckedState({
      checked: true,
      available: true,
      slotsRemaining: day.slotsRemaining,
    });
  };

  const viewedMonthLabel = `${MONTH_NAMES[viewMonth - 1] || ''} ${viewYear}`;
  const isCurrentMonth = viewYear === initial.year && viewMonth === initial.month;

  return (
    <section id="availability" className="scroll-mt-24 py-16 sm:py-24 lg:py-28 bg-white relative border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <Badge
            variant="secondary"
            className="bg-blue-50 text-[#1E3A8A] border border-blue-200/80 px-3 py-0.5 text-xs font-bold uppercase tracking-wider"
          >
            Schedule & Crew Verification
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1E3A8A]">
            Check Event Availability
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-normal leading-relaxed">
            Verify live production crew and staging slots before submitting your customized event inquiry.
          </p>
        </div>

        {/* 2-Column Grid: Left (Form) & Right (Interactive Calendar Matrix) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Form (5 Cols) */}
          <Card className="lg:col-span-5 rounded-xl p-5 sm:p-7 bg-white border border-slate-200/90 shadow-xs">
            <CardContent className="p-0">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
                Live Date & Crew Radar
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-5">
                Enter your target date and event details for immediate slot verification.
              </p>

              <form onSubmit={handleCheck} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="availability-date-input" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Target Event Date *
                  </Label>
                  <Input
                    id="availability-date-input"
                    type="date"
                    required
                    min={initial.dateStr}
                    value={selectedDate}
                    onChange={(e) => handleDateInputChange(e.target.value)}
                    className="h-10 bg-white border-slate-200 text-slate-900 font-medium"
                  />
                </div>

                {/* Event Time Range Selection */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span>Event Time Range *</span>
                    </Label>
                    {timeValidation.valid && timeValidation.durationLabel && (
                      <span className="text-[11px] font-bold text-[#1E3A8A] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        Duration: {timeValidation.durationLabel}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">Start Time</span>
                      <select
                        id="availability-start-time"
                        aria-label="Event Start Time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                      >
                        {EVENT_TIME_OPTIONS.slice(0, -1).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">End Time</span>
                      <select
                        id="availability-end-time"
                        aria-label="Event End Time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                      >
                        {EVENT_TIME_OPTIONS.slice(1).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {!timeValidation.valid && (
                    <p className="text-[11px] font-semibold text-rose-600">
                      {timeValidation.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="availability-event-type" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Event Type
                  </Label>
                  <select
                    id="availability-event-type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    {activeEventTypes.length > 0 ? (
                      activeEventTypes.map((et) => (
                        <option key={et.id} value={et.name}>
                          {et.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Birthday Celebration">Birthday Celebration</option>
                        <option value="Grand Wedding">Grand Wedding & Reception</option>
                        <option value="18th Debut">18th Debut Milestone</option>
                        <option value="Corporate Gala">Corporate Gala / Launch</option>
                        <option value="Anniversary Party">Anniversary & Reunion</option>
                      </>
                    )}
                    <option value="Other">Other (Custom Event Type)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="availability-venue-input" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Preferred Venue / City (Optional)
                  </Label>
                  <div className="relative">
                    <Input
                      id="availability-venue-input"
                      type="text"
                      placeholder="e.g. Sorsogon Convention Center or Ballroom"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="h-10 pl-9 bg-white border-slate-200 text-slate-900 font-medium"
                    />
                    <MapPin className="w-4 h-4 text-orange-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="availability-guests-input" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Estimated Guest Count
                  </Label>
                  <div className="relative">
                    <Input
                      id="availability-guests-input"
                      type="number"
                      min="10"
                      max="2000"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      className="h-10 pl-9 bg-white border-slate-200 text-slate-900 font-medium"
                    />
                    <Users className="w-4 h-4 text-orange-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    type="submit"
                    id="availability-check-btn"
                    disabled={isChecking}
                    variant="default"
                    size="lg"
                    className="w-full font-bold shadow-sm bg-[#1E3A8A] hover:bg-blue-900 text-white min-h-10"
                  >
                    {isChecking ? 'Checking Schedule...' : 'Verify Date Availability'}
                  </Button>
                </div>
              </form>

              {/* Check Result Card */}
              {checkedState && (
                <div
                  className={`mt-5 p-4 rounded-md border animate-in fade-in duration-300 ${
                    checkedState.available
                      ? 'bg-blue-50/80 border-blue-200'
                      : 'bg-rose-50/70 border-rose-200'
                  }`}
                >
                  {checkedState.available ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Date Slot Available!</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        <strong className="text-[#1E3A8A]">{selectedDate}</strong>
                        {timeValidation.valid && (
                          <>
                            {' '}
                            (<strong className="text-[#1E3A8A]">{formatEventTimeRange(startTime, endTime)}</strong> •{' '}
                            <span>{calculateEventDurationLabel(startTime, endTime)}</span>)
                          </>
                        )}{' '}
                        is open for booking. JAD Events dedicates our full production and coordination crew exclusively to{' '}
                        <strong className="text-[#1E3A8A]">1 event per day</strong>.
                      </p>
                      {checkedState.message && (
                        <p className="text-[11px] text-amber-700 font-medium">
                          Note: {checkedState.message}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="brand"
                        size="sm"
                        disabled={!timeValidation.valid}
                        onClick={() =>
                          onDirectInquireWithDate(
                            selectedDate,
                            eventType,
                            venue.trim(),
                            guestCount,
                            startTime,
                            endTime
                          )
                        }
                        className="mt-2 w-full font-bold bg-orange-600 hover:bg-orange-700 text-white min-h-9"
                      >
                        <span>Proceed to Inquiry with This Date &amp; Time</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>Date Slot Unavailable</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        {checkedState.message ||
                          `Only one event booking is accommodated per day. ${selectedDate} already has an existing booking and is unavailable. Please select an open date on the calendar.`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Interactive Calendar Component (7 Cols) */}
          <Card className="lg:col-span-7 rounded-xl p-4 sm:p-7 bg-white border border-slate-200/90 shadow-xs">
            <CardContent className="p-0">
              {/* Calendar Header & Month Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#1E3A8A] shrink-0" />
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {viewedMonthLabel} Availability Matrix
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {isLoadingMonth ? 'Syncing live schedule...' : 'Live booking capacity per day'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {!isCurrentMonth && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleJumpToCurrentMonth}
                      className="text-xs font-semibold text-[#1E3A8A] hover:bg-blue-50 h-8 px-2.5"
                    >
                      Today
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handlePrevMonth}
                    className="h-8 w-8 rounded-md border-slate-200 text-slate-700 hover:text-[#1E3A8A]"
                    aria-label="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-[#1E3A8A] border-blue-200 font-semibold text-xs px-2.5 py-1 min-w-[115px] justify-center"
                  >
                    {viewedMonthLabel}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-8 w-8 rounded-md border-slate-200 text-slate-700 hover:text-[#1E3A8A]"
                    aria-label="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] sm:text-xs font-bold text-slate-500 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Grid of Days with Weekday Alignment Offset */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {Array.from({ length: firstDayOffset }).map((_, idx) => (
                  <div
                    key={`empty-offset-${idx}`}
                    aria-hidden="true"
                    className="min-h-[48px] sm:min-h-[62px] rounded-md bg-slate-50/40 border border-transparent"
                  />
                ))}

                {availabilityDays.map((day) => {
                  const isPast = day.date < initial.dateStr;
                  const isBooked = day.status === 'booked' || day.slotsRemaining <= 0;
                  const isDisabled = isPast || isBooked;
                  const isSelected = !isDisabled && selectedDate === day.date;

                  let statusClasses = '';
                  if (isBooked) {
                    statusClasses =
                      'bg-rose-50/60 text-slate-400 border-rose-200/80 cursor-not-allowed';
                  } else if (isPast) {
                    statusClasses =
                      'bg-slate-50/70 text-slate-400 border-slate-200/70 cursor-not-allowed opacity-65';
                  } else {
                    statusClasses = isSelected
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md font-bold cursor-pointer'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:shadow-xs cursor-pointer';
                  }

                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={isDisabled}
                      aria-disabled={isDisabled}
                      onClick={() => handleDayClick(day)}
                      aria-label={`${day.date}: ${
                        isBooked
                          ? 'Booked — Unavailable'
                          : isPast
                          ? 'Past Date — Unavailable'
                          : 'Available'
                      }`}
                      aria-pressed={isSelected}
                      className={`min-h-[48px] sm:min-h-[62px] p-1 sm:p-1.5 rounded-lg border flex flex-col items-center justify-between text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${statusClasses}`}
                    >
                      <span className="font-bold text-[11px] sm:text-xs">{day.dayNumber}</span>

                      {isBooked ? (
                        <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold leading-none">
                          Booked
                        </span>
                      ) : isPast ? (
                        <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-medium leading-none">
                          Past
                        </span>
                      ) : (
                        <span
                          className={`text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded font-semibold leading-none ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          Open
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Policy Note & Legend */}
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                <p className="text-xs text-slate-600 font-medium">
                  Only one event booking is accommodated per day. Dates with existing bookings are unavailable.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="font-medium text-slate-700">Available (1 Booking/Day)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span className="font-medium text-slate-700">Booked (Unavailable)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      <span className="font-medium text-slate-500">Past Date</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium">
                    Click any open date to select
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
