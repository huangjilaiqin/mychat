
var socketIO = require('socket.io');
var log4js = require('log4js');
log4js.configure('log.json');
var log = log4js.getLogger('server');

var server = socketIO(5002);
server.on('connection', function(socket){
    log.info('connect:', socket.id);    
    socket.on('disconnect', function(){
        log.info('disconnect:', this.id);    
    });
    socket.on('data', function(msg){
        log.info('data:', msg);    
    });
});

