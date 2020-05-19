<template>
  <button
    class="indicator"
    :class="statusClass"
    :title="name + ': ' + statusClass"
  >
    {{ latency || '&nbsp;' }}
  </button>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';

@Component
export default class Indicator extends Vue {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) status!: boolean | number;
  @Prop() latency?: number;

  get statusClass() {
    // WebSocket readyState
    if (typeof this.status === 'number') {
      switch (this.status) {
        case WebSocket.OPEN:
          return 'open';
        case WebSocket.CONNECTING:
          return 'connecting';
        case WebSocket.CLOSING:
          return 'closing';
        case WebSocket.CLOSED:
          return 'closed';
        default:
          return 'unknown';
      }
    }
    // boolean connected/disconnected
    else {
      return this.status ? 'connected' : 'disconnected';
    }
  }
}
</script>

<style lang="scss">
.indicator {
  border-radius: 50%;
  padding: 0.2em;
  width: 2em;
  height: 2em;
  color: black;

  /* unknown state */
  background-color: mediumpurple;

  &.connected,
  &.open {
    background-color: green;
    color: #eee;
  }

  &.connecting {
    background-color: yellow;
  }

  &.disconnected,
  &.closing,
  &.closed {
    background-color: red;
  }
}
</style>
