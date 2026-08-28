import { Injectable } from '@angular/core';

import { ApiService } from './api.service';
import {
    CreateTaskRequest,
    Task,
    TaskComment,
    TaskHistory,
    TaskListResponse,
    TaskQuery,
    UpdateTaskRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class TaskService {
    constructor(private readonly api: ApiService) { }

    async listByTeam(teamId: string, query: TaskQuery = {}): Promise<TaskListResponse> {
        const params = new URLSearchParams();
        params.set('team_id', teamId);

        if (query.status) {
            params.set('status', query.status);
        }
        if (query.assigneeId) {
            params.set('assignee_id', query.assigneeId);
        }
        if (query.limit) {
            params.set('limit', String(query.limit));
        }
        if (query.offset) {
            params.set('offset', String(query.offset));
        }

        const res = await this.api.get<TaskListResponse>(`/api/v1/tasks?${params.toString()}`);
        return res ?? { tasks: [], total: 0, limit: 0, offset: 0, has_more: false };
    }

    create(req: CreateTaskRequest): Promise<Task> {
        return this.api.post<Task>('/api/v1/tasks', req);
    }

    update(taskId: string, req: UpdateTaskRequest): Promise<Task> {
        return this.api.put<Task>(`/api/v1/tasks/${taskId}`, req);
    }

    listComments(taskId: string): Promise<TaskComment[]> {
        return this.api.get<TaskComment[]>(`/api/v1/tasks/${taskId}/comments`).then(c => c ?? []);
    }

    addComment(taskId: string, content: string): Promise<TaskComment> {
        return this.api.post<TaskComment>(`/api/v1/tasks/${taskId}/comments`, { content });
    }

    getHistory(taskId: string): Promise<TaskHistory[]> {
        return this.api.get<TaskHistory[]>(`/api/v1/tasks/${taskId}/history`).then(h => h ?? []);
    }
}