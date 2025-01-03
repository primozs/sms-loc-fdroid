import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { logDebug, logError } from '@/services/useLogger';

export type RequestData = {
  id: number;
  type: 'sent' | 'received';
  ts: number;
  contactId: string;
  address: string;
};

export class RequestStore {
  private db: SQLiteDBConnection | undefined;
  private static mInstance: RequestStore;

  constructor(db: SQLiteDBConnection | undefined) {
    this.db = db;
  }

  public static getInstance(db?: SQLiteDBConnection | undefined) {
    if (this.mInstance) {
      return this.mInstance;
    } else {
      this.mInstance = new RequestStore(db);
      return this.mInstance;
    }
  }

  getRequests = async (
    filter: 'day' | 'all' = 'day',
  ): Promise<RequestData[]> => {
    try {
      if (!this.db) return [];
      const now = new Date().getTime();
      const dayBack = now - 24 * 60 * 60 * 1000;

      const requests = (
        await this.db.query(`
          SELECT * FROM requests 
            ${filter === 'all' ? '' : `WHERE ts > ${dayBack}`}
            ORDER BY ts DESC;
          `)
      ).values as RequestData[];
      return requests;
    } catch (error: any) {
      logError(error);
      return [];
    }
  };

  getRequestsByUser = async (contactId: string): Promise<RequestData[]> => {
    try {
      if (!this.db) return [];
      const requests = (
        await this.db.query(`
          SELECT * FROM requests 
          WHERE contactId = ${contactId}
            ORDER BY ts DESC;
          `)
      ).values as RequestData[];
      return requests;
    } catch (error: any) {
      logError(error);
      return [];
    }
  };

  addRequest = async (request: RequestData) => {
    if (!this.db) {
      logDebug('request addRequest', 'no db');
      return;
    }
    try {
      this.db.run(
        'INSERT INTO requests (type, ts, contactId, address) VALUES (?,?,?,?);',
        [request.type, request.ts, request.contactId, request.address],
      );
    } catch (error) {
      logError(error);
    }
  };
}
