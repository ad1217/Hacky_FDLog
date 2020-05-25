<template>
  <div>
    <span>#{{ log.length }}</span>
    <span>{{ currentEntry.timestamp.toISOString() }}</span>
    <form
      class="qso-form"
      :class="{ dupe: dupes.length > 0, inconsistent: inconsistent.length > 0 }"
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

    <div v-if="inconsistent.length > 0">
      INCONSISTENT:
      <QSOLog :log="inconsistent"></QSOLog>
    </div>

    <div class="completions">
      <span
        v-for="call in callsignCompletions"
        :key="call"
        class="completion"
        :class="{ worked: stationWorked(call) }"
        @click="currentEntry.callsign = call"
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

import { QSO, HumanReadableQSO } from './QSO';
import RemoteTX from './RemoteTX';

import QSOLog from './QSOLog.vue';

export type StationInfo = Pick<HumanReadableQSO, 'station' | 'operator'>;

@Component({ components: { QSOLog } })
export default class QSOEntry extends Vue {
  @Prop({ required: true }) readonly log!: Readonly<HumanReadableQSO>[];
  @Prop({ required: true }) readonly stationInfo!: StationInfo;
  @Prop() readonly remoteTX?: RemoteTX;
  readonly calls = superCheckPartial
    .split('\r\n')
    .filter((line) => !line.startsWith('#'));

  currentEntry = new HumanReadableQSO();

  mounted() {
    window.setInterval(this.updateTime, 1000);
  }

  /**
   * Update the current time
   */
  updateTime() {
    this.currentEntry.timestamp = new Date();
  }

  /**
   * Convert the active QSO entry to a {@link QSO}, and emit an event
   * for the parent component to log it
   */
  logQSO() {
    const qso = this.activeQSO;
    if (qso.isValid()) {
      console.log(qso.asQSO());
      this.$emit('logQSO', qso.asQSO());
      // reset, preserving frequency and mode
      this.currentEntry = new HumanReadableQSO({
        frequency: this.currentEntry.frequency,
        mode: this.currentEntry.mode,
      });
    } else {
      alert('Incomplete QSO submitted!');
    }
  }

  /**
   * Check if a callsign exists in the log
   * @param call - the callsign to check
   */
  stationWorked(call: string): boolean {
    return this.log.find((entry) => entry.callsign === call) !== undefined;
  }

  /**
   * Is the RemoteTX websocket connected?
   */
  get remoteTXConnected(): boolean {
    return this.remoteTX?.ws2ReadyState === WebSocket.OPEN;
  }

  /**
   * Merge current entry and other data sources to get the current QSO
   */
  get activeQSO(): HumanReadableQSO {
    return new HumanReadableQSO({
      ...this.currentEntry,
      ...this.stationInfo,
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
    });
  }

  /**
   * Find QSOs in the log that have the same callsign, band, and mode
   */
  get dupes(): HumanReadableQSO[] {
    return this.log.filter(
      (qso) =>
        qso.callsign === this.activeQSO.callsign &&
        qso.mode === this.activeQSO.mode &&
        qso.band() === qso.band()
    );
  }

  /**
   * Find QSOs in the log that have the same callsign, but differ in
   * either class or section
   */
  get inconsistent(): HumanReadableQSO[] {
    return this.log.filter(
      (qso) =>
        qso.callsign === this.activeQSO.callsign &&
        (qso.class !== this.activeQSO.class ||
          qso.section !== this.activeQSO.section)
    );
  }

  /**
   * Lookup the current partial callsign/search term in Super Check Partial.
   *
   * Uses regexes if certain characters exist: '*' becomes '.*', and a
   * '.' or '?' become '.'
   */
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
.qso-form {
  &.dupe {
    background-color: red;
  }
  &.inconsistent {
    background-color: yellow;
  }
}

.callsign-input,
.class-input,
.mode-input,
.section-input {
  text-transform: uppercase;

  &::placeholder {
    text-transform: none;
  }
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
