import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { Profile } from './features/profile/profile';
import { TeamDetail } from './features/teams/team-detail/team-detail';
import { TeamsList } from './features/teams/teams-list/teams-list';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'teams' },

    { path: 'login', component: Login, canActivate: [guestGuard] },
    { path: 'register', component: Register, canActivate: [guestGuard] },

    { path: 'teams', component: TeamsList, canActivate: [authGuard] },
    { path: 'teams/:id', component: TeamDetail, canActivate: [authGuard] },
    { path: 'profile', component: Profile, canActivate: [authGuard] },

    { path: '**', redirectTo: 'teams' },
];
