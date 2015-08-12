
var io = require('socket.io-client');
var host = 'ws://localhost:5002';
var uhost2 = 'ws://123.59.40.113:5002';
var uhost2 = 'http://ws.o-topcy.com';
var socket = io.connect(uhost2, {
    'timeout': 1000,
    'reconnectionAttempts': 50,
    forceNew: true,
    transports: ["websocket", 'flashsocket', 'htmlfile', 'xhr-multipart', 'polling-xhr', 'jsonp-polling'],
});

socket.on('connect', function(){
    console.log('connect');
    //socket.close();
});
socket.on('reconnect', function(){
    console.log('reconnect');
});
socket.on('disconnect', function(){
    console.log('disconnect');
});

