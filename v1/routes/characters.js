var app = require('express').Router();
var story = require('storyboard').mainStory;
var Promise = require('bluebird');

var db = require('../../lib/db');
var middleware = require('../middleware');

/**
 * @apiDefine defaultResponse
 * @apiSuccess {String} context A string giving the type of the data-field.
 * @apiSuccess {String} time The current servertime.
 * @apiSuccess {Object[]} warnings An array of objects containing errors, which didn't let the request fail.
 * @apiSuccess {Boolean} cache indicates if the answer was delivered from cache
 * @apiSuccess {Number} cache_expire indicates when the apicache will expire in seconds (only present if cache is true). If you want new data, do not make a new request before this period has passed
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
 * @api {get} /v1/characters Get all characters as list
 * @apiName GetCharacters
 * @apiGroup Characters
 * @apiVersion 1.0.0
 * @apiUse defaultResponse
 * @apiUse paginate
 * @apiUse optionalAuth
 * @apiParam {String} [type] Specify the character type. Currently only 'waifu' or 'husbando'
 * @apiDescription Gets all characters as a paginated list.
 * @apiSuccess {Object[]} data Array containing character-objects
 */

app.get('/', middleware.query(), (req, res, next)=> {
    /** @namespace req.query.pic_verified */
    var where = undefined;
    if (req.query.type !== undefined) {
        where = where || {};
        where.type = req.query.type;
    }
    if (req.query.source !== undefined) {
        where = where || {};
        where.source = req.query.source;
    }
    db.models.Character.findAndCountAll({
        where: where,
        limit: req.parsed_query.limit,
        offset: req.parsed_query.offset,
        order: [['id', 'ASC']]
    }).then((result)=> {
        return Promise.all(result.rows.map((character)=> {
            var q = {verified: true};
            if (req.query.pic_verified !== undefined) {
                if (['true', 'false'].indexOf(req.query.pic_verified)) { //noinspection JSValidateTypes
                    q.verified = req.query.pic_verified !== 'false';
                }
                else q = undefined;
            }
            //noinspection JSUnresolvedFunction
            return character.getCharacterPictures({where: q});
        })).then((pictures)=> {
            res.apijson(result.rows.map((row)=> {
                return {
                    id: row.id,
                    name: row.name,
                    source: row.source,
                    type: row.type,
                    pictures: pictures[result.rows.indexOf(row)].map((picture)=> {
                        return picture.link
                    })
                };
            }), {
                total: result.count,
                offset: req.parsed_query.offset || 0,
                next: (result.rows.length < req.parsed_query.limit || result.count === req.parsed_query.limit + req.parsed_query.offset) ? null : {
                    offset: req.parsed_query.offset + req.parsed_query.limit,
                    link: req.protocol + '://' + req.hostname + req.baseUrl + req.path + function () {
                        var ret = '?';
                        if (req.query.type !== undefined)ret += 'type=' + req.query.type + '&';
                        if (req.parsed_query.limit !== 25)ret += 'limit=' + req.parsed_query.limit + '&';
                        ret += 'offset=' + (req.parsed_query.offset + req.parsed_query.limit);
                        return ret;
                    }()
                },
                context: 'Array<Character>'
            })
        });
    }).catch((err)=> {
        next({code: 5200});
        story.warn('SQL-Error', '', {attach: err});
    });
});

/**
 * @api {get} /v1/characters/:id Get a character
 * @apiName GetCharacter
 * @apiGroup Characters
 * @apiVersion 1.0.0
 * @apiUse defaultResponse
 * @apiUse optionalAuth
 * @apiParam {String} id The unique id of the character
 * @apiDescription Gets information about on specific character.
 * @apiSuccess {Object} data Object containing all the character-data.
 * @apiSuccess {String} data.id The characters unique id.
 * @apiSuccess {String} data.name The characters name.
 * @apiSuccess {String} data.source The characters source (e.g. Anime, Book, etc.).
 * @apiSuccess {String} data.type The characters type.
 * @apiSuccess {String[]} data.pictures An array of picture-links.
 */

app.get('/:id', (req, res, next)=> {
    db.models.Character.find({where: {id: req.params.id}}).then((c)=> {
        var q = {verified: true};
        if (req.query.pic_verified !== undefined) {
            if (['true', 'false'].indexOf(req.query.pic_verified)) {//noinspection JSValidateTypes
                q.verified = req.query.pic_verified !== 'false';
            } else q = undefined;
        }
        //noinspection JSUnresolvedFunction
        return c.getCharacterPictures({where: q}).then((pics)=> {
            res.apijson([{
                    id: c.id,
                    name: c.name,
                    source: c.source,
                    type: c.type,
                    pictures: pics.map((p)=> {
                        return p.link
                    })
                }],
                {count: 1, total: 1, context: 'Object<Character>'});
        });
    }).catch((err)=> {
        next({code: 5200});
        story.warn('SQL-Error', '', {attach: err});
    });
});

app.head('/*', middleware.head());

module.exports = app;