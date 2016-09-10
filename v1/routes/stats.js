var app = require('express').Router();
var Promise = require('bluebird');
var moment = require('moment');

var db = require('../../db');

app.get('/', (req, res, next)=> {
    Promise.all([
        db.models.Guild.count({where: {online: true}}),
        db.models.User.count({where: {online: true}}),
        db.models.Message.count({where: {created_at: {$gt: moment().subtract(1, 'minutes').toDate()}}}),
        db.redis.hget('stats', 'channels').then(c=>Promise.resolve(parseInt(c)))
    ]).
    spread((g, u, m, c)=> {
        res.apijson({u, g, m, c}, {context: 'Object<Stats>'});
    }).catch(()=> {
        next({code: 5200});
    });
});

module.exports = app;