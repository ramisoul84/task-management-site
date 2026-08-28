export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

export interface Task {
    id: string;
    team_id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    created_by: string;
    assignee_id?: string | null;
    created_at: string;
    updated_at: string;
    closed_at?: string | null;
    version: number;
}

export interface CreateTaskRequest {
    team_id: string;
    title: string;
    description?: string;
    assignee_id?: string;
}

export interface UpdateTaskRequest {
    title?: string;
    description?: string;
    status?: TaskStatus;
    assignee_id?: string;
    version: number;
}

export interface TaskListResponse {
    tasks: Task[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
}

export interface TaskHistory {
    id: number;
    task_id: string;
    changed_by: string;
    changes: Record<string, unknown>;
    created_at: string;
}

export interface TaskQuery {
    status?: TaskStatus;
    assigneeId?: string;
    limit?: number;
    offset?: number;
}