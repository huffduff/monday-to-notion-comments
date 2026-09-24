import { promises as fs } from 'fs';
import path from 'path';

/**
 * Ensure a directory exists, create it if it doesn't
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Read JSON file with error handling
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error: any) {
    console.warn(`Could not read JSON file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Write JSON file with pretty formatting
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Delay execution for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize text for safe display
 */
export function sanitizeText(text: string, maxLength: number = 100): string {
  if (!text) return '';
  
  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  // Truncate if too long
  if (cleanText.length > maxLength) {
    return cleanText.substring(0, maxLength) + '...';
  }
  
  return cleanText;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    return timestamp;
  }
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate Monday.com item ID format (numeric)
 */
export function isValidMondayId(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * Create a progress bar for CLI output
 */
export class ProgressBar {
  private current = 0;
  private total: number;
  private label: string;

  constructor(total: number, label = 'Progress') {
    this.total = total;
    this.label = label;
  }

  update(current: number): void {
    this.current = current;
    this.render();
  }

  increment(): void {
    this.current++;
    this.render();
  }

  private render(): void {
    const percentage = Math.round((this.current / this.total) * 100);
    const barLength = 20;
    const filled = Math.round((this.current / this.total) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    
    process.stdout.write(`\r${this.label}: [${bar}] ${percentage}% (${this.current}/${this.total})`);
    
    if (this.current === this.total) {
      process.stdout.write('\n');
    }
  }
}

/**
 * Batch process items with concurrency control
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { batchSize = 10, concurrency = 3, onProgress } = options;
  const results: R[] = [];
  let completed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch with concurrency limit
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = i + batchIndex;
      try {
        const result = await processor(item, globalIndex);
        completed++;
        if (onProgress) {
          onProgress(completed, items.length);
        }
        return result;
      } catch (error) {
        console.error(`Error processing item ${globalIndex}:`, error);
        completed++;
        if (onProgress) {
          onProgress(completed, items.length);
        }
        throw error;
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    // Collect successful results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[i + index] = result.value;
      } else {
        console.error(`Batch item ${i + index} failed:`, result.reason);
      }
    });

    // Small delay between batches
    await delay(100);
  }

  return results;
}