var app = require('express').Router();

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
 * @api {get} /v1/
 * @apiName Index
 * @apiGroup Index
 * @apiVersion 1.0.0
 * @apiUse optionalAuth
 * @apiDescription Returns a list of all major routes.
 * @apiSuccess {Object} data Object containing all the routes.
 * @apiSuccess {String} data.msg A little welcome-message.
 * @apiSuccess {Object} data.endpoints Objects containing all routes.
 */

app.get('/', (req, res)=> {
    res.apijson({
        msg: 'Welcome to Kitsune-Api V1.',
        endpoints: {
            characters: 'https://kitsune.fuechschen.org/api/v1/characters',
            chatlogs: 'https://kitsune.fuechschen.org/api/v1/chatlogs',
            guilds: 'https://kitsune.fuechschen.org/api/v1/guilds',
            stats: 'https://kitsune.fuechschen.org/api/v1/stats',
            uptime_test: 'https://kitsune.fuechschen.org/api/v1/stats/uptime_test',
            vcsfeeds: 'https://kitsune.fuechschen.org/api/v1/vcsfeeds'
        }
    })
});

module.exports = app;