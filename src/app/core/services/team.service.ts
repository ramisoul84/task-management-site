import { Injectable } from '@angular/core';

import { ApiService } from './api.service';
import { ChangeRoleRequest, InviteRequest, Team, TeamMemberView } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamService {
    constructor(private readonly api: ApiService) { }

    list(): Promise<Team[]> {
        return this.api.get<Team[]>('/api/v1/teams').then(t => t ?? []);
    }

    create(name: string): Promise<Team> {
        return this.api.post<Team>('/api/v1/teams', { name });
    }

    listMembers(teamId: string): Promise<TeamMemberView[]> {
        return this.api.get<TeamMemberView[]>(`/api/v1/teams/${teamId}/members`).then(m => m ?? []);
    }

    invite(teamId: string, userId: string): Promise<void> {
        const body: InviteRequest = { user_id: userId };
        return this.api.post<void>(`/api/v1/teams/${teamId}/invite`, body);
    }

    changeRole(teamId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
        const body: ChangeRoleRequest = { role };
        return this.api.patch<void>(`/api/v1/teams/${teamId}/members/${userId}/role`, body);
    }

    removeMember(teamId: string, userId: string): Promise<void> {
        return this.api.delete<void>(`/api/v1/teams/${teamId}/members/${userId}`);
    }
}