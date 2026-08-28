import { TaskStatus } from "./task.model";

export interface TopPerformer {
    user_id: string;
    user_name: string;
    closed_tasks: number;
}

export interface TeamStats {
    tasks_by_status: Record<string, number>;
    top_performers: TopPerformer[];
    avg_close_time_hours: number;
    total_comments: number;
    total_tasks: number;
}

export interface StatusStat {
    status: TaskStatus;
    count: number;
}