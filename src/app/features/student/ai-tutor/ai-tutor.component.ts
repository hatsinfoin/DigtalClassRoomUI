import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StudentService } from '../../../core/services/student.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  LearningSession,
  LearningMessage,
  LearningActionRequest
} from '../../../core/models/models';
import { MascotComponent } from '../../../shared/components/mascot/mascot.component';
import { TeluguNfcPipe } from '../../../shared/pipes/telugu-nfc.pipe';

@Component({
  selector: 'app-ai-tutor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MascotComponent,
    TeluguNfcPipe
  ],
  template: `
    <div class="ai-tutor-container">
      <!-- AI Header Bar -->
      <header class="tutor-header glass-card">
        <div class="tutor-identity">
          <app-mascot
            size="md"
            [expression]="isThinking ? 'thinking' : 'happy'"
            [animated]="isThinking"
          />
          <div class="tutor-title-info">
            <h1 class="tutor-name">Gyan AI Tutor</h1>
            <span class="tutor-status">
              <span class="status-dot"></span>
              {{ isThinking ? 'Gyan is thinking...' : 'Ready to help in Telugu & English' }}
            </span>
          </div>
        </div>

        <!-- Language Mode Chip -->
        <div class="lang-pill">
          <button
            class="pill-btn"
            [class.active]="currentLang === 'en'"
            (click)="currentLang = 'en'"
          >
            EN
          </button>
          <button
            class="pill-btn telugu"
            [class.active]="currentLang === 'te'"
            (click)="currentLang = 'te'"
          >
            తెలుగు
          </button>
        </div>
      </header>

      <!-- Quick Prompt Suggestion Chips -->
      <div class="quick-prompts-bar">
        <button class="prompt-chip" (click)="sendQuickPrompt('EXPLAIN', 'Explain this chapter in simple words')">
          💡 Simple Explanation
        </button>
        <button class="prompt-chip" (click)="sendQuickPrompt('SUMMARIZE', 'Summarize key points')">
          📑 Key Points Summary
        </button>
        <button class="prompt-chip" (click)="sendQuickPrompt('REVISION', 'Give me quick revision flashcards')">
          ⚡ 5-Min Revision
        </button>
        <button class="prompt-chip" (click)="sendQuickPrompt('ASK', 'Give me 3 practice questions with hints')">
          ❓ Practice Questions
        </button>
      </div>

      <!-- Messages Chat Stream -->
      <main class="chat-stream" #scrollContainer>
        @if (messages.length === 0) {
          <div class="welcome-card glass-card">
            <app-mascot size="lg" expression="happy" speechText="నమస్కారం! Ask me anything!" />
            <h3 class="welcome-title">How can I help you today?</h3>
            <p class="welcome-desc">You can ask questions about your textbook lessons, math problems, science concepts, or grammar in Telugu or English.</p>
          </div>
        }

        @for (msg of messages; track msg.id || $index) {
          <div class="message-row" [ngClass]="msg.role.toLowerCase()">
            @if (msg.role === 'ASSISTANT') {
              <div class="assistant-avatar">
                <app-mascot size="sm" expression="happy" [animated]="false" />
              </div>
            }

            <div class="bubble glass-card" [ngClass]="msg.role.toLowerCase()">
              <p class="bubble-text" [ngClass]="{'text-telugu': currentLang === 'te'}">
                {{ msg.content | teluguNfc }}
              </p>
              <span class="message-time">
                {{ formatTime(msg.timestamp) }}
              </span>
            </div>
          </div>
        }

        @if (isThinking) {
          <div class="message-row assistant">
            <div class="assistant-avatar">
              <app-mascot size="sm" expression="thinking" [animated]="true" />
            </div>
            <div class="bubble glass-card assistant thinking-bubble">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        }
      </main>

      <!-- Bottom Chat Input Bar -->
      <footer class="chat-input-bar glass-card">
        <form (ngSubmit)="sendMessage()" class="input-form">
          <input
            type="text"
            [(ngModel)]="userInput"
            name="userInput"
            placeholder="Ask Gyan a question in Telugu or English..."
            class="chat-input"
            [disabled]="isThinking"
            autocomplete="off"
          />
          <button
            type="submit"
            class="send-btn"
            [disabled]="!userInput.trim() || isThinking"
          >
            <span>➤</span>
          </button>
        </form>
      </footer>
    </div>
  `,
  styleUrls: ['./ai-tutor.component.scss']
})
export class AITutorComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private route = inject(ActivatedRoute);
  private student = inject(StudentService);
  private auth = inject(AuthService);

  sessionId = '';
  lessonId = '';
  messages: LearningMessage[] = [];
  userInput = '';
  currentLang: 'te' | 'en' = 'en';
  isThinking = false;

  ngOnInit(): void {
    this.lessonId = this.route.snapshot.queryParams['lessonId'] || '';
    const storedLang = localStorage.getItem('lang');
    if (storedLang === 'te') this.currentLang = 'te';
    this.initSession();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  initSession(): void {
    const user = this.auth.currentUser();
    const schoolId = user?.schoolId || '';

    this.student.startLearningSession({
      schoolId,
      lessonId: this.lessonId || undefined,
      language: this.currentLang
    }).pipe(
      catchError(() => {
        // Mock session fallback for testing
        return of({
          id: 'demo-session-' + Date.now(),
          studentId: user?.id || '1',
          schoolId,
          lessonId: this.lessonId,
          language: this.currentLang,
          status: 'ACTIVE'
        } as LearningSession);
      })
    ).subscribe((session) => {
      this.sessionId = session.id;
      this.loadHistory();
    });
  }

  loadHistory(): void {
    if (!this.sessionId) return;
    this.student.getSessionMessages(this.sessionId).pipe(
      catchError(() => of([]))
    ).subscribe((msgs) => {
      this.messages = msgs;
    });
  }

  sendQuickPrompt(actionType: 'ASK' | 'EXPLAIN' | 'SUMMARIZE' | 'REVISION', promptText: string): void {
    this.userInput = promptText;
    this.sendAction(actionType);
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isThinking) return;
    this.sendAction('ASK');
  }

  private sendAction(actionType: 'ASK' | 'EXPLAIN' | 'SUMMARIZE' | 'REVISION'): void {
    const text = this.userInput.trim();
    if (!text) return;

    // Append user message immediately
    const userMsg: LearningMessage = {
      role: 'USER',
      content: text,
      timestamp: new Date().toISOString()
    };
    this.messages.push(userMsg);
    this.userInput = '';
    this.isThinking = true;

    const request: LearningActionRequest = {
      actionType,
      query: text,
      language: this.currentLang
    };

    this.student.sendLearningAction(this.sessionId, request).pipe(
      catchError(() => {
        // Fallback intelligent response demo
        return of({
          answer: this.currentLang === 'te'
            ? 'ఈ భావన చాలా సులభం! పాఠ్యపుస్తకంలోని ముఖ్యమైన నియమాలను జ్ఞాపకం ఉంచుకోండి. మీకు మరిన్ని సందేహాలు ఉంటే అడగండి.'
            : 'Great question! Let us break this down step-by-step based on your textbook lessons. If you have any further questions, feel free to ask!',
          status: 'SUCCESS'
        });
      })
    ).subscribe({
      next: (res) => {
        this.isThinking = false;
        const assistantMsg: LearningMessage = {
          role: 'ASSISTANT',
          content: res.answer,
          timestamp: new Date().toISOString()
        };
        this.messages.push(assistantMsg);
      },
      error: () => {
        this.isThinking = false;
      }
    });
  }

  formatTime(ts: string): string {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }
}
