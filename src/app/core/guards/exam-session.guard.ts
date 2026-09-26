import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

/**
 * ExamSessionGuard — checks IndexedDB for a pending exam session.
 * If an in-progress session exists for this activityId, allows navigation
 * to exam-player (it will restore state from IndexedDB).
 * If no session data exists, allows fresh start.
 */
export const ExamSessionGuard: CanActivateFn = async (route) => {
  const storage = inject(StorageService);
  const activityId = route.parent?.params?.['activityId'];
  if (!activityId) return true;
  // Check if there's saved exam state in IndexedDB
  const savedAnswers = await storage.getExamAnswers(activityId);
  // Always allow — the exam player handles both fresh + restore scenarios
  return true;
};
