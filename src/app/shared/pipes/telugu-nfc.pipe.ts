import { Pipe, PipeTransform } from '@angular/core';

/**
 * Telugu NFC Pipe (Invariant I3):
 * All Telugu text fields MUST preserve their exact NFC Unicode codepoints.
 * This pipe ensures NO normalization, trimming, or mutating occurs on Telugu strings.
 * Also handles bilingual content objects ({ en, te }) and object models safely.
 */
@Pipe({
  name: 'teluguNfc',
  standalone: true
})
export class TeluguNfcPipe implements PipeTransform {
  transform(value: unknown, preferredLang?: string): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const currentLang = preferredLang || localStorage.getItem('lang') || 'en';

      // 1. Check bilingual fields (te / en)
      if (currentLang === 'te') {
        if (typeof obj['te'] === 'string') return obj['te'];
        if (typeof obj['telugu'] === 'string') return obj['telugu'];
      }
      if (typeof obj['en'] === 'string') return obj['en'];
      if (typeof obj['english'] === 'string') return obj['english'];
      if (typeof obj['te'] === 'string') return obj['te'];
      if (typeof obj['telugu'] === 'string') return obj['telugu'];

      // 2. Check standard object properties
      if (typeof obj['title'] === 'string') return obj['title'];
      if (typeof obj['title'] === 'object') return this.transform(obj['title'], preferredLang);

      if (typeof obj['name'] === 'string') return obj['name'];
      if (typeof obj['name'] === 'object') return this.transform(obj['name'], preferredLang);

      if (typeof obj['text'] === 'string') return obj['text'];
      if (typeof obj['text'] === 'object') return this.transform(obj['text'], preferredLang);

      if (typeof obj['label'] === 'string') return obj['label'];
      if (typeof obj['value'] === 'string') return obj['value'];

      // 3. Fallback: Find the first string value in the object
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string' && val.trim().length > 0) {
          return val;
        }
      }
    }

    return String(value);
  }
}
