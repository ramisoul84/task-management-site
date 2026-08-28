import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AnalyticsService } from '../../../core/services/analytics.service';
import { TaskService } from '../../../core/services/task.service';
import { TeamService } from '../../../core/services/team.service';
import { AuthService } from '../../../core/services/auth.service';
import { TaskDetail } from '../../task-detail/task-detail';
import {
  CreateTaskRequest,
  Role,
  StatusStat,
  Task,
  TaskListResponse,
  TaskQuery,
  TaskStatus,
  Team,
  TeamMemberView,
  TeamStats,
  UpdateTaskRequest,
} from '../../../core/models';

type View = 'board' | 'list' | 'members' | 'stats';

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'cancelled'];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

@Component({
  selector: 'app-team-detail',
  imports: [FormsModule, RouterLink, TaskDetail],
  templateUrl: './team-detail.html',
  styleUrl: './team-detail.scss',
})
export class TeamDetail implements OnInit {
  readonly STATUS_ORDER = STATUS_ORDER;
  readonly STATUS_LABELS = STATUS_LABELS;

  // Team state
  readonly team = signal<Team | null>(null);
  readonly members = signal<TeamMemberView[]>([]);
  readonly myRole = signal<Role | null>(null);
  readonly view = signal<View>('board');

  // Tasks state
  readonly tasks = signal<Task[]>([]);
  readonly offset = signal(0);
  readonly hasMore = signal(false);
  readonly loadingTasks = signal(false);
  readonly statusFilter = signal<TaskStatus | ''>('');
  readonly assigneeFilter = signal<string>('');

  // Drag state
  readonly dragOver = signal<TaskStatus | null>(null);

  // Members state
  readonly loadingMembers = signal(false);
  readonly removingMemberId = signal<string | null>(null);
  readonly changingRoleId = signal<string | null>(null);
  inviteUserID = '';
  inviteRole: Role = 'member';
  inviting = signal(false);

  // Stats state
  readonly stats = signal<TeamStats | null>(null);
  readonly loadingStats = signal(false);

  // Misc
  readonly error = signal('');
  readonly notice = signal('');
  readonly loading = signal(true);
  readonly showTaskForm = signal(false);

  // Task create form
  newTask = { title: '', description: '', assignee_id: '' };
  creatingTask = signal(false);

  // Selected task for detail drawer
  readonly selectedTask = signal<Task | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    protected readonly auth: AuthService,
    private readonly teamSvc: TeamService,
    private readonly taskSvc: TaskService,
    private readonly analyticsSvc: AnalyticsService,
  ) { }

  ngOnInit(): void {
    const teamID = this.route.snapshot.paramMap.get('id');
    if (!teamID) {
      this.error.set('Missing team ID.');
      this.loading.set(false);
      return;
    }
    void this.bootstrap(teamID);
  }

  // ==================== BOOTSTRAP ====================

  private async bootstrap(teamID: string): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      const teams = await this.teamSvc.list();
      const team = teams.find(t => t.id === teamID);
      if (!team) {
        this.error.set('Team not found.');
        return;
      }
      this.team.set(team);
      await Promise.all([this.loadMembers(teamID), this.loadTasks(teamID, true)]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      this.loading.set(false);
    }
  }

  // ==================== MEMBERS ====================

  async loadMembers(teamID: string): Promise<void> {
    this.loadingMembers.set(true);
    try {
      const members = await this.teamSvc.listMembers(teamID);
      this.members.set(members);
      const me = this.auth.user();
      const mine = members.find(m => m.user_id === me?.id);
      this.myRole.set(mine?.role ?? null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      this.loadingMembers.set(false);
    }
  }

  async invite(): Promise<void> {
    const teamID = this.team()?.id;
    if (!teamID || !this.inviteUserID.trim() || this.inviting()) return;

    this.inviting.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.teamSvc.invite(teamID, this.inviteUserID.trim());
      this.inviteUserID = '';
      this.notice.set('Member invited.');
      await this.loadMembers(teamID);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      this.inviting.set(false);
    }
  }

  async changeRole(userID: string, role: Role): Promise<void> {
    const teamID = this.team()?.id;
    if (!teamID) return;

    this.changingRoleId.set(userID);
    this.error.set('');
    this.notice.set('');
    try {
      await this.teamSvc.changeRole(teamID, userID, role as 'admin' | 'member');
      this.notice.set('Role updated.');
      await this.loadMembers(teamID);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Role update failed');
    } finally {
      this.changingRoleId.set(null);
    }
  }

  async removeMember(userID: string): Promise<void> {
    const member = this.members().find(m => m.user_id === userID);
    if (!member) return;

    const confirmed = confirm(`Remove ${this.memberName(member)} from the team?`);
    if (!confirmed) return;

    const teamID = this.team()?.id;
    if (!teamID) return;

    this.removingMemberId.set(userID);
    this.error.set('');
    this.notice.set('');
    try {
      await this.teamSvc.removeMember(teamID, userID);
      this.notice.set('Member removed.');
      await this.loadMembers(teamID);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      this.removingMemberId.set(null);
    }
  }

  canManageMembers(): boolean {
    const role = this.myRole();
    return role === 'owner' || role === 'admin';
  }

  // ==================== TASKS ====================

  async loadTasks(teamID: string, reset: boolean): Promise<void> {
    if (reset) {
      this.tasks.set([]);
      this.offset.set(0);
    }
    this.loadingTasks.set(true);
    this.error.set('');
    try {
      const query: TaskQuery = {
        status: this.statusFilter() || undefined,
        assigneeId: this.assigneeFilter() || undefined,
        limit: 50,
        offset: reset ? 0 : this.offset(),
      };
      const res: TaskListResponse = await this.taskSvc.listByTeam(teamID, query);

      if (reset) {
        this.tasks.set(res.tasks);
      } else {
        this.tasks.update(cur => [...cur, ...res.tasks]);
      }
      this.hasMore.set(res.has_more);
      this.offset.set(res.offset + res.tasks.length);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      this.loadingTasks.set(false);
    }
  }

  loadMore(): void {
    const teamID = this.team()?.id;
    if (teamID) {
      void this.loadTasks(teamID, false);
    }
  }

  applyFilters(): void {
    const teamID = this.team()?.id;
    if (teamID) {
      void this.loadTasks(teamID, true);
    }
  }

  clearFilters(): void {
    this.statusFilter.set('');
    this.assigneeFilter.set('');
    this.applyFilters();
  }

  toggleTaskForm(): void {
    const opening = !this.showTaskForm();
    this.showTaskForm.set(opening);
    if (opening && this.view() !== 'board' && this.view() !== 'list') {
      this.view.set('board');
    }
    this.newTask = { title: '', description: '', assignee_id: '' };
    this.error.set('');
    this.notice.set('');
  }

  async createTask(): Promise<void> {
    const teamID = this.team()?.id;
    if (!teamID || !this.newTask.title.trim() || this.creatingTask()) return; 

    this.creatingTask.set(true);
    this.error.set('');
    try {
      const req: CreateTaskRequest = {
        team_id: teamID,
        title: this.newTask.title.trim(),
        description: this.newTask.description.trim() || undefined,
        assignee_id: this.newTask.assignee_id || undefined,
      };
      await this.taskSvc.create(req);
      this.showTaskForm.set(false);
      this.newTask = { title: '', description: '', assignee_id: '' };
      this.notice.set('Task created.');
      await this.loadTasks(teamID, true);
      this.stats.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      this.creatingTask.set(false);
    }
  }

  openTask(task: Task): void {
    this.selectedTask.set(task);
  }

  onTaskClosed(reload: boolean): void {
    this.selectedTask.set(null);
    const teamID = this.team()?.id;
    if (reload && teamID) {
      void this.loadTasks(teamID, true);
      this.stats.set(null);
    }
  }

  // ==================== BOARD / DRAG & DROP ====================

  columnTasks(status: TaskStatus): Task[] {
    return this.tasks().filter(t => t.status === status);
  }

  onDragStart(event: DragEvent, task: Task): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', task.id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, status: TaskStatus): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOver.set(status);
  }

  onDragLeave(status: TaskStatus): void {
    if (this.dragOver() === status) {
      this.dragOver.set(null);
    }
  }

  onDrop(event: DragEvent, status: TaskStatus): void {
    event.preventDefault();
    this.dragOver.set(null);
    const id = event.dataTransfer?.getData('text/plain');
    if (!id) return;
    const task = this.tasks().find(t => t.id === id);
    if (task && task.status !== status) {
      void this.moveTask(task, status);
    }
  }

  async moveTask(task: Task, status: TaskStatus): Promise<void> {
    const teamID = this.team()?.id;
    this.error.set('');
    try {
      const req: UpdateTaskRequest = { status, version: task.version };
      const updated = await this.taskSvc.update(task.id, req);
      this.tasks.update(cur => cur.map(t => (t.id === task.id ? updated : t)));
      this.stats.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Move failed');
      if (teamID) {
        await this.loadTasks(teamID, true);
      }
    }
  }

  // ==================== ANALYTICS ====================

  async openStats(): Promise<void> {
    const teamID = this.team()?.id;
    if (!teamID || this.stats()) return;
    this.loadingStats.set(true);
    try {
      this.stats.set(await this.analyticsSvc.getTeamStats(teamID));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      this.loadingStats.set(false);
    }
  }

  setView(view: View): void {
    this.view.set(view);
    if (view === 'stats') {
      void this.openStats();
    }
  }

  // ==================== HELPERS ====================

  statusLabel(status: TaskStatus): string {
    return STATUS_LABELS[status];
  }

  memberName(member: TeamMemberView): string {
    return member.name || member.email || member.user_id;
  }

  memberById(userID: string | null | undefined): TeamMemberView | undefined {
    if (!userID) return undefined;
    return this.members().find(m => m.user_id === userID);
  }

  memberNameById(userID: string | null | undefined): string {
    const member = this.memberById(userID);
    return member ? this.memberName(member) : 'Unassigned';
  }

  memberInitials(member: TeamMemberView): string {
    const name = this.memberName(member);
    return name
      .split(' ')
      .map(p => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  memberInitialsById(userID: string | null | undefined): string {
    const member = this.memberById(userID);
    return member ? this.memberInitials(member) : '?';
  }

  avatarColor(seed: string): string {
    const palette = ['#0c66e4', '#6554c0', '#006644', '#974f0c', '#ae2a19', '#206a83', '#5243aa'];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  }

  isOwner(member: TeamMemberView): boolean {
    return member.role === 'owner';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  statusEntries(): StatusStat[] {
    const s = this.stats();
    if (!s) return [];
    return (Object.keys(s.tasks_by_status) as TaskStatus[])
      .map(status => ({ status, count: s.tasks_by_status[status] ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }
}