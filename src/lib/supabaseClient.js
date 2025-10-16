import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vpcagdtgmwkofvjexkps.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwY2FnZHRnbXdrb2Z2amV4a3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMTUwMTcsImV4cCI6MjA3NTY5MTAxN30.nu_xkb5cOHg9dVrPj-XdMlV77MRa2YnlZpqLgWT2cDU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
