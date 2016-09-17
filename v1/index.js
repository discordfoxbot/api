var app = require('express').Router();
var bodyparser = require('body-parser');

var middleware = require('./middleware');

app.use(bodyparser.json());

app.use(middleware.apijson);

app.use('/characters', require('./routes/characters'));
app.use('/chatlogs', require('./routes/chatlogs'));
app.use('/github', require('./routes/github'));
app.use('/vcsfeed', require('./routes/vcsfeed'));
app.use('/guilds', require('./routes/guilds'));
app.use('/stats', require('./routes/stats'));
app.use(middleware.catcher);

app.use(middleware.error);

module.exports = app;