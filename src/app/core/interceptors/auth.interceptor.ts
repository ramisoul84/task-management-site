import { inject } from '@angular/core';
import {
    HttpRequest,
    HttpHandlerFn,
    HttpEvent,
    HttpErrorResponse,
} from '@angular/common/http';
import { Observable, catchError, switchMap, throwError, from } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
    const auth = inject(AuthService);
    const token = auth.token();

    // Add token to request
    if (token) {
        req = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
            withCredentials: true,
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Only handle 401 for API requests (exclude auth endpoints)
            if (
                error.status === 401 &&
                req.url.includes(environment.apiUrl) &&
                !req.url.includes('/auth/login') &&
                !req.url.includes('/auth/refresh') &&
                !req.url.includes('/auth/register') &&
                !req.url.includes('/auth/logout')
            ) {
                return handleUnauthorized(req, next, auth);
            }

            return throwError(() => error);
        }),
    );
};

function handleUnauthorized(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
    auth: AuthService,
): Observable<HttpEvent<unknown>> {
    // Convert Promise to Observable
    return from(auth.refresh()).pipe(
        switchMap((refreshed: boolean) => {
            if (refreshed) {
                // Retry original request with new token
                const token = auth.token();
                const newReq = req.clone({
                    setHeaders: { Authorization: `Bearer ${token}` },
                    withCredentials: true,
                });
                return next(newReq);
            }

            // Refresh failed - logout user
            auth.clearSession();
            return throwError(() => new Error('Session expired. Please login again.'));
        }),
    );
}