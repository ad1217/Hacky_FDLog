<template>
  <div>
    <svg class="websocket-indicator" viewBox="-5 -5 10 10">
      <circle :class="websocketState" r="5" />
    </svg>

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

    <div id="completions">
      <span
        v-for="call in completeCallsign"
        :key="call"
        :class="{ worked: stationWorked(call) }"
        @click="setCallsign(call)"
      >
        {{ call }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator';
import { QSO, QSOHeaders, isCompleteQSO } from './QSO';

import fs from 'fs';
const superCheckPartial = fs.readFileSync('./src/MASUSVE.SCP', {
  encoding: 'UTF-8',
});

@Component
export default class App extends Vue {
  readonly headers = QSOHeaders;
  readonly calls = superCheckPartial
    .split('\r\n')
    .filter((line) => !line.startsWith('#'));

  websocket: WebSocket = this.connectWebsocket();
  log: Readonly<QSO>[] = [];
  currentEntry: Partial<QSO> = {
    serial: 0,
    timestamp: new Date(),
  };

  websocketState: 'connected' | 'connecting' | 'closed' = 'closed';

  mounted() {
    window.setInterval(this.updateTime, 1000);
    this.connectWebsocket();
  }

  connectWebsocket() {
    this.websocket = new WebSocket(
      window.location.protocol === 'https'
        ? 'wss://'
        : 'ws://' + window.location.host + '/ws'
    );
    this.websocketState = 'connecting';
    this.websocket.addEventListener('message', this.handleWSMessage);
    this.websocket.addEventListener(
      'open',
      () => (this.websocketState = 'connected')
    );
    this.websocket.addEventListener('close', () => {
      this.websocketState = 'closed';
      // Try to reconnect every 5 seconds
      let interval = window.setTimeout(() => {
        window.clearInterval(interval);
        this.connectWebsocket();
      }, 5000);
    });

    return this.websocket;
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

  stationWorked(call: string): boolean {
    return this.log.find((entry) => entry.callsign === call) !== undefined;
  }

  setCallsign(call: string) {
    this.currentEntry.callsign = call;
  }

  get completeCallsign() {
    const search = this.currentEntry.callsign?.toUpperCase();
    if (search === undefined) return [];
    if (search.includes('*') || search.includes('?') || search.includes('.')) {
      const regex = RegExp(
        '^' + search.replace('*', '.+').replace('?', '.') + '$'
      );
      return this.calls.filter((call) => regex.test(call));
    } else {
      return this.calls.filter((call) => call.startsWith(search));
    }
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

.callsign-input {
  text-transform: uppercase;
}

.websocket-indicator {
  width: 1em;
  position: absolute;
  right: 0.5em;

  .closed {
    fill: red;
  }

  .connected {
    fill: green;
  }

  .connecting {
    fill: yellow;
  }
}

.worked {
  background-color: lightblue;
}
</style>
