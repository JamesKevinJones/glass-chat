import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Atomic JSON write that works on Windows (replace existing destination).
 */
export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(tempPath, payload, 'utf8');
  try {
    await fs.rename(tempPath, filePath);
  } catch {
    await fs.unlink(filePath).catch(() => undefined);
    await fs.rename(tempPath, filePath);
  }
}
