var app = require('express').Router();
var Promise = require('bluebird');
var story = require('storyboard').mainStory;

var db = require('../../db');
var middleware = require('../middleware');

app.get('/', middleware.auth, (req, res, next)=> {
    req.token.getGuilds().then(guilds=> {
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
            Promise.join(guild.getPrefixes(), guild.getChannels(), (prefixes, channels)=> {
                res.apijson({
                    id: guild.gid,
                    name: guild.name,
                    region: guild.region,
                    prefixes: prefixes.map(prefix=>prefix.prefix),
                    channels: channels.map(channel=>channel.cid),
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
            guild.getChannels().then((channels)=> {
                res.apijson(channels.map(channel=> {
                    return {id: channel.cid, name: channel.name,}
                }), {context: 'Array<Channel>'});
            });
        } else next({code: 403});
    }).catch(err=> {
        next({code: 5200});
        story.error('sql', 'auth', {attach: err});
    })
});

module.exports = app;