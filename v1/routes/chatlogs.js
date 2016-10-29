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
 * @api {get} /v1/chatlogs/:id Get a chatlog
 * @apiName GetChatlog
 * @apiGroup Chatlogs
 * @apiVersion 1.0.0
 * @apiUse defaultResponse
 * @apiUse optionalAuth
 * @apiParam {String} id The unique id of the chatlog.
 * @apiDescription Gets information about on specific character.
 * @apiSuccess {Object} data Object containing all the data.
 * @apiSuccess {String} data.id The chatlogs unique id.
 * @apiSuccess {String} data.time The time the chatlog was created.
 * @apiSuccess {Object} data.guild The guild the chatlog was created in.
 * @apiSuccess {String} data.guild.id The guilds id.
 * @apiSuccess {String} data.guild.name The guilds name.
 * @apiSuccess {Object} data.channel The channel the chatlog was created in.
 * @apiSuccess {String} data.channel.id The channels id.
 * @apiSuccess {String} data.channel.name The channels name.
 * @apiSuccess {Object} data.user The user who created the chatlog.
 * @apiSuccess {String} data.user.id The users id.
 * @apiSuccess {String} data.user.username The users name.
 * @apiSuccess {String} data.user.discriminator The users discriminator
 * @apiSuccess {Object[]} data.messages The messageas included in the chatlog.
 * @apiSuccess {String} data.messages.id The message id.
 * @apiSuccess {String} data.messages.content The message content.
 * @apiSuccess {String} data.messages.create_content The message content at it's creation.
 * @apiSuccess {Boolean} data.messages.edited Indicates if the message was edited.
 * @apiSuccess {Boolean} data.messages.deleted Indicates if the message was deleted.
 * @apiSuccess {Number} data.messages.timestamp Discord Timestamp of the message.
 * @apiSuccess {Object} data.messages.user The user who sent the message.
 * @apiSuccess {String} data.messages.user.id The users id.
 * @apiSuccess {String} data.messages.user.username The users name.
 * @apiSuccess {String} data.messages.user.discriminator The users discriminator
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