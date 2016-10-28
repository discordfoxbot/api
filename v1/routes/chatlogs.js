var app = require('express').Router();
var Promise = require('bluebird');
var story = require('storyboard').mainStory;

var db = require('../../db');
var middleware = require('../middleware');

/**
 * @apiDefine defaultResponse
 * @apiSuccess {String} context A string giving the type of the data-field.
 * @apiSuccess {String} time The current servertime.
 * @apiSuccess {Object[]} warnings An array of objects containing errors, which didn't let the request fail.
 * @apiSuccess {Boolean} cache indicates if the answer was delivered from cache
 */

/**
 * @apiDefine optionalAuth
 * @apiHeader {String} [Authorization] Token to authenticate against the API. Is only used to determine ratelimits for this endpoint.
 */


/**
 * @apiIgnore
 * @api {get} /v1/chatlogs/:id Get a chatlog
 * @apiName GetChatlog
 * @apiGroup Chatlogs
 * @apiVersion 1.0.0
 * @apiUse defaultResponse
 * @apiUse optionalAuth
 * @apiParam {String} id The unique id of the chatlog.
 * @apiDescription Gets information about on specific character.
 * @apiSuccess {Object} data Object containing all the character-data.
 * @apiSuccess {String} data.id The characters unique id.
 * @apiSuccess {String} data.name The characters name.
 * @apiSuccess {String} data.source The characters source (e.g. Anime, Book, etc.).
 * @apiSuccess {String} data.type The characters type.
 * @apiSuccess {String[]} data.pictures An array of picture-links.
 */

app.get('/:id', (req, res, next)=> {
    db.models.ChatLog.find({where: {id: req.params.id}}).then(log=> {
        if (log !== null && log !== undefined) {
            //noinspection JSUnresolvedFunction
            log.getChatLogMessages({order: [['timestamp', 'ASC']]}).then(msgs=> {
                //noinspection JSUnresolvedFunction
                Promise.join(log.getChannel(), log.getUser(), log.getGuild(), Promise.all(msgs.map(msg=>msg.getUser())), (channel, user, guild, msgusers)=> {
                    res.status(200).apijson({
                        id: log.id,
                        time: log.time,
                        guild: {
                            id: guild.gid,
                            name: guild.name
                        },
                        channel: {
                            id: channel.cid,
                            name: channel.name
                        },
                        user: {
                            id: user.uid,
                            username: user.username
                        },
                        messages: msgs.map(msg=> {
                            return {
                                id: msg.mid,
                                content: msg.content,
                                create_content: msg.create_content,
                                edited: msg.edited,
                                deleted: msg.deleted,
                                timestamp: msg.timestamp,
                                user: {
                                    id: msgusers[msgs.indexOf(msg)].uid,
                                    username: msgusers[msgs.indexOf(msg)].username,
                                    discriminator: msgusers[msgs.indexOf(msg)].discriminator
                                }
                            };
                        }),

                    }, {context: 'Object<Chatlog>'});
                });
            });
        } else next({code: 404});
    }).catch((err)=> {
        next({code: 5200});
        story.warn('SQL-Error', '', {attach: err});
    });
});

app.head('/*', middleware.head());

module.exports = app;