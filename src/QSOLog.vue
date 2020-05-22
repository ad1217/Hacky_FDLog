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
        {{ qso.formatCol(header) }}
      </td>
    </tr>
  </table>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

import { IHumanReadableQSO, HumanReadableQSO } from './QSO';

@Component
export default class QSOLog extends Vue {
  readonly headers = HumanReadableQSO.headers;
  @Prop({ required: true }) log!: Readonly<HumanReadableQSO>[];

  get qsoKeys() {
    return Object.keys(this.headers) as (keyof IHumanReadableQSO)[];
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
