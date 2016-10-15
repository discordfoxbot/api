var app = require('express').Router();
var Promise = require('bluebird');
var moment = require('moment');
var story = require('storyboard').mainStory;

var db = require('../../db');

app.get('/', (req, res, next)=> {
    Promise.all([
        db.models.Guild.count({where: {online: true}}),
        db.models.Guild.findAll({where: {online: true}}).then(guilds=> {
            return Promise.all(guilds.map(guild=>guild.getMembers().then(m=>Promise.resolve(m.length))));
        }).then(mCounts=>{
            var c = 0;
            for (var e of mCounts) {
                c = e + c;
            }
            return Promise.resolve(c);
        }),
        db.models.Message.count({where: {created_at: {$gt: moment().subtract(1, 'minutes').toDate()}}}),
        db.models.Guild.findAll({where: {online: true}}).then(guilds=> {
            return Promise.all(guilds.map(guild=>guild.getChannels().then(chs=>Promise.resolve(chs.length))))
        }).then(channelCounts=> {
            var c = 0;
            for (var e of channelCounts) {
                c = e + c;
            }
            return Promise.resolve(c);
        })
    ]).spread((g, u, m, c)=> {
        res.apijson({u, g, m, c}, {context: 'Object<Stats>'});
    }).catch((err)=> {
        story.warn('SQL', '', {attach: err});
        next({code: 5200});
    });
});

app.get('/uptime_test', (req, res)=> {
    res.apijson(true, {context: 'Boolean<Status>'});
});

module.exports = app;