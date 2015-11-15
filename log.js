
var log4js = require('log4js');
log4js.configure('log.json');
var log = log4js.getLogger('server');
var logPerformance = log4js.getLogger('performance');
var logHttpProtocol = log4js.getLogger('httpprotocol');

module.exports = {
    log: log,
    logPerformance: logPerformance,    
    logHttpProtocol: logHttpProtocol, 
};

