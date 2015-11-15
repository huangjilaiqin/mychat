
var BufferHelper = require('bufferhelper');
var host = 'ws://localhost:5002';
var rehost = 'ws://192.168.41.102:5001';
var yuhost = 'http://ws.qqshidao.com';

var uhost = 'http://ws.51winball.com';
var uhost2 = 'http://123.59.40.113:5002';

host = 'http://localhost:5002';
host = 'http://ws.o-topcy.com/';
host = 'http://123.59.40.113/';
var io = require('socket.io-client');
var socket = io.connect(host, {
    'path':'/ws/',
    'timeout': 1000,
    'reconnectionAttempts': 50,
});
var fs = require('fs');

var events = ['error', 'connect', 'connect_timeout', 'connect_error', 'ping', 'pong'];

for(var index in events){
    (function(eventName){
        console.log('register ', eventName);
        socket.on(eventName, function(msg){
            console.log(eventName, ': ', msg);
            if(eventName=='connect'){
                socket.emit('login', {'mail':'1577594730@qq.com', 'passwd':'8888', 'type':1});
            }
        });
    })(events[index]);
}

