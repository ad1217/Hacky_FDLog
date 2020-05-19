<template>
  <div>
    <div class="indicators">
      <Indicator name="CouchDB" :status="isOnline"> </Indicator>
    </div>

    <table id="qso-log">
      <tr>
        <th>#</th>
        <th v-for="header in Object.values(headers)" :key="header">
          {{ header }}
        </th>
      </tr>
      <tr class="qso" v-for="(qso, idx) in log" :key="idx">
        <td>{{ idx }}</td>
        <td v-for="header in Object.keys(headers)" :key="header">
          {{ qso[header] }}
        </td>
      </tr>
    </table>

    <QSOEntry :log="log" @logQSO="submitQSO" />
  </div>
</template>

<script lang="ts">
import 'reflect-metadata';
import { Vue, Component, Watch } from 'vue-property-decorator';
import { RxReplicationState } from 'rxdb';

import {
  couchDBRemote,
  QSO,
  DB_QSO,
  QSOHeaders,
  QSOCollection,
  init_db,
} from './QSO';
import QSOEntry from './QSOEntry.vue';
import Indicator from './Indicator.vue';

@Component({ components: { QSOEntry, Indicator } })
export default class App extends Vue {
  readonly headers = QSOHeaders;
  qsoCollection?: QSOCollection;
  isOnline: boolean = false;

  log: Readonly<QSO>[] = [];

  async mounted() {
    this.qsoCollection = await init_db();
    this.qsoCollection.find().$.subscribe((results) => {
      this.log = results
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(
          (result): QSO => {
            return {
              ...result.toJSON(),
              timestamp: new Date(result.timestamp),
            };
          }
        );
    });

    // Periodically check if CouchDB is availible
    window.setInterval(() => {
      fetch(couchDBRemote, { method: 'HEAD' })
        .then(() => (this.isOnline = true))
        .catch(() => (this.isOnline = false));
    }, 1000);
  }

  submitQSO(qso: DB_QSO) {
    this.qsoCollection?.insert(this.qsoCollection.newDocument(qso));
  }
}
</script>

<style lang="scss">
#qso-log {
  border: 1px solid black;
  margin-bottom: 1em;

  tr:nth-child(odd) {
    background-color: #b0b0b0;
  }
}

.indicators {
  position: absolute;
  right: 0.5em;
}
</style>
