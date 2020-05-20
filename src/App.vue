<template>
  <div>
    <div class="indicators">
      <Indicator name="CouchDB" :status="isOnline"> </Indicator>
      <Indicator
        name="RemoteTX Radio"
        :status="remoteTX.ws2ReadyState"
        :latency="remoteTX.latency"
      >
      </Indicator>
    </div>

    <QSOLog :log="log"></QSOLog>

    <QSOEntry :log="log" :remoteTX="remoteTX" @logQSO="submitQSO"> </QSOEntry>
  </div>
</template>

<script lang="ts">
import 'reflect-metadata';
import { Vue, Component, Watch } from 'vue-property-decorator';
import { RxReplicationState } from 'rxdb';

import { couchDBRemote, QSO, DB_QSO, QSOCollection, init_db } from './QSO';
import RemoteTX from './RemoteTX';

import Indicator from './Indicator.vue';
import QSOLog from './QSOLog.vue';
import QSOEntry from './QSOEntry.vue';

@Component({ components: { Indicator, QSOLog, QSOEntry } })
export default class App extends Vue {
  qsoCollection?: QSOCollection;
  isOnline: boolean = false;
  remoteTX = new RemoteTX('w1hs.remotetx.net');

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
              frequency: result.frequency.toLocaleString('de-DE'),
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
.indicators {
  position: absolute;
  right: 0.5em;
}
</style>
