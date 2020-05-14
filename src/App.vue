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

    <QSOEntry :log="log" @logQSO="submitQSO" />
  </div>
</template>

<script lang="ts">
import 'reflect-metadata';
import { Vue, Component, Watch } from 'vue-property-decorator';
import { QSO, QSOHeaders, isCompleteQSO } from './QSO';

import QSOEntry from './QSOEntry.vue';

@Component({ components: { QSOEntry } })
export default class App extends Vue {
  readonly headers = QSOHeaders;

  websocket: WebSocket = this.connectWebsocket();
  log: Readonly<QSO>[] = [];

  websocketState: 'connected' | 'connecting' | 'closed' = 'closed';

  mounted() {
    this.connectWebsocket();
  }

  connectWebsocket() {
    this.websocket = new WebSocket(
      (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
        window.location.host +
        '/ws'
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

  submitQSO(qso: QSO) {
    this.websocket.send(JSON.stringify(qso));
  }

  handleWSMessage(ev: MessageEvent) {
    const data = JSON.parse(ev.data);
    console.log(data);
    if (data instanceof Array) {
      this.log = data;
    } else {
      this.log.push(data);
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
</style>
