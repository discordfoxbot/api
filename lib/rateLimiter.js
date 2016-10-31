var Limiter = require('rolling-rate-limiter'),
    Redis = require('redis');

var config = require('../config');

var limiterToken = Limiter({
    redis: Redis.createClient(config.db.redis),
    namespace: 'requestRateLimiter',
    interval: 60000,
    maxInInterval: 120
});

var limiterIP = Limiter({
    redis: Redis.createClient(config.db.redis),
    namespace: 'requestRateLimiter',
    interval: 60000,
    maxInInterval: 30
});

module.exports = {token: limiterToken, ip: limiterIP};