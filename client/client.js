
var BufferHelper = require('bufferhelper');
var io = require('socket.io-client');
var host = 'ws://localhost:5002';
var rehost = 'ws://192.168.41.102:5001';
var yuhost = 'http://ws.qqshidao.com';

var uhost = 'http://ws.51winball.com';
var uhost2 = 'ws://123.59.40.113:5002';
uhost2 = 'http://123.59.40.113:5002/ws';

var socket = io.connect(uhost2, {
    'timeout': 1000,
    'reconnectionAttempts': 50,
});
var fs = require('fs');

function parseDataByJSON(data){
    var obj = JSON.parse(data);
    return obj;
}
var parseData = parseDataByJSON;

var events = ['message','roominfo','history','upline','downline','userinfochange','countTime', 'error', 'err', 'connect', 'connect_timeout', 'connect_error', 'ping', 'pong'];

socket.on('connect', function(){
//socket.emit('data', 'msg from client');
});

for(var index in events){
    (function(eventName){
        console.log('register ', eventName);
        socket.on(eventName, function(msg){
            console.log(eventName, ': ', msg);
        });
    })(events[index]);
}

var reflectCall = {
    chat:onChat,
    enterRoom:enterRoom,
    countTime:countTime,
};

var msgType = {
    text : 0,
    img : 1,
    file : 2,
    voice : 3,
    video : 4,
};

var roomId, userId;

function enterRoom(datas){
    if(datas.length != 3){
        console.log('enterRoom roomId userId');
        return;
    }
    var  info = {
        roomId : datas[1],
        userId : datas[2],
    };
    roomId = info.roomId;
    userId = info.userId;
    socket.emit('enterRoom', JSON.stringify(info));
}

function countTime(datas){
    if(datas.length != 1){
        console.log('countTime');
        return;
    }
    var  info = {
        roomId : roomId,
        userId : userId,
    };
    socket.emit('countTime', JSON.stringify(info));
}
function onChat(datas){
    if(datas.length != 3){
        console.log('chat type content');
        return;
    }
    var chat = {
        roomId : roomId,
        userId : userId,
        type : msgType[datas[1]],
        //内容暂时不支持双引号引起作为一个整体的特性
        content : datas[2],
    };
    socket.emit('message', JSON.stringify(chat));
}

process.stdin.setEncoding('utf8');

process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    if (chunk !== null) {
        //process.stdout.write('data: ' + chunk);
        chunk = chunk.replace('\n', '');
        datas = chunk.split(' ');
        if(!reflectCall[datas[0]]){
            console.log('error action:', datas[0]);
            return;
        }
        reflectCall[datas[0]](datas);
    }
});


