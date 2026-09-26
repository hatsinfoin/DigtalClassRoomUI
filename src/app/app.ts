import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IonApp, IonRouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  public auth = inject(AuthService);
}
