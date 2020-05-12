<template>
  <div>
    <table id="qso-log">
      <tr>
        <th v-for="header in Object.values(headers)" :key="header">
          {{ header }}
        </th>
      </tr>
      <tr class="qso" v-for="qso in log" :key="qso.serial">
        <td v-for="header in Object.keys(headers)" :key="header">
          {{ qso[header] }}
        </td>
      </tr>
    </table>
    <span>#{{ log.length }}</span>
    <span>{{ currentEntry.timestamp.toISOString() }}</span>
    <form id="qso-form" @submit.prevent="logQSO">
      <input
        required
        class="callsign-input"
        placeholder="Callsign"
        v-model="currentEntry.callsign"
      />
      <input
        required
        class="class-input"
        placeholder="Class"
        v-model="currentEntry.class_"
      />
      -
      <input
        required
        class="section-input"
        placeholder="Section"
        v-model="currentEntry.section"
      />
      <input type="submit" value="Log!" />
    </form>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { QSO, QSOHeaders, isCompleteQSO } from './QSO';

@Component
export default class App extends Vue {
  websocket = new WebSocket(
    window.location.protocol === 'https'
      ? 'wss://'
      : 'ws://' + window.location.host + '/ws'
  );
  readonly headers = QSOHeaders;
  log: Readonly<QSO>[] = [];
  currentEntry: Partial<QSO> = {
    serial: 0,
    timestamp: new Date(),
  };

  mounted() {
    window.setInterval(this.updateTime, 1000);
    this.websocket.addEventListener('message', this.handleWSMessage);
  }

  handleWSMessage(ev: MessageEvent) {
    const data = JSON.parse(ev.data);
    console.log(data);
    if (data instanceof Array) {
      this.log = data;
    } else {
      this.log.push(data);
    }
    this.currentEntry.serial = this.log.length;
  }

  updateTime() {
    this.currentEntry.timestamp = new Date();
  }

  logQSO() {
    if (isCompleteQSO(this.currentEntry)) {
      this.currentEntry.callsign = this.currentEntry.callsign.toUpperCase();
      this.websocket.send(JSON.stringify(this.currentEntry));

      // reset
      this.currentEntry = {
        serial: this.log.length,
        timestamp: new Date(),
      };
    } else {
      console.error('Incomplete QSO submitted!');
    }
  }
}
</script>

<style>
#qso-log {
  border: 1px solid black;
  margin-bottom: 1em;
}

.callsign-input {
  text-transform: uppercase;
}
</style>
