import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
    constructor(private http: HttpClient) { }

    get<T>(path: string): Promise<T> {
        return firstValueFrom(
            this.http.get<T>(`${environment.apiUrl}${path}`, { withCredentials: true }),
        );
    }

    post<T>(path: string, body?: unknown): Promise<T> {
        return firstValueFrom(
            this.http.post<T>(`${environment.apiUrl}${path}`, body, { withCredentials: true }),
        );
    }

    put<T>(path: string, body?: unknown): Promise<T> {
        return firstValueFrom(
            this.http.put<T>(`${environment.apiUrl}${path}`, body, { withCredentials: true }),
        );
    }

    patch<T>(path: string, body?: unknown): Promise<T> {
        return firstValueFrom(
            this.http.patch<T>(`${environment.apiUrl}${path}`, body, { withCredentials: true }),
        );
    }

    delete<T>(path: string): Promise<T> {
        return firstValueFrom(
            this.http.delete<T>(`${environment.apiUrl}${path}`, { withCredentials: true }),
        );
    }
}