import { Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { User } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  readonly loggingOut = signal(false);
  readonly copied = signal(false);
  readonly copyError = signal('');

  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    protected readonly auth: AuthService,
    private readonly router: Router,
  ) { }

  get user(): User | null {
    return this.auth.user();
  }

  get initials(): string {
    const name = this.user?.name ?? '';
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }

  get memberSince(): string {
    const createdAt = this.user?.created_at;
    if (!createdAt) return 'N/A';

    return new Date(createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  get hasCreatedAt(): boolean {
    return !!this.user?.created_at;
  }

  async copyUserId(): Promise<void> {
    const id = this.user?.id;
    if (!id) return;

    try {
      await navigator.clipboard.writeText(id);
      this.copied.set(true);
      this.copyError.set('');

      // Reset after 2 seconds
      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }
      this.copyTimeout = setTimeout(() => {
        this.copied.set(false);
      }, 2000);
    } catch {
      // Fallback for older browsers
      this.copyError.set('Failed to copy. Please copy manually.');
    }
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    try {
      await this.auth.logout();
      await this.router.navigate(['/login']);
    } finally {
      this.loggingOut.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }
}