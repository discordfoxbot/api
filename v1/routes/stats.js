var app = require('express').Router();
var Promise = require('bluebird');
var moment = require('moment');
var story = require('storyboard').mainStory;

var db = require('../../db');

app.get('/', (req, res, next)=> {
    Promise.all([
        db.models.Guild.count({where: {online: true}}),
        //db.models.User.count({where: {online: true}}),
        db.redis.hget('stats', 'users').then(c=>Promise.resolve(parseInt(c))),
        db.models.Message.count({where: {created_at: {$gt: moment().subtract(1, 'minutes').toDate()}}}),
        db.redis.hget('stats', 'channels').then(c=>Promise.resolve(parseInt(c)))
    ]).spread((g, u, m, c)=> {
        res.apijson({u, g, m, c}, {context: 'Object<Stats>'});
    }).catch((err)=> {
        story.warn('SQL', '', {attach: err});
        next({code: 5200});
    });
});

app.get('/uptime_test',(req,res)=>{
   res.apijson(true,{context:'Boolean<Status>'});
});

module.exports = app;