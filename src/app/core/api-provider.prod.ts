import type { Provider } from '@angular/core';
import { ApiService } from './api.service';
import { SupabaseApiService } from './supabase-api.service';

export const API_PROVIDER: Provider = { provide: ApiService, useClass: SupabaseApiService };
