import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { LogData } from './logs';
import { LogStore } from './logs';

const LogTypes = {
  DEBUG: 'DEBUG',
  ERROR: 'ERROR',
  INFO: 'INFO',
  ACTION: 'ACTION',
} as const;

type Options = {
  flushTimeout?: number; // seconds
  flushLimit?: number; // log items
};

export class Logger {
  private flushTimeout: number;
  private flushLimit: number;
  private logs: Omit<LogData, 'id'>[] = [];
  private interval: ReturnType<typeof setInterval> | undefined;
  private logStore: LogStore;

  private static mInstance: Logger;

  constructor(props?: Options, db?: SQLiteDBConnection) {
    this.logStore = LogStore.getInstance(db);

    if (props?.flushTimeout) {
      this.flushTimeout = props.flushTimeout * 1000;
    } else {
      this.flushTimeout = 20 * 1000;
    }

    this.flushLimit = props?.flushLimit || 1;
    this.configure();
  }

  public static getInstance(db?: SQLiteDBConnection) {
    if (this.mInstance) {
      return this.mInstance;
    } else {
      this.mInstance = new Logger(undefined, db);
    }
    return this.mInstance;
  }

  private configure = () => {
    this.interval = setInterval(() => {
      this.flush();
    }, this.flushTimeout);
  };

  flush = async () => {
    const logs = [...this.logs];
    this.logs = [];

    try {
      const promises = [];
      for (const log of logs) {
        if (!this.logStore) continue;

        const p = this.logStore.addLog(log);
        promises.push(p);
      }
      await Promise.all(promises);
    } catch (error: any) {
      this.error('send logs error: ' + error?.message, {});
    }
  };

  private log = (
    type: keyof typeof LogTypes,
    message: string,
    payload: Record<string, any>,
  ) => {
    let data = '';
    try {
      data = JSON.stringify({ type, ...payload }, null, 2);
    } catch {}

    const logData: Omit<LogData, 'id'> = {
      ts: new Date().getTime(),
      message,
      data,
    };

    this.logs.push(logData);

    if (this.logs.length >= this.flushLimit) {
      this.flush();
    }
  };

  info = (message: string, payload: Record<string, any>) => {
    const type = LogTypes.INFO;
    this.log(type, message, payload);
  };

  debug = (message: string, payload: Record<string, any>) => {
    const type = LogTypes.DEBUG;
    this.log(type, message, payload);
  };

  error = (message: string, payload: Record<string, any>) => {
    const type = LogTypes.ERROR;
    this.log(type, message, payload);
  };

  action = (message: string, payload: Record<string, any>) => {
    const type = LogTypes.ACTION;
    this.log(type, message, payload);
  };
}
