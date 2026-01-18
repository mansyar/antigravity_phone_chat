export const config = {
  CDP_PORTS: [9000, 9001, 9002, 9003],
  POLL_INTERVAL: 1000, // 1 second
  CDP_CALL_TIMEOUT: 30000, // 30 seconds timeout
  SERVER_PORT: process.env.PORT ? parseInt(process.env.PORT) : 3030,
};
