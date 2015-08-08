
var io = require('socket.io-client');
var log4js = require('log4js');
log4js.configure('log.json');
var log = log4js.getLogger('client');

var host = 'ws://localhost:5001';
var host2 = 'ws://127.0.0.1:5002';
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

var _st = setTimeout;
setTimeout = function(fRef, mDelay) {
    if (typeof fRef == 'function') {
        var argu = Array.prototype.slice.call(arguments,2);
        var f = (function(){ fRef.apply(null, argu); });
        return _st(f, mDelay);
    }
    return _st(fRef,mDelay);
}

setInterval(function keepAlive(){}, 24*60*1000);

var roomId = 500;
var events = ['message','roominfo','history','upline','downline','userinfochange','countTime', 'error', 'err', 'connect', 'connect_timeout', 'connect_error', 'ping', 'pong'];

function enterRoom(socket, roomId, userId){
    var  info = {
        roomId : roomId,
        userId : userId,
    };
    socket.emit('enterRoom', JSON.stringify(info));
}

function onChat(socket, roomId, userId, content){
    
    var chat = {
        roomId : roomId,
        userId : userId,
        type : 0,
        //内容暂时不支持双引号引起作为一个整体的特性
        content : content,
    };
    socket.emit('message', JSON.stringify(chat));
    console.log('emit message');
    setTimeout(onChat, 2000, socket, roomId, userId, content);
}

//获取userid数据库的
var userIds = [];
bench(100);

function bench(length){
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
            //获取userid
            //进房间
            socket.emit('enterRoom', JSON.stringify({}));
            setTimeout(function(){}, getRandomByRange(1000, 10000));
            //不定时发送消息
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
        setTimeout(bench, getRandomByRange(5, 20), length);
    }
    else{
        console.log('done');
    }
}
function getRandomByRange(min, max){
    return Math.floor(Math.random()*(max-min)+min+0.5)
}


