"use server"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseQuickExpense } from './logic'

export async function addQuickExpense(formData: FormData) {
  const input = formData.get('expenseInput') as string
  if (!input) throw new Error("Input required")

  const parsed = parseQuickExpense(input)
  if (!parsed) throw new Error("Invalid format. Example: 'cafe 35k'")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      amount_vnd: parsed.amount,
      note: parsed.note,
      spent_on: new Date().toISOString().split('T')[0]
    })

  if (error) {
    console.error(error)
    throw new Error("Failed to add expense")
  }

  revalidatePath('/expenses')
  return { success: true }
}
