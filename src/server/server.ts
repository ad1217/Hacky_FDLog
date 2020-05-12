import * as path from 'path';

import * as express from 'express';
import * as WebSocket from 'ws';
import * as expressWs from 'express-ws';

import * as Bundler from 'parcel-bundler';

import { createConnection } from 'typeorm';

import { QSO, isCompleteQSO } from '../QSO';
import QSOEntity from './QSOEntity';

const wsInstance = expressWs(express());
const app = wsInstance.app;

const PORT = process.env.PORT || 1234;

createConnection({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'fdlog',
  password: 'asdfasdf',
  database: 'fdlog',
  entities: [QSOEntity],
  synchronize: true, // TODO: remove in production
})
  .then(async (connection) => {
    const log = await QSOEntity.find();

    function broadcast(data: WebSocket.Data) {
      wsInstance.getWss().clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }

    function broadcastQSO(qso: QSO) {
      broadcast(JSON.stringify(qso));
    }

    app.ws('/ws', function (ws, _req) {
      ws.send(JSON.stringify(log));

      ws.on('message', (msg) => {
        if (typeof msg === 'string') {
          const qsoData = JSON.parse(msg) as Partial<QSO>;
          // TODO: do more validation
          if (isCompleteQSO(qsoData)) {
            console.log('Got QSO', qsoData);
            const qso = QSOEntity.fromQSOData(qsoData);
            log.push(qso);
            qso.save();
            broadcastQSO(qsoData);
          }
        }
      });
    });

    let bundler = new Bundler(path.join(__dirname, '../index.html'));
    app.use(bundler.middleware());

    app.listen(PORT);
  })
  .catch((error) => console.error(error));
