import Redis from "ioredis"

const redisHost = process.env.REDIS_HOST
const redisPortRaw = process.env.REDIS_PORT
const redisPort = Number.parseInt(redisPortRaw ?? "", 10)

if (!redisHost) {
    throw new Error("REDIS_HOST is not defined")
}

if (!Number.isInteger(redisPort) || redisPort < 0 || redisPort > 65535) {
    throw new Error(`REDIS_PORT is invalid: ${redisPortRaw ?? "undefined"}`)
}

const redis = new(Redis as any)({
    host: redisHost,
    port: redisPort,
    password: process.env.REDIS_PASSWORD
})

redis.on("connect", () => {
    console.log("Server is connected to redis")
})

redis.on("error", (err: Error) => {
    console.error(err)
})

export default redis