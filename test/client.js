
var io = require('socket.io-client');
var log4js = require('log4js');
log4js.configure('log.json');
var log = log4js.getLogger('client');

var host = 'ws://localhost:5001';
var host2 = 'ws://localhost:5002';
var rehost = 'ws://192.168.41.102:5001';
var yuhost = 'http://ws.qqshidao.com';
var uhost = 'http://ws.51winball.com';

var uhost2 = 'ws://123.59.40.113:5002';

var length = 5000;
var connect = 0;
var error = 0;
var disconnect = 0;
var reconnect = 0;

/*
setInterval(function(){
    //console.log('connect:', connect, 'disconnect:', disconnect, 'reconnect:', reconnect, 'error:', error);
}, 1000);
*/
process.on('uncaughtException', function (err) {
    log.fatal('uncaughtException:', err);
    log.fatal('uncaughtException code:', err.code);
    log.fatal('uncaughtException:', err.stack);
});

setInterval(function keepAlive(){}, 24*60*1000);


function bench(){
    if(length){
        length--;
        var socket = io.connect(uhost2, {
            //timeout: 10000,
            //reconnectionAttempts: 5,
            //reconnectionDelay: 2000,
            forceNew: true,
            transports: ["websocket", 'flashsocket', 'htmlfile', 'xhr-multipart', 'polling-xhr', 'jsonp-polling'],
        });

        socket.on('connect', function(){
            //log.info('connection', socket.getsockname());
            socket.emit('enterRoom', JSON.stringify({}));
            setTimeout(function(){}, getRandomByRange(1000, 10000));
            socket.emit('message', );
        });
        socket.on('connect_error', function(err){
            log.error('connection', err);
        });
        socket.on('disconnect', function(){
        });
        socket.on('reconnect', function(){
            log.error('reconnect');
        });
        socket.on('reconnecting', function(num){
            log.error('reconnecting', num);
        });
        socket.on('reconnect_error', function(err){
            log.error('reconnect_error', err);
        });
        socket.on('error', function(err){
            log.error(err);
        });
        setTimeout(bench, getRandomByRange(5, 20));
    }
    else{
        console.log('done');
    }
}
function getRandomByRange(min, max){
    return Math.floor(Math.random()*(max-min)+min+0.5)
}

bench();

