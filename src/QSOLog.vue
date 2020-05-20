<template>
  <table class="qso-log">
    <tr>
      <th>#</th>
      <th v-for="header in Object.values(headers)" :key="header">
        {{ header }}
      </th>
    </tr>
    <tr class="qso" v-for="(qso, idx) in log" :key="idx">
      <td>{{ idx }}</td>
      <td v-for="header in qsoKeys" :key="header">
        {{ formatCol(qso, header) }}
      </td>
    </tr>
  </table>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

import { QSO, QSOHeaders } from './QSO';

@Component
export default class QSOLog extends Vue {
  readonly headers = QSOHeaders;
  @Prop({ required: true }) log!: Readonly<QSO>[];

  formatCol(qso: QSO, header: keyof QSO) {
    const prop = qso[header];
    if (prop instanceof Date) {
      return prop.toISOString();
    } else {
      return prop;
    }
  }

  get qsoKeys() {
    return Object.keys(this.headers) as (keyof QSO)[];
  }
}
</script>
<style lang="scss">
.qso-log {
  border: 1px solid black;
  margin-bottom: 1em;

  tr:nth-child(odd) {
    background-color: #b0b0b0;
  }
}
</style>
