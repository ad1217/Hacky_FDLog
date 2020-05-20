<template>
  <div>
    <span>#{{ log.length }}</span>
    <span>{{ currentEntry.timestamp.toISOString() }}</span>
    <form
      class="qso-form"
      :class="{ dupe: dupes.length > 0 }"
      @submit.prevent="logQSO"
    >
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

    <div v-if="dupes.length > 0">
      DUPES:
      <QSOLog :log="dupes"></QSOLog>
    </div>

    <div class="completions">
      <span
        v-for="call in callsignCompletions"
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

import QSOLog from './QSOLog.vue';

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

@Component({ components: { QSOLog } })
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
      ...this.activeQSO,
      frequency: this.frequencyToInt(this.activeQSO.frequency),
      timestamp: this.activeQSO.timestamp.getTime(),
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

  frequencyToInt(frequency: string): number {
    return parseInt(frequency.replace(/\./g, ''));
  }

  band(freq: number | string) {
    const bands = {
      '160 Meters': [1.8, 2.0],
      '80 Meters': [3.5, 4.0],
      '60 Meters': [5330.5, 5403.5],
      '40 Meters': [7.0, 7.3],
      '30 Meters': [10.1, 10.15],
      '20 Meters': [14.0, 14.35],
      '17 Meters': [18.068, 18.168],
      '15 Meters': [21.0, 21.45],
      '12 Meters': [24.89, 24.99],
      '10 Meters': [28, 29.7],
      '6 Meters': [50, 54],
      '2 Meters': [144, 148],
      '1.25 Meters': [222, 225],
      '70 Centimeters': [420, 450],
      '33 Centimeters': [902, 928],
      '23 Centimeters': [1240, 1300],
      '13 Centimeters': [2300, 2450],
      '3300-3500 MHz': [3300, 3500],
      '3 Centimeters': [10000.0, 10500.0],
    };

    if (typeof freq === 'string') {
      freq = this.frequencyToInt(freq);
    }
    const freqMHz = freq / 1000000;

    const maybeBand = Object.entries(bands).find(
      ([, [min, max]]) => freqMHz >= min && freqMHz <= max
    );
    if (maybeBand !== undefined) {
      return maybeBand[0];
    } else {
      return false;
    }
  }

  // Merge current entry and other data sources to get the current QSO
  get activeQSO(): QSO {
    return {
      ...this.currentEntry,
      callsign: this.currentEntry.callsign.toUpperCase(),
      ...(this.remoteTXConnected
        ? {
            // TODO: determine active VFO
            frequency: this.remoteTX.VFOAFreq?.toLocaleString('de-DE'),
            mode: this.remoteTX.mode,
          }
        : {
            frequency: this.currentEntry.frequency,
          }),
    };
  }

  get dupes(): QSO[] {
    return this.log.filter(
      (qso) =>
        qso.callsign === this.activeQSO.callsign &&
        qso.mode === this.activeQSO.mode &&
        this.band(qso.frequency) === this.band(this.activeQSO.frequency)
    );
  }

  get callsignCompletions(): string[] {
    const search = this.activeQSO.callsign.toUpperCase();
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
.qso-form.dupe {
  background-color: red;
}

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
