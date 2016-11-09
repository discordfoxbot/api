var Limiter = require('rolling-rate-limiter'),
    Redis = require('redis');

var config = require('../config');

class Ratelimits {
    constructor() {
        this._limiter = {};
        this._redisClient = Redis.createClient(config.db.redis);
    }

    get ip() {
        return this.get({limit: 30});
    }

    get token() {
        return this.get({limit: 120});
    }

    get(options = {}) {
        if (!options.limit)options.limit = 30;
        if (!options.interval)options.interval = 60000;
        if (!options.route)options.route = '_';

        if (this._limiter[`${options.limit}:${options.interval}:${options.route}`])return this._limiter[`${options.limit}:${options.interval}:${options.route}`];

        return this._limiter[`${options.limit}:${options.interval}:${options.route}`] = Limiter({
            redis: this._redisClient,
            namespace: `requestRateLimiter:${options.limit}:${options.interval}:${options.route}:`,
            interval: options.interval,
            maxInInterval: options.limit
        })
    }
}

module.exports = new Ratelimits();