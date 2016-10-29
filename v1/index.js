var app = require('express').Router();
var bodyparser = require('body-parser');

var middleware = require('./middleware');

app.use(bodyparser.json());

app.use(middleware.buildStructure());
app.use(middleware.apijson());
app.use(middleware.caching());
app.use(middleware.cors());
app.use(middleware.hostnameDeprecation());
app.use(middleware.authMissingWarning());

app.use('/', require('./routes/'));
app.use('/characters', require('./routes/characters'));
app.use('/chatlogs', require('./routes/chatlogs'));
app.use('/vcsfeeds', require('./routes/vcsfeed'));
app.use('/guilds', require('./routes/guilds'));
app.use('/stats', require('./routes/stats'));

//legacy loads
app.use('/vcsfeed', require('./routes/vcsfeed'));
app.use('/github', require('./routes/github'));
app.use('/gitlab', require('./routes/gitlab'));

app.use(middleware.catcher());

app.use(middleware.error());

module.exports = app;