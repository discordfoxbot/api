var app = require('express').Router();
var bodyparser = require('body-parser');

var middleware = require('./middleware');

app.use(bodyparser.json());

app.use((req, res, next)=> {
    res.apijson = (data, meta = {})=> {
        res.json({
            data,
            count: (Array.isArray(data) ? data.length : undefined),
            total: meta.total || undefined,
            next: meta.next || undefined,
            time: new Date()
        })
    };
    next();
});

app.use('/characters', require('./routes/characters'));
app.use('/chatlogs', require('./routes/chatlogs'));
app.use('/github', require('./routes/github'));
app.use('/vcsfeed', require('./routes/vcsfeed'));
app.use('/guilds', require('./routes/guilds'));

app.use(middleware.error);

module.exports = app;