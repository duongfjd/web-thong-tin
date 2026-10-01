import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { calculateWorkSummary, OTRules } from '@/features/timesheet/logic'
import { parseISO, format, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || format(new Date(), 'yyyy-MM')
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Parse month bounds
  const startDate = startOfMonth(parseISO(`${month}-01T00:00:00Z`))
  const endDate = endOfMonth(startDate)

  // Fetch sessions
  const { data: sessions } = await supabase
    .from('timesheet_sessions')
    .select('*')
    .eq('user_id', user.id)
    .gte('check_in_at', startDate.toISOString())
    .lte('check_in_at', endDate.toISOString())
    .order('check_in_at', { ascending: true })

  // Fetch user settings for OT rules
  const { data: settings } = await supabase
    .from('settings')
    .select('ot_rules')
    .eq('user_id', user.id)
    .maybeSingle()

  const rules: OTRules = settings?.ot_rules || {
    standard_hours: 8,
    weekend_multiplier: 2,
    holiday_multiplier: 3,
  }

  // Generate Excel
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Timesheet')

  sheet.columns = [
    { header: 'Ngày', key: 'date', width: 15 },
    { header: 'Check In', key: 'check_in', width: 15 },
    { header: 'Check Out', key: 'check_out', width: 15 },
    { header: 'Tổng phút', key: 'total', width: 15 },
    { header: 'Phút chuẩn', key: 'standard', width: 15 },
    { header: 'Phút OT', key: 'ot', width: 15 },
  ]

  // Group by day to calculate work summary
  const sessionsByDay: Record<string, Array<{ check_in_at: string; check_out_at: string | null }>> = {}
  if (sessions) {
    sessions.forEach(s => {
      const dateStr = format(parseISO(s.check_in_at), 'yyyy-MM-dd')
      if (!sessionsByDay[dateStr]) sessionsByDay[dateStr] = []
      sessionsByDay[dateStr].push(s)

      sheet.addRow({
        date: dateStr,
        check_in: format(parseISO(s.check_in_at), 'HH:mm'),
        check_out: s.check_out_at ? format(parseISO(s.check_out_at), 'HH:mm') : 'N/A',
        total: '',
        standard: '',
        ot: ''
      })
    })
  }

  // Add summary rows
  Object.keys(sessionsByDay).forEach(dateStr => {
    const summary = calculateWorkSummary(sessionsByDay[dateStr], rules, dateStr)
    sheet.addRow({
      date: `Tổng ${dateStr}`,
      check_in: '',
      check_out: '',
      total: summary.totalMinutes,
      standard: summary.standardMinutes,
      ot: summary.otMinutes,
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="timesheet-${month}.xlsx"`
    }
  })
}
