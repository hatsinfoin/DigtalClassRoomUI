import { Injectable } from '@angular/core';
import { StudentAnswer, StudentProgress, LearningActionRequest } from '../models/models';

const DB_NAME    = 'digitalclassroom-offline';
const DB_VERSION = 1;

/** IndexedDB store names — as spec'd in Part3 §3.5 */
const STORES = {
  EXAM_ANSWERS:   'exam-answers',
  PROGRESS_QUEUE: 'progress-queue',
  AI_QUEUE:       'ai-message-queue',
  LESSON_CACHE:   'lesson-cache',
  MEDIA_BLOBS:    'media-blobs'
} as const;

@Injectable({ providedIn: 'root' })
export class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.EXAM_ANSWERS)) {
          db.createObjectStore(STORES.EXAM_ANSWERS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORES.PROGRESS_QUEUE)) {
          db.createObjectStore(STORES.PROGRESS_QUEUE, { keyPath: 'key', autoIncrement: false });
        }
        if (!db.objectStoreNames.contains(STORES.AI_QUEUE)) {
          db.createObjectStore(STORES.AI_QUEUE, { keyPath: 'key', autoIncrement: false });
        }
        if (!db.objectStoreNames.contains(STORES.LESSON_CACHE)) {
          db.createObjectStore(STORES.LESSON_CACHE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORES.MEDIA_BLOBS)) {
          db.createObjectStore(STORES.MEDIA_BLOBS, { keyPath: 'resourceId' });
        }
      };

      req.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ──────────────────────────────────────────────
  // EXAM ANSWERS (offline exam queue)
  // ──────────────────────────────────────────────
  async saveExamAnswer(activityId: number | string, answer: StudentAnswer): Promise<void> {
    const key = `${activityId}_${answer.questionId}`;
    return this.put(STORES.EXAM_ANSWERS, { key, activityId, ...answer, timestamp: Date.now() });
  }

  async putExamAnswer(activityId: number | string, answer: StudentAnswer): Promise<void> {
    return this.saveExamAnswer(activityId, answer);
  }

  async getExamAnswers(activityId: number | string): Promise<StudentAnswer[]> {
    const all = await this.getAll<any>(STORES.EXAM_ANSWERS);
    return all
      .filter(r => String(r.activityId) === String(activityId))
      .map(({ key, activityId: _a, timestamp: _t, ...ans }) => ans as StudentAnswer);
  }

  async clearExamAnswers(activityId: number | string): Promise<void> {
    const all = await this.getAll<any>(STORES.EXAM_ANSWERS);
    const toDelete = all.filter(r => String(r.activityId) === String(activityId));
    await Promise.all(toDelete.map(r => this.delete(STORES.EXAM_ANSWERS, r.key)));
  }

  // ──────────────────────────────────────────────
  // PROGRESS QUEUE (heartbeat sync)
  // ──────────────────────────────────────────────
  async queueProgress(progress: StudentProgress): Promise<void> {
    const key = `${progress.contentUnitId}_${Date.now()}`;
    return this.put(STORES.PROGRESS_QUEUE, { key, ...progress });
  }

  async getAllQueuedProgress(): Promise<StudentProgress[]> {
    return this.getAll<StudentProgress>(STORES.PROGRESS_QUEUE);
  }

  async getPendingProgressCount(): Promise<number> {
    const list = await this.getAllQueuedProgress();
    return list.length;
  }

  async clearProgressQueue(): Promise<void> {
    return this.clear(STORES.PROGRESS_QUEUE);
  }

  // ──────────────────────────────────────────────
  // AI MESSAGE QUEUE
  // ──────────────────────────────────────────────
  async queueAIMessage(sessionId: string, msg: LearningActionRequest): Promise<void> {
    const key = `${sessionId}_${Date.now()}`;
    return this.put(STORES.AI_QUEUE, { key, sessionId, ...msg });
  }

  async getAllQueuedAIMessages(): Promise<any[]> {
    return this.getAll<any>(STORES.AI_QUEUE);
  }

  // ──────────────────────────────────────────────
  // LESSON CACHE
  // ──────────────────────────────────────────────
  async cacheLesson(lessonId: number | string, language: string, chunks: any[]): Promise<void> {
    const key = `${lessonId}_${language}`;
    return this.put(STORES.LESSON_CACHE, { key, lessonId, language, chunks, cachedAt: Date.now() });
  }

  async getLessonCache(lessonId: number | string, language: string): Promise<any[] | null> {
    const key = `${lessonId}_${language}`;
    const record = await this.get<any>(STORES.LESSON_CACHE, key);
    return record?.chunks ?? null;
  }

  async getCachedLesson(lessonId: number | string, language: string): Promise<any[] | null> {
    return this.getLessonCache(lessonId, language);
  }

  // ──────────────────────────────────────────────
  // MEDIA BLOBS
  // ──────────────────────────────────────────────
  async saveMediaBlob(resourceId: number | string, blob: Blob): Promise<void> {
    return this.put(STORES.MEDIA_BLOBS, { resourceId: String(resourceId), blob, cachedAt: Date.now() });
  }

  async putMediaBlob(resourceId: number | string, blob: Blob): Promise<void> {
    return this.saveMediaBlob(resourceId, blob);
  }

  async getMediaBlob(resourceId: number | string): Promise<Blob | null> {
    const record = await this.get<any>(STORES.MEDIA_BLOBS, String(resourceId));
    return record?.blob ?? null;
  }

  // ──────────────────────────────────────────────
  // GENERIC IndexedDB HELPERS
  // ──────────────────────────────────────────────
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    return this.db!;
  }

  private async put<T>(store: string, value: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }

  private async getAll<T>(store: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  private async delete(store: string, key: IDBValidKey): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async clear(store: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
