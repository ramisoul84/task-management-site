import { Injectable } from '@angular/core';

import { ApiService } from './api.service';
import { TeamStats } from '../models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    constructor(private readonly api: ApiService) { }

    getTeamStats(teamId: string): Promise<TeamStats> {
        return this.api.get<TeamStats>(`/api/v1/teams/${teamId}/stats`);
    }
}