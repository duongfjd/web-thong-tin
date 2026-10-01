import { describe, it, expect } from 'vitest';
import { calculateWorkSummary, OTRules, TimesheetSession } from './logic';

describe('calculateWorkSummary', () => {
  const rules: OTRules = {
    standard_hours: 8,
    weekend_multiplier: 2,
    holiday_multiplier: 3,
  };

  it('calculates standard hours correctly for a weekday', () => {
    const sessions: TimesheetSession[] = [
      {
        check_in_at: '2023-10-02T08:00:00Z', // Monday
        check_out_at: '2023-10-02T12:00:00Z', // 4 hours
      },
      {
        check_in_at: '2023-10-02T13:00:00Z',
        check_out_at: '2023-10-02T16:00:00Z', // 3 hours
      }
    ];

    const result = calculateWorkSummary(sessions, rules, '2023-10-02');
    
    expect(result.totalMinutes).toBe(7 * 60);
    expect(result.standardMinutes).toBe(7 * 60);
    expect(result.otMinutes).toBe(0);
  });

  it('calculates OT correctly for a weekday exceeding standard hours', () => {
    const sessions: TimesheetSession[] = [
      {
        check_in_at: '2023-10-02T08:00:00Z', // Monday
        check_out_at: '2023-10-02T18:00:00Z', // 10 hours
      }
    ];

    const result = calculateWorkSummary(sessions, rules, '2023-10-02');
    
    expect(result.totalMinutes).toBe(10 * 60);
    expect(result.standardMinutes).toBe(8 * 60);
    expect(result.otMinutes).toBe(2 * 60);
  });

  it('treats all hours as OT on weekends', () => {
    const sessions: TimesheetSession[] = [
      {
        check_in_at: '2023-10-07T08:00:00Z', // Saturday
        check_out_at: '2023-10-07T12:00:00Z', // 4 hours
      }
    ];

    const result = calculateWorkSummary(sessions, rules, '2023-10-07');
    
    expect(result.totalMinutes).toBe(4 * 60);
    expect(result.standardMinutes).toBe(0);
    expect(result.otMinutes).toBe(4 * 60);
  });

  it('ignores sessions without check_out_at', () => {
    const sessions: TimesheetSession[] = [
      {
        check_in_at: '2023-10-02T08:00:00Z',
        check_out_at: null,
      }
    ];

    const result = calculateWorkSummary(sessions, rules, '2023-10-02');
    
    expect(result.totalMinutes).toBe(0);
  });
});
