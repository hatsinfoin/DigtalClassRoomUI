import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  trendingUpOutline,
  documentTextOutline,
  notificationsOutline,
  personOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-parent-tabs',
  standalone: true,
  imports: [
    CommonModule,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel
  ],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" class="parent-tab-bar">
        <ion-tab-button tab="home">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="progress">
          <ion-icon name="trending-up-outline"></ion-icon>
          <ion-label>Progress</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tests">
          <ion-icon name="document-text-outline"></ion-icon>
          <ion-label>Tests</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="alerts">
          <ion-icon name="notifications-outline"></ion-icon>
          <ion-label>Alerts</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="me">
          <ion-icon name="person-outline"></ion-icon>
          <ion-label>Me</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styleUrls: ['./parent-tabs.component.scss']
})
export class ParentTabsComponent {
  constructor() {
    addIcons({
      homeOutline,
      trendingUpOutline,
      documentTextOutline,
      notificationsOutline,
      personOutline
    });
  }
}
