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
        next({code: 3000});
        story.error('sql', 'auth', {attach: err});
    })
});

app.get('/:id', middleware.auth, (req, res, next)=> {
    req.token.getGuilds({where: {gid: req.params.id}}).spread(guild=> {
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
        next({code: 3000});
        story.error('sql', 'auth', {attach: err});
    })
});

module.exports = app;