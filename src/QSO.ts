import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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

@Entity()
export class QSOEntity extends BaseEntity implements QSO {
  static fromQSOData(qsoData: QSO) {
    return Object.assign(new this(), qsoData);
  }

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  serial!: number;
  @Column()
  timestamp!: Date;
  @Column()
  callsign!: string;
  @Column()
  class_!: string;
  @Column()
  section!: string;
}

export function isCompleteQSO(qso: Partial<QSO>): qso is QSO {
  return (Object.keys(QSOHeaders) as (keyof QSO)[]).every(
    (header: keyof QSO) => qso[header] !== undefined
  );
}
