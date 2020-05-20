<template>
  <div>
    <span>#{{ log.length }}</span>
    <span>{{ currentEntry.timestamp.toISOString() }}</span>
    <form id="qso-form" @submit.prevent="logQSO">
      <div v-if="remoteTXConnected">
        <input
          required
          class="frequency-input"
          placeholder="Frequency"
          readonly
          size="10"
          :value="
            (remoteTX.VFOAFreq && remoteTX.VFOAFreq.toLocaleString('de-DE'))
          "
        />
        <input
          required
          class="mode-input"
          placeholder="Mode"
          readonly
          size="3"
          :value="(remoteTX.mode)"
        />
        <span> PWR:{{ remoteTX.RFPower }} </span>
      </div>
      <div v-else>
        <input
          required
          class="frequency-input"
          placeholder="Frequency"
          size="10"
          v-model="currentEntry.frequency"
        />
        <input
          required
          class="mode-input"
          placeholder="Mode"
          size="3"
          v-model="currentEntry.mode"
        />
      </div>

      <input
        required
        class="callsign-input"
        placeholder="Callsign"
        size="10"
        v-model="currentEntry.callsign"
      />
      <input
        required
        class="class-input"
        placeholder="Class"
        size="3"
        v-model="currentEntry['class']"
      />
      -
      <input
        required
        class="section-input"
        placeholder="Section"
        size="4"
        v-model="currentEntry.section"
      />
      <input type="submit" value="Log!" />
    </form>

    <div class="completions">
      <span
        v-for="call in completeCallsign"
        :key="call"
        class="completion"
        :class="{ worked: stationWorked(call) }"
        @click="setCallsign(call)"
      >
        {{ call }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import fs from 'fs';
const superCheckPartial: string = fs.readFileSync('./src/MASUSVE.SCP', {
  encoding: 'UTF-8',
});

import { Vue, Component, Prop } from 'vue-property-decorator';

import { DB_QSO, QSO, QSOHeaders, isQSOValid } from './QSO';
import RemoteTX from './RemoteTX';

function emptyQSO(): QSO {
  return {
    timestamp: new Date(),
    frequency: '',
    mode: '',
    callsign: '',
    class: '',
    section: '',
  };
}

@Component
export default class QSOEntry extends Vue {
  @Prop({ required: true }) readonly log!: Readonly<QSO>[];
  @Prop() readonly remoteTX?: RemoteTX;
  readonly calls = superCheckPartial
    .split('\r\n')
    .filter((line) => !line.startsWith('#'));

  currentEntry: QSO = emptyQSO();

  mounted() {
    window.setInterval(this.updateTime, 1000);
  }

  updateTime() {
    this.currentEntry.timestamp = new Date();
  }

  logQSO() {
    // TODO: better validation
    const qso = {
      ...this.currentEntry,
      timestamp: this.currentEntry.timestamp.getTime(),
      callsign: this.currentEntry.callsign.toUpperCase(),
      ...(this.remoteTX
        ? {
            frequency: this.remoteTX.VFOAFreq, // TODO: determine active VFO
            mode: this.remoteTX.mode,
          }
        : {
            frequency: parseInt(this.currentEntry.frequency.replace('.', '')),
          }),
    } as DB_QSO;
    if (isQSOValid(qso)) {
      this.$emit('logQSO', qso);
      // reset
      this.currentEntry = emptyQSO();
    } else {
      alert('Incomplete QSO submitted!');
    }
  }

  stationWorked(call: string): boolean {
    return this.log.find((entry) => entry.callsign === call) !== undefined;
  }

  setCallsign(call: string) {
    this.currentEntry.callsign = call;
  }

  get remoteTXConnected(): boolean {
    return (
      this.remoteTX !== undefined &&
      this.remoteTX.ws2ReadyState === WebSocket.OPEN
    );
  }

  get completeCallsign() {
    const search = this.currentEntry.callsign?.toUpperCase();
    if (search === undefined || search.length === 0) return [];
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
.callsign-input {
  text-transform: uppercase;
}

.completion {
  cursor: pointer;
  padding: 0.1em;
  border-radius: 0.3em;

  &:hover {
    background-color: lightgreen;
  }

  &.worked {
    background-color: lightblue;
  }
}
</style>
