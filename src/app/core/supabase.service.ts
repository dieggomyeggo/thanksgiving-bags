import { Injectable } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/** Holds the single Supabase client (anon key only). Only ApiService implementations may inject this. */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(environment.supabaseUrl || 'http://localhost', environment.supabaseAnonKey || 'anon', {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}
