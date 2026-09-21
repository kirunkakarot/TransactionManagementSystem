import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  Users, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchAvailabilityRadar, checkClashApi } from '@/services/api';

const DEFAULT_AVAILABILITY_DAYS = Array.from({ length: 31 }, (_, i) => {
  const dayNum = i + 1;
  const dateStr = `2026-08-${dayNum.toString().padStart(2, '0')}`;
  return {
    date: dateStr,
    dayNumber: dayNum,
    status: 'available' as 'available' | 'limited' | 'booked',
    slotsRemaining: 3,
  };
});

interface AvailabilitySectionProps {
  onDirectInquireWithDate: (date: string, eventType: string, venue: string, guests: string) => void;
}

export const AvailabilitySection: React.FC<AvailabilitySectionProps> = ({
  onDirectInquireWithDate
}) => {
  const [selectedDate, setSelectedDate] = useState('2026-08-28');
  const [eventType, setEventType] = useState('Birthday Celebration');
  const [venue, setVenue] = useState('Grand Palazzo Royale, Ballroom A');
  const [guestCount, setGuestCount] = useState('150');
  const [availabilityDays, setAvailabilityDays] = useState(DEFAULT_AVAILABILITY_DAYS);
  const [isChecking, setIsChecking] = useState(false);
  const [checkedState, setCheckedState] = useState<{
    checked: boolean;
    available: boolean;
    slotsRemaining: number;
    message?: string;
  } | null>(null);

  useEffect(() => {
    // Load live availability from database
    const dateObj = new Date(selectedDate);
    const year = dateObj.getFullYear() || 2026;
    const month = dateObj.getMonth() + 1 || 8;

    fetchAvailabilityRadar(year, month)
      .then((res) => {
        if (res.days && res.days.length > 0) {
          setAvailabilityDays(res.days);
        }
      })
      .catch((err) => {
        console.warn('Availability radar fallback:', err);
      });
  }, [selectedDate]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);

    try {
      const clashResult = await checkClashApi({
        eventDate: selectedDate,
        venue,
      });

      setCheckedState({
        checked: true,
        available: clashResult.isAvailable,
        slotsRemaining: clashResult.remainingSlots,
        message: clashResult.conflicts && clashResult.conflicts.length > 0 ? clashResult.conflicts[0].message : undefined,
      });
    } catch (err) {
      const dayData = availabilityDays.find(d => d.date === selectedDate);
      setCheckedState({
        checked: true,
        available: dayData ? dayData.status !== 'booked' : true,
        slotsRemaining: dayData ? dayData.slotsRemaining : 2,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const dayData = availabilityDays.find(d => d.date === dateStr);
    if (dayData) {
      setCheckedState({
        checked: true,
        available: dayData.status !== 'booked',
        slotsRemaining: dayData.slotsRemaining
      });
    }
  };

  return (
    <section id="availability" className="py-20 sm:py-28 bg-white relative border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14 sm:mb-18">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1E3A8A]">
            Check Event Availability
          </h2>

          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            Check production crew and staging slots across Metro Manila & Southern Luzon before submitting your reservation.
          </p>
        </div>

        {/* 2-Column Grid: Left (Form) & Right (Interactive Calendar Matrix) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form (5 Cols) - White Card */}
          <Card className="lg:col-span-5 rounded-md p-6 sm:p-8 bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                Live Date & Crew Radar
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-6">
                Enter target details for immediate calendar slot verification.
              </p>

              <form onSubmit={handleCheck} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target Event Date</Label>
                  <Input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Event Category</Label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  >
                    <option value="Birthday Celebration">Birthday Celebration</option>
                    <option value="Grand Wedding">Grand Wedding & Reception</option>
                    <option value="18th Debut">18th Debut Milestone</option>
                    <option value="Corporate Gala">Corporate Gala / Launch</option>
                    <option value="Anniversary Party">Anniversary / Reunion</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Venue Location / City</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Grand Palazzo Royale, Ballroom A"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="pl-9 bg-white border-slate-200 text-slate-900 font-medium"
                    />
                    <MapPin className="w-4 h-4 text-orange-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estimated Guest Count</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="20"
                      max="1000"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                      className="pl-9 bg-white border-slate-200 text-slate-900 font-medium"
                    />
                    <Users className="w-4 h-4 text-orange-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    id="availability-check-btn"
                    variant="default"
                    size="lg"
                    className="w-full font-bold shadow-sm bg-[#1E3A8A] hover:bg-blue-900 text-white"
                  >
                    Verify Date Availability
                  </Button>
                </div>
              </form>

              {/* Check Result Card */}
              {checkedState && (
                <div className="mt-5 p-4 rounded-md bg-blue-50/80 border border-blue-200 animate-in fade-in duration-300">
                  {checkedState.available ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>Date Slot Available!</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        We have <strong className="text-[#1E3A8A]">{checkedState.slotsRemaining} Lead Producer & Crew teams</strong> available on {selectedDate}.
                      </p>
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={() => onDirectInquireWithDate(selectedDate, eventType, venue, guestCount)}
                        className="mt-2 w-full font-bold bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <span>Lock This Date Slot</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>Date Fully Booked</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        All lead coordinator units are committed on {selectedDate}. Please pick another date.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Interactive Calendar Component (7 Cols) - Clean White Card */}
          <Card className="lg:col-span-7 rounded-md p-6 sm:p-8 bg-white border border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#1E3A8A]" />
                  <h4 className="text-base sm:text-lg font-bold text-slate-900">
                    August 2026 Production Dispatch Matrix
                  </h4>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-[#1E3A8A] border-blue-200 font-semibold text-xs">
                  Peak Season
                </Badge>
              </div>

              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              {/* Calendar Grid of Days */}
              <div className="grid grid-cols-7 gap-2">
                {availabilityDays.map((day) => {
                  const isSelected = selectedDate === day.date;
                  let statusClasses = '';
                  if (day.status === 'booked') {
                    statusClasses = 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed';
                  } else if (day.status === 'limited') {
                    statusClasses = isSelected
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md font-bold'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-xs';
                  } else {
                    statusClasses = isSelected
                      ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-md font-bold'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-xs';
                  }

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => handleDayClick(day.date)}
                      className={`min-h-[58px] sm:min-h-[64px] p-1.5 rounded-md border flex flex-col items-center justify-between text-xs transition-all cursor-pointer ${statusClasses}`}
                    >
                      <span className="font-bold text-xs">{day.dayNumber}</span>

                      {day.status === 'booked' ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 font-bold">
                          Full
                        </span>
                      ) : day.status === 'limited' ? (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                          isSelected ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {day.slotsRemaining} slot
                        </span>
                      ) : (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          Open
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="font-medium text-slate-700">Available (2+ Slots)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                    <span className="font-medium text-slate-700">Limited (1 Slot)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                    <span className="font-medium text-slate-500">Booked</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  Click any open date to select
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
