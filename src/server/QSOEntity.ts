import { QSO } from '../QSO';

import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export default class QSOEntity extends BaseEntity implements QSO {
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
