var app = require('express').Router();
var Promise = require('bluebird');
var moment = require('moment');
var story = require('storyboard').mainStory;

var db = require('../../lib/db');
var middleware = require('../middleware');

/**
 * @apiDefine defaultResponse
 * @apiSuccess {String} context A string giving the type of the data-field.
 * @apiSuccess {String} time The current servertime.
 * @apiSuccess {Object[]} warnings An array of objects containing errors, which didn't let the request fail.
 * @apiSuccess {Boolean} cache indicates if the answer was delivered from cache
 */

/**
 * @apiDefine paginate
 * @apiParam {Number} [limit=100] Sets the limit of records returned.
 * @apiParam {Number} [offset] Offset to paginate through the list.
 * @apiSuccess {Number} [count] Giving the length of data if it's an array. Only present on paginated resources.
 * @apiSuccess {Number} [total] Giving the total number of objects available. Only present on paginated resources.
 * @apiSuccess {Object} [next] Giving some information for the next request on paginated resources. Only present on paginated resources.
 * @apiSuccess {Number} [next.offset] Gives the next offset.
 * @apiSuccess {Number} [next.link] Gives a link for the next page for paginated resources.
 *
 */

/**
 * @apiDefine optionalAuth
 * @apiHeader {String} [Authorization] Token to authenticate against the API. Is only used to determine ratelimits for this endpoint.
 */


/**
 * @api {get} /v1/stats Get current Stats
 * @apiName GetStats
 * @apiGroup Stats
 * @apiVersion 1.0.0
 * @apiUse defaultResponse
 * @apiUse optionalAuth
 * @apiDescription Returns current stats of Kitsune.
 * @apiSuccess {Object} data Object containing the stats.
 * @apiSuccess {Number} data.u Users Kitsune can see.
 * @apiSuccess {Number} data.g Guilds Kitsune is active in.
 * @apiSuccess {Number} data.m Messages Kitsune handles per second.
 * @apiSuccess {Number} data.c Channels Kitsune can see.
 */

app.get('/', middleware.deprecate('/v1.1/stats'), (req, res, next)=> {
    db.redis.exists('statscache').then(ex=> {
        if (ex === 0) {
            //noinspection JSUnresolvedFunction
            return Promise.all([
                db.models.Guild.count({where: {online: true}}),
                db.models.Guild.findAll({where: {online: true}}).then(guilds=> {
                    //noinspection JSUnresolvedFunction
                    return Promise.all(guilds.map(guild=>guild.getUsers().then(m=>Promise.resolve(m.length))));
                }).then(mCounts=> {
                    var c = 0;
                    for (var e of mCounts) {
                        c = e + c;
                    }
                    return Promise.resolve(c);
                }),
                db.models.Message.count({where: {created_at: {$gt: moment().subtract(1, 'minutes').toDate()}}}),
                db.models.Guild.findAll({where: {online: true}}).then(guilds=> {
                    //noinspection JSUnresolvedFunction
                    return Promise.all(guilds.map(guild=>guild.getChannels().then(chs=>Promise.resolve(chs.length))))
                }).then(channelCounts=> {
                    var c = 0;
                    for (var e of channelCounts) {
                        c = e + c;
                    }
                    return Promise.resolve(c);
                })
            ]).spread((g, u, m, c)=> {
                res.apijson({u, g, m, c}, {context: 'Object<Stats>', cache: false});
                //noinspection JSUnresolvedFunction
                return Promise.all([
                    db.redis.hset('statscache', 'g', g),
                    db.redis.hset('statscache', 'u', u),
                    db.redis.hset('statscache', 'm', m),
                    db.redis.hset('statscache', 'c', c),
                ]).then(()=> {
                    //noinspection JSUnresolvedFunction
                    return db.redis.expire('statscache', 1800);
                })
            })
        } else {
            //noinspection JSUnresolvedFunction
            return db.redis.hgetall('statscache').then(cache=> {
                res.apijson({
                    u: parseInt(cache.u),
                    g: parseInt(cache.g),
                    m: parseInt(cache.m),
                    c: parseInt(cache.c)
                }, {context: 'Object<Stats>', cache: true});
            })
        }
    }).catch((err)=> {
        story.warn('SQL', '', {attach: err});
        next({code: 5200});
    });
});

/**
 * @api {get} /v1/stats/uptime_test Endpoint for UptimeRobot to test the Api without consuming too much resources.
 * @apiName GetUptimeStatus
 * @apiGroup Stats
 * @apiVersion 1.0.0
 * @apiUse defaultResponse
 * @apiUse optionalAuth
 * @apiDescription Returns the current uptime status of the api.
 * @apiSuccess {Boolean} data True if up. Can also be false if in maintenance.
 */

app.get('/uptime_test', middleware.deprecate('/v1.1/stats/uptime_test'), (req, res)=> {
    res.apijson(true, {context: 'Boolean<Status>'});
});

app.head('/*', middleware.head());

module.exports = app;