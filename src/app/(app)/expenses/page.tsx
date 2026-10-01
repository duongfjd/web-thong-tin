"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addQuickExpense } from '@/features/expenses/actions'
import { useActionState, useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const MOCK_DATA = [
  { name: 'Ăn uống', value: 4000000 },
  { name: 'Xăng xe', value: 500000 },
  { name: 'Giải trí', value: 1000000 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function ExpensesPage() {
  const formRef = useRef<HTMLFormElement>(null)

  // Quick form action wrapper to reset the form upon submission
  async function formAction(formData: FormData) {
    try {
      await addQuickExpense(formData)
      formRef.current?.reset()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Error")
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Chi tiêu</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nhập nhanh</CardTitle>
            <CardDescription>Nhập theo cú pháp: "cafe 35k", "xăng 1tr"</CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} action={formAction} className="flex gap-2">
              <Input 
                name="expenseInput" 
                placeholder="VD: ăn trưa 50k" 
                className="text-lg py-6"
                autoComplete="off"
                required
              />
              <Button type="submit" className="py-6 px-8 text-lg">Ghi</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tổng quan tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5.500.000 đ</div>
            <p className="text-sm text-muted-foreground mt-1">
              Đạt 80% ngân sách (Ngân sách: 7.000.000 đ)
            </p>
            {/* Warning example */}
            <div className="mt-2 text-sm text-amber-500 bg-amber-500/10 p-2 rounded">
              ⚠️ Sắp vượt ngân sách!
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ chi tiêu theo danh mục</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {MOCK_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString('vi-VN') : value) + ' đ'} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
