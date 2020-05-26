<template>
  <div class="callsign-info">
    <button
      v-if="callData === null"
      :disabled="callsign === ''"
      @click="callsignLookup"
    >
      Lookup Callsign
    </button>

    <div v-else-if="callData.status === 'VALID'">
      <div>{{ callData.type }}</div>
      <div>
        Current: {{ callData.current.callsign }}
        {{ callData.current.operClass }}
      </div>
      <div>
        Previous: {{ callData.previous.callsign }}
        {{ callData.previous.operClass }}
      </div>
      <div v-show="callData.trustee.callsign !== ''">
        Trustee: {{ callData.trustee.callsign }} {{ callData.trustee.name }}
      </div>
      <div>Name: {{ callData.name }}</div>
      <div>
        Address:
        <div class="address">
          {{ callData.address.line1 }}
          <div>{{ callData.address.line2 }}</div>
        </div>
      </div>
      <div>
        Location: {{ callData.location.latitude }}/{{
          callData.location.longitude
        }}, {{ callData.location.gridsquare }}
      </div>
    </div>

    <div v-else-if="callData.status === 'INVALID'">
      Callsign "{{ callsign }}" is invalid!
    </div>
    <div v-else-if="callData.status === 'UPDATING'">
      Callook is updating, try again later.
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

import callook, { CallookLookup } from './Callook';

@Component
export default class CallsignLookup extends Vue {
  @Prop({ required: true }) readonly callsign!: string;

  callData: CallookLookup | null = null;

  /**
   * Look up the current callsign in Callook
   */
  async callsignLookup() {
    if (this.callsign !== '') {
      const callData = await callook(this.callsign);
      this.callData = callData;
    }
  }

  /**
   * Clear lookup when callsign changes
   */
  @Watch('callsign') onCallsignChanged(newCall, oldCall) {
    if (newCall !== oldCall) {
      this.callData = null;
    }
  }
}
</script>

<style>
.callsign-info {
  background-color: aliceblue;
  padding: 0.5em;
  border-radius: 0.5em;
}

.address {
  display: inline-block;
  vertical-align: top;
}
</style>
