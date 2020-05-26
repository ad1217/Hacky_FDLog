<template>
  <div>
    <div class="indicators">
      <Indicator name="CouchDB" :status="isOnline"> </Indicator>
      <Indicator
        name="RemoteTX Radio"
        :status="remoteTX && remoteTX.ws2ReadyState"
        :latency="remoteTX && remoteTX.latency"
      >
      </Indicator>
      <div>
        <select class="remoteTXSelector" v-model="selectedRemoteTXDomain">
          <option :value="null">No RemoteTX Selected</option>
          <option
            v-for="(domain, name) in remoteTXDomains"
            :key="domain"
            :value="domain"
          >
            {{ name }}
          </option>
        </select>
      </div>

      <div class="station-info">
        <div>
          <label>
            Operator:
            <input
              required
              placeholder="Ex. KC1GDW"
              size="10"
              v-model="stationInfo.operator"
              @change="onStationInfoChange"
            />
          </label>
        </div>
        <div>
          <label>
            Station:
            <input
              required
              placeholder="Ex. Desktop"
              size="10"
              v-model="stationInfo.station"
              @change="onStationInfoChange"
            />
          </label>
        </div>
      </div>
    </div>

    <QSOLog :log="log"></QSOLog>

    <QSOEntry
      :log="log"
      :stationInfo="stationInfo"
      :remoteTX="remoteTX"
      @logQSO="submitQSO"
    >
    </QSOEntry>

    <Scoring :log="log"></Scoring>
  </div>
</template>

<script lang="ts">
import 'reflect-metadata';
import { Vue, Component, Watch } from 'vue-property-decorator';
import { RxReplicationState } from 'rxdb';

import { couchDBRemote, remoteTXDomains } from '../config';
import { QSO, HumanReadableQSO, QSOCollection, init_db } from './QSO';
import RemoteTX from './RemoteTX';

import Indicator from './Indicator.vue';
import QSOLog from './QSOLog.vue';
import QSOEntry, { StationInfo } from './QSOEntry.vue';
import Scoring from './Scoring.vue';

@Component({ components: { Indicator, QSOLog, QSOEntry, Scoring } })
export default class App extends Vue {
  qsoCollection?: QSOCollection | null = null;
  isOnline: boolean = false;

  stationInfo: StationInfo =
    JSON.parse(localStorage.getItem('stationInfo')) ?? {};

  remoteTXDomains = remoteTXDomains;
  selectedRemoteTXDomain: string | null = localStorage.getItem(
    'selectedRemoteTXDomain'
  );
  remoteTX: RemoteTX | null = null;

  log: Readonly<HumanReadableQSO>[] = [];

  async mounted() {
    this.maybeOpenRemoteTX();

    this.qsoCollection = await init_db(couchDBRemote.baseURL, couchDBRemote.db);
    this.qsoCollection.find().$.subscribe((results) => {
      this.log = results
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((r) => r.asHumanReadableQSO());
    });

    // Periodically check if CouchDB is availible
    window.setInterval(() => {
      fetch(couchDBRemote.baseURL, { method: 'HEAD' })
        .then(() => (this.isOnline = true))
        .catch(() => (this.isOnline = false));
    }, 1000);
  }

  submitQSO(qso: QSO) {
    this.qsoCollection?.newDocument(qso).save();
  }

  onStationInfoChange() {
    localStorage.setItem('stationInfo', JSON.stringify(this.stationInfo));
  }

  maybeOpenRemoteTX() {
    if (this.remoteTX) {
      this.remoteTX.close();
    }

    if (this.selectedRemoteTXDomain) {
      this.remoteTX = new RemoteTX(this.selectedRemoteTXDomain);
    } else {
      this.remoteTX = null;
    }
  }

  @Watch('selectedRemoteTXDomain') onselectedRemoteTXDomainUpdate(val: string) {
    if (val === null) {
      localStorage.removeItem('selectedRemoteTXDomain');
    } else {
      localStorage.setItem('selectedRemoteTXDomain', val);
    }
    this.maybeOpenRemoteTX();
  }
}
</script>

<style lang="scss">
.indicators {
  position: absolute;
  right: 0.5em;
  text-align: right;
}
</style>
