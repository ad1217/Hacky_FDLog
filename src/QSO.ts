export interface QSO {
  serial: number;
  timestamp: Date;
  callsign: string;
  class_: string;
  section: string;
}

export const QSOHeaders: Record<keyof QSO, string> = {
  serial: 'Serial',
  timestamp: 'Timestamp',
  callsign: 'Callsign',
  class_: 'Class',
  section: 'Section',
};

export function isCompleteQSO(qso: Partial<QSO>): qso is QSO {
  return (Object.keys(QSOHeaders) as (keyof QSO)[]).every(
    (header: keyof QSO) => qso[header] !== undefined
  );
}
