<template>
  <div>
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

    <div class="completions">
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
import fs from 'fs';
const superCheckPartial: string = fs.readFileSync('./src/MASUSVE.SCP', {
  encoding: 'UTF-8',
});

import { Vue, Component, Prop } from 'vue-property-decorator';
import { QSO, QSOHeaders, isCompleteQSO } from './QSO';

@Component
export default class QSOEntry extends Vue {
  @Prop({ required: true }) readonly log!: Readonly<QSO>[];
  readonly calls = superCheckPartial
    .split('\r\n')
    .filter((line) => !line.startsWith('#'));

  currentEntry: Partial<QSO> = {
    timestamp: new Date(),
    callsign: '',
    class_: '',
    section: '',
  };

  mounted() {
    window.setInterval(this.updateTime, 1000);
  }

  updateTime() {
    this.currentEntry.timestamp = new Date();
  }

  logQSO() {
    if (isCompleteQSO(this.currentEntry)) {
      // TODO: more robust serial numbering, some sort of deduplication
      this.currentEntry.serial = this.log.length;
      this.currentEntry.callsign = this.currentEntry.callsign.toUpperCase();
      this.$emit('logQSO', this.currentEntry);

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
.callsign-input {
  text-transform: uppercase;
}

.worked {
  background-color: lightblue;
}
</style>
