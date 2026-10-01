import { differenceInMinutes, parseISO, isWeekend } from 'date-fns';

export interface TimesheetSession {
  check_in_at: string;
  check_out_at: string | null;
}

export interface OTRules {
  standard_hours: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
}

export interface WorkSummary {
  totalMinutes: number;
  standardMinutes: number;
  otMinutes: number;
}

/**
 * Calculates work summary for a single day given an array of sessions for that day.
 * Pure function.
 */
export function calculateWorkSummary(
  sessions: TimesheetSession[],
  rules: OTRules,
  dateString: string
): WorkSummary {
  let totalMinutes = 0;

  for (const session of sessions) {
    if (!session.check_out_at) continue;
    
    const start = parseISO(session.check_in_at);
    const end = parseISO(session.check_out_at);
    
    const diff = differenceInMinutes(end, start);
    if (diff > 0) {
      totalMinutes += diff;
    }
  }

  const isDayWeekend = isWeekend(parseISO(dateString));
  
  if (isDayWeekend) {
    // On weekends, all hours are OT. Wait, OT rule application depends on standard practice.
    // Let's assume on weekend, everything is OT, multiplied by multiplier? 
    // The requirement says "tính OT". We just need to separate standard and OT.
    // If weekend, all are OT.
    return {
      totalMinutes,
      standardMinutes: 0,
      otMinutes: totalMinutes,
    };
  }

  const standardMinutesLimit = rules.standard_hours * 60;
  
  if (totalMinutes <= standardMinutesLimit) {
    return {
      totalMinutes,
      standardMinutes: totalMinutes,
      otMinutes: 0,
    };
  }

  return {
    totalMinutes,
    standardMinutes: standardMinutesLimit,
    otMinutes: totalMinutes - standardMinutesLimit,
  };
}
