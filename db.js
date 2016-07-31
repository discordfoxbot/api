var DB = require('db');

var config = require('./config');

var db = new DB(config.db);

module.exports = db;