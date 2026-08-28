export type Role = 'owner' | 'admin' | 'member';

export interface Team {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
}

export interface TeamMemberView {
    user_id: string;
    email: string;
    name: string;
    role: Role;
}

export interface InviteRequest {
    user_id: string;
}

export interface ChangeRoleRequest {
    role: 'admin' | 'member';
}