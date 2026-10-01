import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { checkIn, checkOut } from '@/features/timesheet/actions'

export default async function TimesheetPage() {
  const supabase = await createClient()

  // Note: Local Supabase mock uses fake auth if you haven't logged in.
  // We'll proceed without breaking by assuming there might be a user or not.
  const { data: { user } } = await supabase.auth.getUser()

  // Get active session
  let activeSession = null
  let todaySessions = []

  if (user) {
    const { data: actSess } = await supabase
      .from('timesheet_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('check_out_at', null)
      .maybeSingle()
    
    activeSession = actSess

    const startOfDay = new Date()
    startOfDay.setHours(0,0,0,0)

    const { data: todaySess } = await supabase
      .from('timesheet_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('check_in_at', startOfDay.toISOString())
      .order('check_in_at', { ascending: true })
    
    todaySessions = todaySess || []
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Timesheet & Worklog</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Check-in / out panel */}
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái hôm nay</CardTitle>
            <CardDescription>
              {activeSession ? "Bạn đang trong phiên làm việc." : "Bạn chưa bắt đầu phiên làm việc."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            {!activeSession ? (
              <form action={async () => {
                "use server"
                await checkIn()
              }}>
                <Button size="lg" className="h-24 w-48 text-xl rounded-full shadow-lg">
                  CHECK IN
                </Button>
              </form>
            ) : (
              <form action={async () => {
                "use server"
                await checkOut()
              }}>
                <Button size="lg" variant="destructive" className="h-24 w-48 text-xl rounded-full shadow-lg">
                  CHECK OUT
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Today's sessions list */}
        <Card>
          <CardHeader>
            <CardTitle>Phiên làm việc</CardTitle>
          </CardHeader>
          <CardContent>
            {todaySessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa có phiên nào hôm nay.</p>
            ) : (
              <ul className="space-y-3">
                {todaySessions.map((s: { id: string; check_in_at: string; check_out_at: string | null; source?: string }) => (
                  <li key={s.id} className="text-sm flex justify-between border-b pb-2">
                    <span>
                      {new Date(s.check_in_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} 
                      {' - '}
                      {s.check_out_at ? new Date(s.check_out_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : 'Đang chạy...'}
                    </span>
                    <span className="text-muted-foreground">{s.source}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Markdown Worklog Editor */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Worklog (Nhật ký công việc)</CardTitle>
          <CardDescription>Ghi chú lại những việc đã làm hôm nay.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-md border min-h-[200px] text-muted-foreground flex items-center justify-center">
            <p>Trình soạn thảo Markdown sẽ được tích hợp tại đây.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
