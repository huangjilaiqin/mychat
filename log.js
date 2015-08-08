
var log4js = require('log4js');
log4js.configure('log.json');
var log = log4js.getLogger('chat');
var logPerformance = log4js.getLogger('performance');

module.exports = {
    log: log,
    logPerformance: logPerformance,    
};

