import type { SQLiteDBConnection } from '@capacitor-community/sqlite';

export type LogData = {
  id: number;
  ts: number;
  message: string;
  data: string;
};

export class LogStore {
  db: SQLiteDBConnection | undefined;

  constructor(db: SQLiteDBConnection | undefined) {
    this.db = db;
  }

  private static mInstance: LogStore;

  public static getInstance(db?: SQLiteDBConnection) {
    if (this.mInstance) {
      return this.mInstance;
    } else {
      this.mInstance = new LogStore(db);
    }
    return this.mInstance;
  }

  getLogs = async (): Promise<LogData[]> => {
    try {
      if (!this.db) return [];
      const now = new Date().getTime();
      const day = now - 24 * 60 * 60 * 1000;

      const requests = (
        await this.db.query(`
          SELECT * FROM logs
            WHERE ts > ${day}
            ORDER BY ts DESC;
          `)
      ).values as LogData[];
      return requests;
    } catch {
      return [];
    }
  };

  async addLog(log: Omit<LogData, 'id'>) {
    try {
      this.db?.run('INSERT INTO logs (ts, message, data) VALUES (?,?,?);', [
        log.ts,
        log.message,
        log.data,
      ]);
    } catch {}
  }

  async deleteLog(id: number) {
    try {
      this.db?.run('DELETE from logs WHERE id = ?;', [id]);
    } catch {}
  }

  async removeAllLogs() {
    try {
      this.db?.run('DELETE from logs');
    } catch {}
  }
}
