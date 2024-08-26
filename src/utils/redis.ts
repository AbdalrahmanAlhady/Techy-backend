import Redis from "ioredis";

export const redis = new Redis({
  host: "0.0.0.0",
  port: 6379,
});
