import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { logDebug, logError } from './useLogger';
import { type Position } from '@/plugins/geolocation';

export type ResponseData = {
  id: number;
  type: 'sent' | 'received';
  contactId: string;
  address: string;
} & GpsData;

export type MessageType =
  | 'GO_FLY'
  | 'ALL_OK'
  | 'NEED_RETREIVE'
  | 'ON_MY_WAY'
  | 'NEED_HELP'
  | 'OK'
  | 'CAN_NOT';

export type GpsData = {
  lon: number;
  lat: number;
  ts: number;
  alt_m?: number;
  v_kmh?: number;
  acc_m?: number;
  bat_p?: number;
  message?: MessageType;
};

export class ResponseStore {
  private db: SQLiteDBConnection | undefined;
  private static mInstance: ResponseStore;

  constructor(db: SQLiteDBConnection | undefined) {
    this.db = db;
  }

  public static getInstance(db?: SQLiteDBConnection | undefined) {
    if (this.mInstance) {
      return this.mInstance;
    } else {
      this.mInstance = new ResponseStore(db);
      return this.mInstance;
    }
  }

  async getResponses(filter: 'day' | 'all' = 'day') {
    try {
      if (!this.db) {
        logDebug('responses getResponses', 'no db');
        return [];
      }
      const now = new Date().getTime();
      const dayBack = now - 24 * 60 * 60 * 1000;
      const responses = (
        await this.db.query(`
        SELECT * FROM responses 
          ${filter === 'all' ? '' : `WHERE ts > ${dayBack}`}          
          ORDER BY ts DESC;
        `)
      ).values as ResponseData[];
      return responses;
    } catch (error: any) {
      logError(error);
      return [];
    }
  }

  async getResponsesByUser(contactId: string) {
    try {
      if (!this.db) {
        logDebug('responses getResponsesByUser', 'no db');
        return [];
      }
      const responses = (
        await this.db.query(`
        SELECT * FROM responses 
        WHERE contactId = ${contactId}
          ORDER BY ts DESC;
        `)
      ).values as ResponseData[];
      return responses;
    } catch (error: any) {
      logError(error);
      return [];
    }
  }

  async getResponseById(id: number) {
    try {
      if (!this.db) {
        logDebug('responses getResponseById', 'no db');
        return null;
      }

      const responses = (
        await this.db.query(`
        SELECT * FROM responses 
          WHERE id = ${id};
        `)
      ).values as ResponseData[];
      return responses[0] ?? null;
    } catch (error: any) {
      logError(error);
      return null;
    }
  }

  async addResponse(response: Omit<ResponseData, 'id'>) {
    if (!this.db) {
      logDebug('response addResponse', 'no db');
      return;
    }

    try {
      this.db.run(
        'INSERT INTO responses (type, contactId, address, lon, lat, ts, alt_m, v_kmh, acc_m, bat_p, message) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
        [
          response.type,
          response.contactId,
          response.address,
          response.lon,
          response.lat,
          response.ts,
          response.alt_m ?? null,
          response.v_kmh ?? null,
          response.acc_m ?? null,
          response.bat_p ?? null,
          response.message ?? '',
        ],
      );
    } catch (error) {
      logError(error);
    }
  }
}

const gpsDataValid = (data: GpsData) => {
  if (data.lat == undefined || data.lon == undefined || data.ts == undefined) {
    return false;
  }
  if (data.lat > 90.0 || data.lat < -90.0) {
    return false;
  }
  if (data.lon > 180.0 || data.lon < -180.0) {
    return false;
  }
  return true;
};

function toStringYX(
  [lon, lat]: [number, number] | number[],
  fractionDigits: number | undefined = 1,
) {
  return `${Math.abs(lat).toFixed(fractionDigits)},${Math.abs(lon).toFixed(
    fractionDigits,
  )}`;
}

export const toGpsData = (opt: {
  position: Position;
  message: MessageType;
  battery: number | undefined;
}): GpsData => {
  const data: GpsData = {
    lat: opt.position.coords.latitude,
    lon: opt.position.coords.longitude,
    ts: opt.position.timestamp,
    alt_m: opt.position.coords.altitude ?? undefined,
    acc_m: opt.position.coords.accuracy,
    v_kmh: opt.position.coords.speed ?? undefined,
    bat_p: opt.battery,
    message: opt.message,
  };
  data.alt_m = data.alt_m != undefined ? Math.round(data.alt_m) : undefined;
  data.v_kmh = data.v_kmh != undefined ? Math.round(data.v_kmh) : undefined;
  data.acc_m = data.acc_m != undefined ? Math.round(data.acc_m) : undefined;
  data.bat_p = data.bat_p != undefined ? Math.round(data.bat_p) : undefined;

  return data;
};

export const gpsToSmsText = (data: GpsData): string => {
  if (!gpsDataValid(data)) {
    throw new Error('IVALID_GPS_DATA');
  }

  const printLoc = toStringYX([data.lon, data.lat], 4);
  const printTs = Math.round(data.ts / 1000);
  const printAlt = data.alt_m != undefined ? Math.round(data.alt_m) : '';
  const printSpd = data.v_kmh != undefined ? Math.round(data.v_kmh) : '';
  const printAcc = data.acc_m != undefined ? Math.round(data.acc_m) : '';
  const printBat = data.bat_p != undefined ? Math.round(data.bat_p) : '';
  const printMsg = data.message ?? '';

  const values = [
    printLoc,
    printAlt,
    printTs,
    printSpd,
    printAcc,
    printBat,
    printMsg,
  ];
  const RESPONSE_CODE = 'Loc:';
  return RESPONSE_CODE + values.join(',');
};
