import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { DbUpgradeStatements } from './upgrades/db.upgrade.statements';
import { config } from '@/config';
import { Capacitor } from '@capacitor/core';
import { type App, type InjectionKey } from 'vue';

class SQLiteService {
  sqlitePlugin = CapacitorSQLite;
  sqliteConnection = new SQLiteConnection(CapacitorSQLite);

  dbName: string;
  loadToVersion: number;

  constructor(dbName: string, loadToVersion: number) {
    this.dbName = dbName;
    this.loadToVersion = loadToVersion;
  }

  async openDatabase(readOnly = false): Promise<SQLiteDBConnection> {
    let encrypted = false;
    const mode = encrypted ? 'secret' : 'no-encryption';
    try {
      let db: SQLiteDBConnection;
      const retCC = (await this.sqliteConnection.checkConnectionsConsistency())
        .result;
      let isConn = (
        await this.sqliteConnection.isConnection(this.dbName, readOnly)
      ).result;
      if (retCC && isConn) {
        db = await this.sqliteConnection.retrieveConnection(
          this.dbName,
          readOnly,
        );
      } else {
        db = await this.sqliteConnection.createConnection(
          this.dbName,
          encrypted,
          mode,
          this.loadToVersion,
          readOnly,
        );
      }

      await db.open();
      await db.isDBOpen();
      return db;
    } catch (error: any) {
      const msg = error.message ? error.message : error;
      throw new Error(`sqliteService.openDatabase: ${msg}`);
    }
  }
  async isConnection(readOnly: boolean = false): Promise<boolean> {
    try {
      const isConn = (
        await this.sqliteConnection.isConnection(this.dbName, readOnly)
      ).result;
      if (isConn != undefined) {
        return isConn;
      } else {
        throw new Error(`sqliteService.isConnection undefined`);
      }
    } catch (error: any) {
      const msg = error.message ? error.message : error;
      throw new Error(`sqliteService.isConnection: ${msg}`);
    }
  }
  async closeDatabase(readOnly: boolean = false): Promise<void> {
    try {
      const isConn = (
        await this.sqliteConnection.isConnection(this.dbName, readOnly)
      ).result;
      if (isConn) {
        await this.sqliteConnection.closeConnection(this.dbName, readOnly);
      }
    } catch (error: any) {
      const msg = error.message ? error.message : error;
      throw new Error(`sqliteService.closeDatabase: ${msg}`);
    }
  }
  async saveToStore(): Promise<void> {
    try {
      await this.sqliteConnection.saveToStore(this.dbName);
    } catch (error: any) {
      const msg = error.message ? error.message : error;
      throw new Error(`sqliteService.saveToStore: ${msg}`);
    }
  }
  async saveToLocalDisk(): Promise<void> {
    try {
      await this.sqliteConnection.saveToLocalDisk(this.dbName);
    } catch (err: any) {
      const msg = err.message ? err.message : err;
      throw new Error(`sqliteService.saveToLocalDisk: ${msg}`);
    }
  }
}

const initializeDatabase = async () => {
  try {
    if (Capacitor.getPlatform() === 'web') return;

    const versionUpgrades = DbUpgradeStatements;
    const loadToVersion =
      DbUpgradeStatements[DbUpgradeStatements.length - 1].toVersion;

    await CapacitorSQLite.addUpgradeStatement({
      database: config.DB_NAME,
      upgrade: versionUpgrades,
    });

    const sqliteServ = new SQLiteService(config.DB_NAME, loadToVersion);
    return sqliteServ;
  } catch (error: any) {
    console.log('initializeDatabase');
    console.error(error);
  }
};

type Sqlite = {
  service: SQLiteService;
  db: SQLiteDBConnection;
};

export const sqliteServiceKey = Symbol() as InjectionKey<Sqlite | undefined>;

export const initSqlite = async () => {
  const service = await initializeDatabase();
  const db = await service?.openDatabase();

  return { service, db };
};

export type SqliteVuePluginProps = {
  service: SQLiteService | undefined;
  db: SQLiteDBConnection | undefined;
};

export const sqliteVuePlugin = ({ service, db }: SqliteVuePluginProps) => {
  return {
    install: async (app: App) => {
      // @ts-ignore
      app.provide(sqliteServiceKey, { service, db });
    },
  };
};
