// src/services/supabase.js
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

// 環境変数
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tfpvuxxoylxyhwlpepvm.supabase.co'
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcHZ1eHhveWx4eWh3bHBlcHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODczNzgsImV4cCI6MjA1OTk2MzM3OH0.eA18LoCaKK163khNdlfdECPu1H2HTFejUxPXXEbMu-w'

// Supabaseクライアント作成
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// 認証関連のヘルパー関数
export const authService = {
  signUp: async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: () => {
    return supabase.auth.getUser()
  },
}