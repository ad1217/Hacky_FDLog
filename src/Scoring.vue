<template>
  <div>
    <table>
      <tr>
        <th>Type</th>
        <th>QSOs</th>
        <th>Score</th>
      </tr>
      <tr v-for="(count, qsoType) in qsoCountByType" :key="qsoType">
        <td>{{ qsoType }}</td>
        <td>{{ count }}</td>
        <td>{{ (qsoValues[qsoType] || 0) * count }}</td>
      </tr>
      <tr>
        <td>All</td>
        <td>{{ log.length }}</td>
        <td>{{ totalScore }}</td>
      </tr>
    </table>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

import { HumanReadableQSO } from './QSO';

@Component
export default class Scoring extends Vue {
  @Prop({ required: true }) log!: Readonly<HumanReadableQSO>[];

  readonly qsoValues = <const>{
    phone: 1,
    CW: 2,
    digital: 2,
  };

  readonly qsoTypes: Record<keyof Scoring['qsoValues'], Readonly<string[]>> = <
    const
  >{
    phone: ['AM', 'FM', 'SSB', 'LSB', 'USB'],
    CW: ['CW'],
    digital: [
      'FT4',
      'FT8',
      'JT65',
      'JT9',
      'PSK31',
      'QPSK31',
      'PSK63',
      'QPSK63',
      'RTTY',
    ],
  };

  /**
   * Get the number of QSOs for each type
   */
  get qsoCountByType(): Record<keyof Scoring['qsoValues'] | 'unknown', number> {
    return this.log.reduce(
      (acc, qso) => {
        const qsoType =
          (Object.keys(
            this.qsoTypes
          ) as (keyof Scoring['qsoValues'])[]).find((t) =>
            this.qsoTypes[t].includes(qso.mode)
          ) ?? 'unknown';
        acc[qsoType] += 1;
        return acc;
      },
      { phone: 0, CW: 0, digital: 0, unknown: 0 }
    );
  }

  /**
   * Get the total score
   */
  get totalScore() {
    const qsos = this.qsoCountByType;
    return Object.entries(this.qsoValues)
      .map(([qsoType, score]) => qsos[qsoType] * score)
      .reduce((acc, cur) => acc + cur);
  }
}
</script>
