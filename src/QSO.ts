import RxDB, {
  createRxDatabase,
  RxDatabase,
  RxCollection,
  RxJsonSchema,
  RxDocument,
} from 'rxdb';
import * as pouchdb_adapter_idb from 'pouchdb-adapter-idb';
RxDB.plugin(pouchdb_adapter_idb);
import * as pouchdb_adapter_http from 'pouchdb-adapter-http';
RxDB.plugin(pouchdb_adapter_http);

export const couchDBRemote = 'http://' + window.location.hostname + ':5984/';
export const couchDBRemoteDB = 'field_day';

export interface QSO {
  timestamp: Date;
  frequency: string;
  mode: string;
  callsign: string;
  class: string;
  section: string;
}

export function isQSOValid(qso: QSO | DB_QSO): boolean {
  return !!(
    qso.timestamp &&
    qso.frequency > 0 &&
    qso.mode.length > 0 &&
    qso.callsign.length > 0 &&
    qso['class'].length > 0 &&
    qso.section.length > 0
  );
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;

export type DB_QSO = Overwrite<QSO, { timestamp: number; frequency: number }>;

export type QSODocument = RxDocument<DB_QSO>;

export const QSOHeaders: Record<keyof QSO, string> = {
  timestamp: 'Timestamp',
  frequency: 'Frequency',
  mode: 'Mode',
  callsign: 'Callsign',
  class: 'Class',
  section: 'Section',
};

const qsoSchema: RxJsonSchema<DB_QSO> = {
  title: 'QSO',
  description: 'describes a QSO',
  version: 0,
  keyCompression: true,
  type: 'object',
  properties: {
    timestamp: { type: 'number' },
    frequency: { type: 'number' },
    mode: { type: 'string' },
    callsign: { type: 'string' },
    class: { type: 'string' },
    section: { type: 'string' },
  },
  required: ['timestamp', 'callsign', 'class', 'section'],
};

export type QSOCollection = RxCollection<QSODocument>;

export async function init_db() {
  const myDatabase: RxDatabase<[QSOCollection]> = await createRxDatabase<
    [QSOCollection]
  >({
    name: 'field_day',
    adapter: 'idb', // IndexedDB
  });

  const qsoCollection = await myDatabase.collection<QSODocument>({
    name: 'qso',
    schema: qsoSchema,
  });

  qsoCollection.sync({
    remote: couchDBRemote + couchDBRemoteDB,
    options: {
      live: true,
      retry: true,
    },
  });

  return qsoCollection;
}
