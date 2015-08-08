

var db = require('./DBPool.js');

var log4js = require('log4js');
log4js.configure('log.json');
var log = log4js.getLogger('chat');

var SingleInstance = {
    db: db,
    log: log,
};

module.exports = SingleInstance;

