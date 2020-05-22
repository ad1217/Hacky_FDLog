<template>
  <table class="qso-log">
    <tr>
      <th>#</th>
      <th v-for="header in Object.values(headers)" :key="header">
        {{ header }}
      </th>
    </tr>
    <QSOLogRow
      v-for="(qso, index) in log"
      :key="JSON.stringify(qso.document && qso.document.toJSON())"
      :index="index"
      :qso="qso"
    >
    </QSOLogRow>
  </table>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

import { HumanReadableQSO } from './QSO';

import QSOLogRow from './QSOLogRow.vue';

/**
 * A table of QSO log entries
 */
@Component({ components: { QSOLogRow } })
export default class QSOLog extends Vue {
  readonly headers = HumanReadableQSO.headers;
  @Prop({ required: true }) log!: Readonly<HumanReadableQSO>[];
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
