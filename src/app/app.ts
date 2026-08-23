import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Nav } from "./shared/nav/nav";
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Nav],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthService);
}
