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

export interface QSO {
  timestamp: number;
  frequency: number;
  mode: string;
  station: string;
  operator: string;
  callsign: string;
  class: string;
  section: string;
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;

export type IHumanReadableQSO = Overwrite<
  QSO,
  { timestamp: Date; frequency: string }
>;

export class HumanReadableQSO implements IHumanReadableQSO {
  timestamp: Date;
  station: string;
  operator: string;
  frequency: string;
  mode: string;
  callsign: string;
  class: string;
  section: string;

  static readonly headers: Record<keyof IHumanReadableQSO, string> = {
    timestamp: 'Timestamp',
    station: 'Station',
    operator: 'Operator',
    frequency: 'Frequency',
    mode: 'Mode',
    callsign: 'Callsign',
    class: 'Class',
    section: 'Section',
  };

  constructor(args?: IHumanReadableQSO, public document?: QSODocument) {
    this.timestamp = args?.timestamp ?? new Date();
    this.station = args?.station ?? '';
    this.operator = args?.operator ?? '';
    this.frequency = args?.frequency ?? '';
    this.mode = args?.mode ?? '';
    this.callsign = args?.callsign ?? '';
    this.class = args?.class ?? '';
    this.section = args?.section ?? '';
  }

  /**
   * Converts a frequency of the form '000.000.000' into an integer, in Hz
   * @param frequency - the frequency to convert
   */
  static frequencyToInt(frequency: string): number {
    return parseInt(frequency.replace(/\./g, ''));
  }

  frequencyToInt = HumanReadableQSO.frequencyToInt;

  asQSO(): QSO {
    return {
      timestamp: this.timestamp.getTime(),
      station: this.station,
      operator: this.operator,
      frequency: this.frequencyToInt(this.frequency),
      mode: this.mode.toUpperCase(),
      callsign: this.callsign.toUpperCase(),
      class: this.class.toUpperCase(),
      section: this.section.toUpperCase(),
    };
  }

  /**
   * Determine which band a frequency falls in
   * @param freq - the frequency to lookup. Either a number, in Hz, or
   *               a string of the form 000.000.000, also in Hz
   */
  band(): string | false {
    const bands = {
      '160 Meters': [1.8, 2.0],
      '80 Meters': [3.5, 4.0],
      '60 Meters': [5330.5, 5403.5],
      '40 Meters': [7.0, 7.3],
      '30 Meters': [10.1, 10.15],
      '20 Meters': [14.0, 14.35],
      '17 Meters': [18.068, 18.168],
      '15 Meters': [21.0, 21.45],
      '12 Meters': [24.89, 24.99],
      '10 Meters': [28, 29.7],
      '6 Meters': [50, 54],
      '2 Meters': [144, 148],
      '1.25 Meters': [222, 225],
      '70 Centimeters': [420, 450],
      '33 Centimeters': [902, 928],
      '23 Centimeters': [1240, 1300],
      '13 Centimeters': [2300, 2450],
      '3300-3500 MHz': [3300, 3500],
      '3 Centimeters': [10000.0, 10500.0],
    };

    const freqMHz = this.frequencyToInt(this.frequency) / 1000000;

    const maybeBand = Object.entries(bands).find(
      ([, [min, max]]) => freqMHz >= min && freqMHz <= max
    );
    if (maybeBand !== undefined) {
      return maybeBand[0];
    } else {
      return false;
    }
  }

  /**
   * Check if all properties are set
   * @todo better validation
   */
  isValid(): boolean {
    return !!(
      this.timestamp &&
      this.station.length > 0 &&
      this.operator.length > 0 &&
      this.frequency.length > 0 &&
      this.mode.length > 0 &&
      this.callsign.length > 0 &&
      this['class'].length > 0 &&
      this.section.length > 0
    );
  }

  formatCol(header: keyof IHumanReadableQSO) {
    const prop = this[header];
    if (prop instanceof Date) {
      return prop.toISOString();
    } else {
      return prop;
    }
  }
}

type IQSOMethods = {
  asHumanReadableQSO: () => HumanReadableQSO;
};

const QSOMethods: IQSOMethods = {
  asHumanReadableQSO: function (this: QSODocument): HumanReadableQSO {
    return new HumanReadableQSO(
      {
        ...this.toJSON(),
        timestamp: new Date(this.timestamp),
        frequency: this.frequency.toLocaleString('de-DE'),
      },
      this
    );
  },
};

export type QSODocument = RxDocument<QSO, IQSOMethods>;

const qsoSchema: RxJsonSchema<QSO> = {
  title: 'QSO',
  description: 'describes a QSO',
  version: 0,
  type: 'object',
  properties: {
    timestamp: { type: 'number' },
    station: { type: 'string' },
    operator: { type: 'string' },
    frequency: { type: 'number' },
    mode: { type: 'string' },
    callsign: { type: 'string' },
    class: { type: 'string' },
    section: { type: 'string' },
  },
  required: ['timestamp', 'callsign', 'class', 'section'],
};

export type QSOCollection = RxCollection<QSODocument>;
export type DBCollections = { qsos: QSOCollection };

export async function init_db(baseURL: string, db: string) {
  const myDatabase = await createRxDatabase<DBCollections>({
    name: db,
    adapter: 'idb', // IndexedDB
  });

  const qsoCollection = await myDatabase.collection<QSODocument>({
    name: 'qso',
    schema: qsoSchema,
    methods: QSOMethods,
  });

  qsoCollection.sync({
    remote: baseURL + db,
    options: {
      live: true,
      retry: true,
    },
  });

  return qsoCollection;
}
