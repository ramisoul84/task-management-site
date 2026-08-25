import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { Team } from '../../../core/models/team.model';
import { TeamService } from '../../../core/services/team.service';


@Component({
  selector: 'app-teams-list',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './teams-list.html',
  styleUrl: './teams-list.scss',
})
export class TeamsList implements OnInit {
  readonly teams = signal<Team[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');
  readonly showForm = signal(false);
  readonly creating = signal(false);

  teamForm: FormGroup;

  constructor(
    private readonly teamsSvc: TeamService,
    protected readonly auth: AuthService,
    private readonly fb: FormBuilder,
  ) {
    this.teamForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  get greeting(): string {
    const name = this.auth.user()?.name ?? 'there';
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${part}, ${name}`;
  }

  get nameControl() {
    return this.teamForm.get('name');
  }

  async load(): Promise<void> {
    this.error.set('');
    this.loading.set(true);

    try {
      this.teams.set(await this.teamsSvc.list());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      this.loading.set(false);
    }
  }

  toggleForm(): void {
    this.showForm.update(v => !v);
    this.teamForm.reset();
    this.error.set('');
    this.notice.set('');
  }

  async create(): Promise<void> {
    if (this.teamForm.invalid || this.creating()) {
      this.teamForm.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    this.error.set('');

    try {
      const name = this.teamForm.value.name.trim();
      await this.teamsSvc.create(name);
      this.teamForm.reset();
      this.showForm.set(false);
      this.notice.set('Team created successfully!');
      await this.load();

      // Auto-hide notice after 3 seconds
      setTimeout(() => this.notice.set(''), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      this.creating.set(false);
    }
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  teamColor(id: string): string {
    const palette = ['#0c66e4', '#6554c0', '#006644', '#974f0c', '#ae2a19', '#206a83'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return palette[hash % palette.length];
  }

  teamInitials(name: string): string {
    return name
      .split(/\s+/)
      .map(p => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}