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
  home,
  bookOutline,
  book,
  sparklesOutline,
  sparkles,
  barChartOutline,
  barChart,
  personOutline,
  person
} from 'ionicons/icons';

@Component({
  selector: 'app-student-tabs',
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
      <ion-tab-bar slot="bottom" class="custom-tab-bar">
        <ion-tab-button tab="home">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="learn">
          <ion-icon name="book-outline"></ion-icon>
          <ion-label>Learn</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="ai" class="ai-tab">
          <div class="ai-glow-icon">
            <ion-icon name="sparkles"></ion-icon>
          </div>
          <ion-label>AI Tutor</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="progress">
          <ion-icon name="bar-chart-outline"></ion-icon>
          <ion-label>Progress</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="me">
          <ion-icon name="person-outline"></ion-icon>
          <ion-label>Me</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styleUrls: ['./student-tabs.component.scss']
})
export class StudentTabsComponent {
  constructor() {
    addIcons({
      homeOutline,
      home,
      bookOutline,
      book,
      sparklesOutline,
      sparkles,
      barChartOutline,
      barChart,
      personOutline,
      person
    });
  }
}
