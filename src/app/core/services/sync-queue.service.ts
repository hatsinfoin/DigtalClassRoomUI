import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';
import { StudentProgress, LearningActionRequest } from '../models/models';
import { firstValueFrom } from 'rxjs';

/**
 * SyncQueueService — Flushes offline queues when network reconnects.
 * Flush order (Part3 §3.5):
 *   1. exam-answers → POST /api/student/activities/:activityId/attempts
 *   2. progress-queue → POST /api/student/progress (batched)
 *   3. ai-message-queue → POST /api/student/sessions/:id/action (sequential)
 */
@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  private readonly http    = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly base    = environment.apiUrl;

  private isSyncing = false;

  /** Call this on app init and on window 'online' event */
  startListening(): void {
    window.addEventListener('online', () => this.flush());
    if (navigator.onLine) this.flush();
  }

  async flush(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;
    try {
      await this.flushProgress();
      await this.flushAIMessages();
      // Note: exam-answers flushed explicitly from ExamPlayer on submit
    } finally {
      this.isSyncing = false;
    }
  }

  // ──────────────────────────────────────────────
  // 1. PROGRESS QUEUE
  // ──────────────────────────────────────────────
  async flushProgress(): Promise<void> {
    const items = await this.storage.getAllQueuedProgress();
    if (!items.length) return;
    try {
      // Batch all progress updates
      await firstValueFrom(
        this.http.post<void>(`${this.base}/api/student/progress/batch`, items)
      );
      await this.storage.clearProgressQueue();
    } catch {
      // Keep in queue for next sync attempt
    }
  }

  // ──────────────────────────────────────────────
  // 2. AI MESSAGE QUEUE
  // ──────────────────────────────────────────────
  async flushAIMessages(): Promise<void> {
    const messages = await this.storage.getAllQueuedAIMessages();
    for (const msg of messages) {
      try {
        await firstValueFrom(
          this.http.post(
            `${this.base}/api/student/sessions/${msg.sessionId}/action`,
            msg as LearningActionRequest
          )
        );
      } catch {
        break; // Stop on first failure — preserve order
      }
    }
  }

  // ──────────────────────────────────────────────
  // 3. EXAM ANSWERS (called explicitly from ExamPlayer)
  // ──────────────────────────────────────────────
  async flushExamAnswers(activityId: number): Promise<any> {
    const answers = await this.storage.getExamAnswers(activityId);
    if (!answers.length) return null;
    const result = await firstValueFrom(
      this.http.post<any>(
        `${this.base}/api/student/activities/${activityId}/attempts`,
        { answers }
      )
    );
    await this.storage.clearExamAnswers(activityId);
    return result;
  }
}
