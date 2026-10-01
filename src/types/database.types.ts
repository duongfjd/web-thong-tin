export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      timesheet_sessions: {
        Row: {
          id: string
          user_id: string
          check_in_at: string
          check_out_at: string | null
          check_in_ip: string | null
          check_out_ip: string | null
          check_in_geo: Json | null
          check_out_geo: Json | null
          source: 'web' | 'telegram' | 'manual'
          edit_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          check_in_at?: string
          check_out_at?: string | null
          check_in_ip?: string | null
          check_out_ip?: string | null
          check_in_geo?: Json | null
          check_out_geo?: Json | null
          source?: 'web' | 'telegram' | 'manual'
          edit_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          check_in_at?: string
          check_out_at?: string | null
          check_in_ip?: string | null
          check_out_ip?: string | null
          check_in_geo?: Json | null
          check_out_geo?: Json | null
          source?: 'web' | 'telegram' | 'manual'
          edit_reason?: string | null
          created_at?: string
        }
      }
      worklogs: {
        Row: {
          id: string
          user_id: string
          date: string
          content_md: string
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          content_md?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          content_md?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          user_id: string
          timezone: string
          ot_rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          timezone?: string
          ot_rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timezone?: string
          ot_rules?: Json
          created_at?: string
          updated_at?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          user_id: string
          amount_vnd: number
          category_id: string | null
          note: string
          spent_on: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          amount_vnd: number
          category_id?: string | null
          note?: string
          spent_on?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount_vnd?: number
          category_id?: string | null
          note?: string
          spent_on?: string
          created_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          month: string
          limit_vnd: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          category_id?: string | null
          month: string
          limit_vnd: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          month?: string
          limit_vnd?: number
          created_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          url: string
          title: string | null
          description: string | null
          image_url: string | null
          favicon_url: string | null
          category: string | null
          tags: string[]
          status: 'unread' | 'read' | 'archived'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          url: string
          title?: string | null
          description?: string | null
          image_url?: string | null
          favicon_url?: string | null
          category?: string | null
          tags?: string[]
          status?: 'unread' | 'read' | 'archived'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          title?: string | null
          description?: string | null
          image_url?: string | null
          favicon_url?: string | null
          category?: string | null
          tags?: string[]
          status?: 'unread' | 'read' | 'archived'
          created_at?: string
        }
      }
    }
  }
}
