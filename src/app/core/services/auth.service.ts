import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RefreshResponse, RegisterRequest, User } from '../models/user.model';

const TOKEN_KEY = 'tm.access_token';
const USER_KEY = 'tm.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
    private userSignal = signal<User | null>(this.readUser());

    readonly token = this.tokenSignal.asReadonly();
    readonly user = this.userSignal.asReadonly();
    readonly isAuthenticated = () => this.tokenSignal() !== null;

    constructor(private http: HttpClient) { }

    async login(email: string, password: string): Promise<User> {
        const body: LoginRequest = { email, password };

        const res = await firstValueFrom(
            this.http.post<LoginResponse>(
                `${environment.apiUrl}/api/v1/auth/login`,
                body,
                { withCredentials: true },
            ),
        );

        this.setSession(res.access_token, res.user);
        return res.user;
    }

    async register(name: string, email: string, password: string): Promise<void> {
        const body: RegisterRequest = { name, email, password };

        await firstValueFrom(
            this.http.post(
                `${environment.apiUrl}/api/v1/auth/register`,
                body,
                { withCredentials: true },
            ),
        );
    }

    async logout(): Promise<void> {
        try {
            await firstValueFrom(
                this.http.post(
                    `${environment.apiUrl}/api/v1/auth/logout`,
                    {},
                    { withCredentials: true },
                ),
            );
        } catch {
            // Best effort - clear local session regardless
        }
        this.clearSession();
    }

    async refresh(): Promise<boolean> {
        try {
            const res = await firstValueFrom(
                this.http.post<RefreshResponse>(
                    `${environment.apiUrl}/api/v1/auth/refresh`,
                    {},
                    { withCredentials: true },
                ),
            );

            this.tokenSignal.set(res.access_token);
            localStorage.setItem(TOKEN_KEY, res.access_token);
            return true;
        } catch {
            return false;
        }
    }

    // ==================== PRIVATE ====================

    private setSession(token: string, user: User): void {
        this.tokenSignal.set(token);
        this.userSignal.set(user);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    private clearSession(): void {
        this.tokenSignal.set(null);
        this.userSignal.set(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    private readUser(): User | null {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }
}