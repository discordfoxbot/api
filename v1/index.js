var app = require('express').Router();

app.use('/characters',require('./routes/characters'));

module.exports = app;