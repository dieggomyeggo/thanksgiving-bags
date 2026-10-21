// Local dev: the in-memory mock. Production and test builds swap this file for api-provider.prod.ts
// (angular.json fileReplacements) so the seed catalog, with item costs, is never bundled for shoppers.
import type { Provider } from '@angular/core';
import { ApiService } from './api.service';
import { MockApiService } from './mock-api.service';

export const API_PROVIDER: Provider = { provide: ApiService, useClass: MockApiService };
