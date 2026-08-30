export interface User {
    id: string;
    email: string;
    name: string;
    created_at?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface LoginResponse {
    user: User;
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface RefreshResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}