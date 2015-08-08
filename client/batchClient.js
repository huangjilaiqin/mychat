
var BufferHelper = require('bufferhelper');
var io = require('socket.io-client');
var fs = require('fs');
var useridData = fs.readFileSync('userid.txt', 'utf8');
useridData = useridData.replace(/\s*$/, '');
console.log('file:',useridData);
var userids = {};
var length = 0;
var useridsFile = useridData.split(';');
for(var i in useridsFile){
    userids[useridsFile[i]] = 1;
    length++;
}
console.log(userids);
console.log('user number:',length);

var host = 'ws://localhost:5001';
var rehost = 'ws://192.168.41.102:5001';
var yuhost = 'http://ws.qqshidao.com';

var roomId = 500;
var events = ['message','roominfo','history','upline','downline','userinfochange','countTime', 'error', 'err', 'connect', 'connect_timeout', 'connect_error', 'ping', 'pong'];

var socket1 = '';

while(length){
    var rand = Math.ceil(Math.random()*10000);
    if(userids[rand] != 1)
        continue;

    length--;
    userids[rand] = 2;
    console.log('rand userid:', rand);

    var socket = io.connect(host, {
        'timeout': 1000,
        'reconnectionAttempts': 5,
    });

    console.log(socket.id);

    if(socket1 == '')
        socket1= socket;
    else{
        if(socket1 == socket)
            console.log('socket yes');
        else
            console.log('socket no');
    }
    for(var index in events){
        registerEvents(socket, events[index], roomId, rand);
    }

    enterRoom(socket, roomId, rand);
}

console.log('all user login');

function registerEvents(socket, eventName, roomId, userId){
    if(eventName == 'history'){
        (function(socket, eventName, roomId, userId){
            console.log('register history:', userId);
            socket.on(eventName, function(msg){
                onChat(socket, roomId, userId, 'message from: '+userId);
                console.log('onChat', userId);
            });
        })(socket, eventName, roomId, userId);
    }
    if(eventName == 'message'){
        socket.on(eventName, function(msg){
            console.log(eventName, ': ', msg);
        });
    }
    /*
    socket.on(eventName, function(msg){
        console.log(eventName, ': ', msg);
    });
    */
}

function enterRoom(socket, roomId, userId){
    var  info = {
        roomId : roomId,
        userId : userId,
    };
    socket.emit('enterRoom', JSON.stringify(info));
}
var _st = setTimeout;
setTimeout = function(fRef, mDelay) {
    if (typeof fRef == 'function') {
        var argu = Array.prototype.slice.call(arguments,2);
        var f = (function(){ fRef.apply(null, argu); });
        return _st(f, mDelay);
    }
    return _st(fRef,mDelay);
}
/*
mySetTimeout = function(fun, delay){
    if(typeof fun == 'function'){
        var argu = Array.prototype.slice.call(arguments, 2);
        var f = (function(){
            fun.apply(null, argu);        
        });
        return setTimeout(f, delay);
    }
    return setTimeout(fun, delay);
};
//*/

function onChat(socket, roomId, userId, content){
    
    var chat = {
        roomId : roomId,
        userId : userId,
        type : 0,
        //内容暂时不支持双引号引起作为一个整体的特性
        content : content,
    };
    socket.emit('message', JSON.stringify(chat));
    setTimeout(onChat, 2000, socket, roomId, userId, content);
}


