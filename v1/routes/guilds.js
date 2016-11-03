var app = require('express').Router();
var Promise = require('bluebird');
var story = require('storyboard').mainStory;

var db = require('../../lib/db');
var middleware = require('../middleware');

/**
 *
 */

app.get('/', middleware.auth(), (req, res, next)=> {
    req.token.getGuilds().then(guilds=> {
        //noinspection JSUnresolvedFunction
        Promise.join(Promise.all(guilds.map(guild=>guild.getPrefixes())), Promise.all(guilds.map(guild=>guild.getChannels())), (prefixes, channels)=> {
                res.apijson(guilds.map(guild=> {
                    return {
                        id: guild.gid,
                        name: guild.name,
                        region: guild.region,
                        prefixes: prefixes[guilds.indexOf(guild)].map(prefix=>prefix.prefix),
                        channels: channels[guilds.indexOf(guild)].map(channel=>channel.cid),
                        shard: guild.shard_id
                    }
                }), {context: 'Array<Guild>'})
            }
        );
    }).catch(err=> {
        next({code: 5200});
        story.error('sql', 'auth', {attach: err});
    })
});

app.get('/:guild', middleware.resolvePermissionGuild({perm: 'view'}), (req, res, next)=> {
    req.token.getGuilds({where: {gid: req.params.guild}}).spread(guild=> {
        if (guild !== undefined && guild !== null) {
            //noinspection JSUnresolvedFunction
            Promise.join(guild.getPrefixes(), guild.getChannels(), (prefixes, channels)=> {
                res.apijson({
                    id: guild.gid,
                    name: guild.name,
                    region: guild.region,
                    prefixes: prefixes.map(prefix=>prefix.prefix),
                    channels: channels.map(channel=> {
                        return {id: channel.cid, name: channel.name}
                    }),
                    shard: guild.shard_id
                }, {context: 'Object<Guild>'});
            });
        } else next({code: 403});
    }).catch(err=> {
        next({code: 5200});
        story.error('sql', 'auth', {attach: err});
    })
});

app.get('/:guild/members', middleware.resolvePermissionGuild({perm: 'view'}), (req, res, next)=> {
    req.token.getGuilds({where: {gid: req.params.guild}}).spread(guild=> {
        if (guild !== undefined && guild !== null) {
            //noinspection JSUnresolvedFunction
            guild.getUsers().then((users)=> {
                res.apijson(users.map(user=> {
                    return {
                        id: user.uid,
                        username: user.username,
                        discriminator: user.discriminator,
                        status: user.status
                    };
                }), {context: 'Array<User>'});
            });
        } else next({code: 403});
    }).catch(err=> {
        next({code: 5200});
        story.error('sql', 'auth', {attach: err});
    })
});

app.get('/:guild/channels', middleware.resolvePermissionGuild({perm: 'viewChannels'}), (req, res, next)=> {
    req.token.getGuilds({where: {gid: req.params.guild}}).spread(guild=> {
        if (guild !== undefined && guild !== null) {
            //noinspection JSUnresolvedFunction
            guild.getChannels().then((channels)=> {
                res.apijson(channels.map(channel=> {
                    return {id: channel.cid, name: channel.name, guild: {id: guild.gid, name: guild.name}}
                }), {context: 'Array<Channel>'});
            });
        } else next({code: 403});
    }).catch(err=> {
        next({code: 5200});
        story.error('sql', 'auth', {attach: err});
    })
});

app.get('/:guild/channels/:channel', middleware.resolvePermissionGuild({perm: 'viewChannels'}), (req, res, next)=> {
    req.token.getGuilds({where: {gid: req.params.guild}}).spread(guild=> {
        if (guild !== undefined && guild !== null) {
            //noinspection JSUnresolvedFunction
            guild.getChannels({where: {cid: req.params.channel}}).spread((channel)=> {
                res.apijson({
                    id: channel.cid,
                    name: channel.name,
                    guild: {id: guild.gid, name: guild.name}
                }, {context: 'Object<Channel>'});
            });
        } else next({code: 403});
    }).catch(err=> {
        next({code: 5200});
        story.error('sql', 'auth', {attach: err});
    })
});

app.patch('/:guild/channels/:channel', middleware.resolvePermissionGuild({perm: 'manageModlog'}), (req, res, next)=> {
    req.token.getGuilds({where: {gid: req.params.guild}}).spread(guild=> {
        //noinspection JSUnresolvedFunction
        return guild.getChannels({where: {cid: req.params.channel}}).spread(channel=> {
            if (channel !== null && channel !== undefined) {
                var keys = ['modlog'];
                var promises = [Promise.resolve()];
                for (var e in req.body) {
                    //noinspection JSUnfilteredForInLoop
                    if (keys.includes(e)) {
                        var updates = {};
                        //noinspection JSUnfilteredForInLoop
                        updates[e] = typeof req.body[e] === 'boolean' ? req.body[e] : false;
                        promises.push(channel.update(updates));
                    }
                }
                return Promise.all(promises).then(()=> {
                    //noinspection JSUnresolvedFunction
                    return guild.getChannels({where: {cid: req.params.channel}});
                }).spread(channel=> {
                    res.apijson({
                        id: channel.id,
                        name: channel.name,
                        modlog: channel.modlog
                    }, {context: 'Object<ExtendedChannel>'});
                })
            } else next({code: 404});
        });
    }).catch(err=> {
        next({code: 5200});
        story.error('sql', 'auth', {attach: err});
    })
});

app.get('/:guild/roles', middleware.resolvePermissionGuild({perm: 'viewRoles'}), (req, res, next)=> {
    req.token.getGuilds({where: {gid: req.params.guild}}).spread(guild=> {
        if (guild !== undefined && guild !== null) {
            //noinspection JSUnresolvedFunction
            guild.getGuildRoles().then(roles=> {
                //noinspection JSUnresolvedFunction
                Promise.all(roles.map(role=>role.getUser())).then(users=> {
                    users = users.map(user=> {
                        return {id: user.uid, username: user.username, discriminator: user.discriminator}
                    });
                    res.apijson(roles.map(role=> {
                        return {
                            level: role.level,
                            guild: {id: guild.gid, name: guild.name},
                            user: users[roles.indexOf(role)]
                        }
                    }), {context: 'Array<Role>'});
                });
            });
        } else next({code: 403});
    }).catch(err=> {
        next({code: 5200});
        story.error('sql', 'auth', {attach: err});
    })
});

app.get('/:guild/roles/:user', middleware.resolvePermissionGuild({perm: 'viewRoles'}), (req, res, next)=> {
    req.token.getGuilds({where: {gid: req.params.guild}}).spread(guild=> {
        if (guild !== undefined && guild !== null) {
            //noinspection JSUnresolvedFunction
            guild.getGuildRoles({include: [{model: db.models.User, where: {uid: req.params.user}}]}).spread(role=> {
                if (role !== undefined && role !== null) {
                    //noinspection JSUnresolvedFunction
                    return role.getUser().then(user=> {
                        res.apijson({
                            level: role.level,
                            guild: {id: guild.gid, name: guild.name},
                            user: {id: user.uid, username: user.username, discriminator: user.discriminator}
                        }, {context: 'Object<Role>'});
                    });
                } else {
                    return db.models.User.find({
                        where: {uid: req.params.user},
                        include: [{model: db.models.Guild, where: {gid: req.params.guild}}]
                    }).then(user=> {
                        if (user !== undefined && user !== null) {
                            res.apijson({
                                level: 0,
                                guild: {id: guild.gid, name: guild.name},
                                user: {id: user.uid, username: user.username, discriminator: user.discriminator}
                            }, {context: 'Object<Role>'});
                        } else next({code: 404});
                    })
                }
            });
        } else next({code: 403});
    }).catch(err=> {
        next({code: 5200});
        story.error('sql', 'auth', {attach: err});
    })
});

app.head('/*', middleware.head());

module.exports = app;