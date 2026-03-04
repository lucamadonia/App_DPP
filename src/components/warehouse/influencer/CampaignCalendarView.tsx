import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle } from 'lucide-react';
import type { WhCampaign } from '@/types/warehouse';

interface CampaignCalendarViewProps {
  campaigns: WhCampaign[];
  className?: string;
}

const STATUS_BAR_COLORS: Record<string, string> = {
  draft: 'bg-gray-400',
  planning: 'bg-indigo-500',
  outreach: 'bg-amber-500',
  active: 'bg-green-500',
  review: 'bg-purple-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-500',
};

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CampaignCalendarView({ campaigns, className }: CampaignCalendarViewProps) {
  const { t, i18n } = useTranslation('warehouse');
  const navigate = useNavigate();
  const isDE = i18n.language.startsWith('de');

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const dayNames = useMemo(() => {
    const days: string[] = [];
    // Start with Monday for DE, Sunday for EN
    const startDay = isDE ? 1 : 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(2024, 0, startDay + i); // Jan 2024 starts on Monday
      days.push(d.toLocaleDateString(isDE ? 'de-DE' : 'en-US', { weekday: 'short' }));
    }
    return days;
  }, [isDE]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    let startDow = firstOfMonth.getDay(); // 0=Sun
    if (isDE) {
      startDow = startDow === 0 ? 6 : startDow - 1; // shift to Mon=0
    }

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];

    // Leading blanks
    for (let i = 0; i < startDow; i++) cells.push(null);
    // Days
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    // Trailing blanks to fill last row
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [viewYear, viewMonth, isDE]);

  // Map campaigns to date ranges
  const campaignsByDay = useMemo(() => {
    const map = new Map<string, { campaign: WhCampaign; isStart: boolean; isEnd: boolean }[]>();

    for (const c of campaigns) {
      if (!c.startDate && !c.endDate) continue;
      const start = c.startDate ? new Date(c.startDate) : null;
      const end = c.endDate ? new Date(c.endDate) : start;
      if (!start) continue;

      const effectiveEnd = end || start;
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const endDate = new Date(effectiveEnd);
      endDate.setHours(0, 0, 0, 0);

      while (cursor <= endDate) {
        if (cursor.getFullYear() === viewYear && cursor.getMonth() === viewMonth) {
          const key = cursor.toISOString().slice(0, 10);
          const entries = map.get(key) || [];
          entries.push({
            campaign: c,
            isStart: isSameDay(cursor, start),
            isEnd: isSameDay(cursor, endDate),
          });
          map.set(key, entries);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return map;
  }, [campaigns, viewYear, viewMonth]);

  // Deadline dates
  const deadlineDates = useMemo(() => {
    const set = new Set<string>();
    for (const c of campaigns) {
      if (c.endDate) {
        const d = new Date(c.endDate);
        if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
          set.add(d.toISOString().slice(0, 10));
        }
      }
    }
    return set;
  }, [campaigns, viewYear, viewMonth]);

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(isDE ? 'de-DE' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card className={className}>
      <CardHeader className="px-3 sm:px-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('Campaign Calendar')}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={prevMonth}>
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-6 sm:h-7 px-1.5 sm:px-2 hidden sm:inline-flex" onClick={goToToday}>
              {t('Today')}
            </Button>
            <span className="text-xs sm:text-sm font-medium min-w-[100px] sm:min-w-[120px] text-center">{monthLabel}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={nextMonth}>
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {/* Day header */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((name) => (
            <div key={name} className="text-[10px] sm:text-xs text-muted-foreground text-center py-0.5 sm:py-1">
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`blank-${idx}`} className="min-h-[48px] sm:min-h-[80px] border border-transparent p-0.5 sm:p-1" />;
            }

            const key = day.toISOString().slice(0, 10);
            const isToday = isSameDay(day, today);
            const entries = campaignsByDay.get(key) || [];
            const hasDeadline = deadlineDates.has(key);

            return (
              <div
                key={key}
                className={`min-h-[48px] sm:min-h-[80px] border p-0.5 sm:p-1 text-[9px] sm:text-xs ${
                  isToday ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] sm:text-xs ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                    {day.getDate()}
                  </span>
                  {hasDeadline && <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500" />}
                </div>
                <div className="mt-0.5 space-y-0.5 overflow-hidden">
                  {entries.slice(0, 2).map(({ campaign, isStart, isEnd }) => {
                    const barColor = STATUS_BAR_COLORS[campaign.status] || 'bg-gray-400';
                    return (
                      <div
                        key={campaign.id}
                        className={`text-[8px] sm:text-[10px] px-0.5 sm:px-1 truncate cursor-pointer text-white ${barColor} ${
                          isStart && isEnd ? 'rounded' : isStart ? 'rounded-l' : isEnd ? 'rounded-r' : ''
                        }`}
                        title={campaign.name}
                        onClick={() => navigate(`/warehouse/campaigns/${campaign.id}`)}
                      >
                        {isStart ? campaign.name : '\u00A0'}
                      </div>
                    );
                  })}
                  {entries.length > 2 && (
                    <div className="text-[8px] sm:text-[10px] text-muted-foreground px-0.5 sm:px-1">
                      +{entries.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
