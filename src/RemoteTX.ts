// TODO: make dynamic
const radioSettings = {
  cmd: 'setRadioConnSettings',
  RadioConnSettings: {
    port: 'ttyUSB0',
    baudrate: 115200,
    contrAddr: 'E0',
    radioAddr: '94',
  },
};

export default class RemoteTX {
  ws2: WebSocket;
  VFOAFreq: number | null = null;
  VFOBFreq: number | null = null;
  mode: string | null = null;
  latency: number | null = null;
  RFPower: number | null = null;
  ws2ReadyState: number = WebSocket.CLOSED; // keep in sync with websocket

  constructor(readonly host: string) {
    this.ws2 = this.connectWebsocket();

    window.setInterval(() => this.periodicPoll(), 2000);
  }

  connectWebsocket() {
    this.ws2 = new WebSocket('wss://' + this.host + '/ws2');
    this.ws2ReadyState = this.ws2.readyState;
    this.ws2.addEventListener('message', (ev) => this.handleMessage(ev));
    this.ws2.addEventListener('open', () => {
      this.ws2ReadyState = this.ws2.readyState;
      this.ws2.send(JSON.stringify(radioSettings));
    });

    this.ws2.addEventListener('close', () => {
      this.ws2ReadyState = this.ws2.readyState;
      // Try to reconnect every 5 seconds
      let interval = window.setTimeout(() => {
        window.clearInterval(interval);
        this.connectWebsocket();
      }, 5000);
    });
    return this.ws2;
  }

  close() {
    this.ws2.close();
  }

  periodicPoll() {
    const commands = [
      '10', //Mode
      '12', // VFO A Frequency
      '16', // VFO B Frequency
      '26', // RF Power
    ];

    if (this.ws2.readyState == WebSocket.OPEN) {
      commands.forEach((c) => this.ws2.send(JSON.stringify([c, 0])));
    }
  }

  parseFreq(freqString: string) {
    return parseInt(freqString);
  }

  handleMessage(ev: MessageEvent) {
    const data = JSON.parse(ev.data);

    // WebSocket latency
    if (data[0] === 'WSLatency') {
      this.latency = parseInt(data[3]);
    }

    // Mode
    else if (data[0] === '10') {
      this.mode = data[3];
    }

    // VFO A/B Frequency
    else if (data[0] == '12') this.VFOAFreq = this.parseFreq(data[3]);
    else if (data[0] == '16') this.VFOBFreq = this.parseFreq(data[3]);
    // RF Power
    else if (data[0] === '26') {
      this.RFPower = parseInt(data[3]);
    } else {
      console.log(data);
    }
  }
}
