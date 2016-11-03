var app = require('express').Router();
var bodyparser = require('body-parser');

var middleware = require('./middleware');

app.use(bodyparser.json());

app.use(middleware.buildStructure());
app.use(middleware.apijson());
app.use(middleware.resolveToken());
app.use(middleware.caching());
app.use(middleware.cors());
app.use(middleware.hostnameDeprecation());
app.use(middleware.authMissingWarning());
app.use(middleware.ratelimit());

app.use('/', require('./routes/'));
app.use('/stats', require('./routes/stats'));

app.use(middleware.catcher());

app.use(middleware.error());

module.exports = app;