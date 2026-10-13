import pino from 'pino';

import { env } from '../config/env.js';

export const logger = pino({
  name: 'mayu',
  level: env.LOG_LEVEL,
  base: {
    service: 'mayu',
    environment: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});
