import { Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TaskService } from '../../core/services/task.service';
import {
  Role,
  Task,
  TaskComment,
  TaskHistory,
  TaskStatus,
  TeamMemberView,
  UpdateTaskRequest,
} from '../../core/models';

const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'cancelled'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

@Component({
  selector: 'app-task-detail',
  imports: [FormsModule],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.scss',
})
export class TaskDetail implements OnInit {
  readonly STATUS_OPTIONS = STATUS_OPTIONS;
  readonly STATUS_LABELS = STATUS_LABELS;

  readonly teamId = input.required<string>();
  readonly taskInput = input.required<Task>();
  readonly members = input<TeamMemberView[]>([]);
  readonly myRole = input<Role | null>(null);

  readonly closed = output<boolean>();

  readonly task = signal<Task | null>(null);
  readonly comments = signal<TaskComment[]>([]);
  readonly history = signal<TaskHistory[]>([]);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly commenting = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  readonly detailTab = signal<'details' | 'comments' | 'history'>('details');

  form: { title: string; description: string; status: TaskStatus; assignee_id: string | null } = {
    title: '',
    description: '',
    status: 'todo',
    assignee_id: null,
  };
  newComment = '';

  constructor(private readonly taskSvc: TaskService) { }

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    const inputTask = this.taskInput();

    try {
      const [comments, history] = await Promise.all([
        this.taskSvc.listComments(inputTask.id),
        this.taskSvc.getHistory(inputTask.id),
      ]);

      this.task.set(inputTask);
      this.comments.set(comments);
      this.history.set(history);
      this.form = {
        title: inputTask.title,
        description: inputTask.description || '',
        status: inputTask.status,
        assignee_id: inputTask.assignee_id || null,
      };
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    const task = this.task();
    if (!task || this.saving() || this.isClosed()) return;

    this.saving.set(true);
    this.error.set('');
    this.notice.set('');

    try {
      const req: UpdateTaskRequest = { version: task.version };
      const newTitle = this.form.title.trim();

      if (newTitle && newTitle !== task.title) {
        req.title = newTitle;
      }
      if ((this.form.description || '') !== (task.description || '')) {
        req.description = this.form.description;
      }
      if (this.form.status !== task.status) {
        req.status = this.form.status;
      }
      const newAssignee = this.form.assignee_id || undefined;
      if (newAssignee !== (task.assignee_id ?? undefined)) {
        req.assignee_id = newAssignee;
      }

      await this.taskSvc.update(task.id, req);
      this.notice.set('Task updated.');
      setTimeout(() => this.closed.emit(true), 500);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Update failed');
    } finally {
      this.saving.set(false);
    }
  }

  isDirty(): boolean {
    const task = this.task();
    if (!task) return false;

    const newTitle = this.form.title.trim();
    if (newTitle && newTitle !== task.title) return true;
    if ((this.form.description || '') !== (task.description || '')) return true;
    if (this.form.status !== task.status) return true;
    if ((this.form.assignee_id || undefined) !== (task.assignee_id ?? undefined)) return true;

    return false;
  }

  async addComment(): Promise<void> {
    const content = this.newComment.trim();
    const task = this.task();
    if (!content || !task || this.commenting()) return;

    this.commenting.set(true);
    this.error.set('');

    try {
      const comment = await this.taskSvc.addComment(task.id, content);
      this.comments.update(cur => [...cur, comment]);
      this.newComment = '';
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Comment failed');
    } finally {
      this.commenting.set(false);
    }
  }

  // ==================== HELPERS ====================

  memberNameById(userID: string | null | undefined): string {
    if (!userID) return 'Unassigned';
    const member = this.members().find(m => m.user_id === userID);
    return member?.name || member?.email || 'Unknown';
  }

  statusLabel(status: TaskStatus): string {
    return STATUS_LABELS[status] || status;
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString();
  }

  formatChanges(changes: Record<string, unknown>): string {
    if (!changes || typeof changes !== 'object') {
      return String(changes ?? '');
    }
    return Object.entries(changes)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
      .join('\n');
  }

  isClosed(): boolean {
    const status = this.task()?.status;
    return status === 'done' || status === 'cancelled';
  }

  canEdit(): boolean {
    if (this.isClosed()) return false;
    const role = this.myRole();
    const task = this.task();
    if (!task) return false;

    // Owner and admin can edit
    if (role === 'owner' || role === 'admin') return true;

    // Creator can edit (but we don't have creator info in task detail easily)
    return role === 'member';
  }

  close(): void {
    this.closed.emit(false);
  }
}