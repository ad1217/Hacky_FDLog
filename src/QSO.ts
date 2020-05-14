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

export const couchDBRemote = 'http://localhost:5984/';
export const couchDBRemoteDB = 'field_day';

export interface QSO {
  serial: number;
  timestamp: Date;
  callsign: string;
  class: string;
  section: string;
}

export function isQSOValid(qso: Partial<QSO>): boolean {
  return !!(
    qso.serial !== undefined &&
    qso.timestamp &&
    (qso.callsign?.length ?? 0) > 0 &&
    (qso['class']?.length ?? 0) > 0 &&
    (qso.section?.length ?? 0) > 0
  );
}

export type DB_QSO = QSO & {
  timestamp: number;
};

export type QSODocument = RxDocument<DB_QSO>;

export const QSOHeaders: Record<keyof QSO, string> = {
  serial: 'Serial',
  timestamp: 'Timestamp',
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
    serial: { type: 'number' },
    timestamp: { type: 'number' },
    callsign: { type: 'string' },
    class: { type: 'string' },
    section: { type: 'string' },
  },
  required: ['serial', 'timestamp', 'callsign', 'class', 'section'],
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
