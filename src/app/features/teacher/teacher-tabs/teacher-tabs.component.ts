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
  folderOutline,
  createOutline,
  peopleOutline,
  gridOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-teacher-tabs',
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
      <ion-tab-bar slot="bottom" class="teacher-tab-bar">
        <ion-tab-button tab="home">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="content">
          <ion-icon name="folder-outline"></ion-icon>
          <ion-label>Content</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="activities">
          <ion-icon name="create-outline"></ion-icon>
          <ion-label>Activities</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="turnout">
          <ion-icon name="people-outline"></ion-icon>
          <ion-label>Turnout</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="more">
          <ion-icon name="grid-outline"></ion-icon>
          <ion-label>More</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styleUrls: ['./teacher-tabs.component.scss']
})
export class TeacherTabsComponent {
  constructor() {
    addIcons({
      homeOutline,
      folderOutline,
      createOutline,
      peopleOutline,
      gridOutline
    });
  }
}
