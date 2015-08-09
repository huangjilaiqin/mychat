
var BufferHelper = require('bufferhelper');
var io = require('socket.io-client');
var host = 'ws://localhost:5001';
var host2 = 'ws://localhost:5002';

handlerException();

function encodeDataByJSON(data){
    return JSON.stringify(data);
}
function decodeDataByJSON(data){
    return JSON.parse(data);
}

var encodeData = encodeDataByJSON;
var decodeData = decodeDataByJSON;

var events = ['register','login','init','logout','finduserbymail','addfriendbymail','message','upline','downline','err'];
var sysEvents = ['error','connect','connect_timeout','connect_error','ping','pong'];

var socket = io.connect(host2, {
    'timeout': 1000,
    'reconnectionAttempts': 50,
});

for(var index in events){
    eventName = events[index];
    (function(eventName){
        console.log('register ', eventName);
        socket.on(eventName, function(msg){
            console.log(eventName, ': ', msg);
        });
    })(eventName);
}
for(var index in sysEvents){
    var eventName = sysEvents[index];
    (function(eventName){
        console.log('register ', eventName);
        socket.on(eventName, function(msg){
            console.log(eventName, ': ', msg);
        });
    })(eventName);
}

//连接服务器

var reflectCall = {
    /*
    chat:onChat,
    enterRoom:enterRoom,
    countTime:countTime,
    */
};

var msgType = {
    text : 0,
    img : 1,
    file : 2,
    voice : 3,
    video : 4,
};

var roomId, userId;

var mail = "136437945@qq.com";
var passwd = '19910725';
var userid = 3;

var registerObj = {'type':1, 'mail':mail, 'passwd':passwd};
socket.emit('register', encodeData(registerObj));

var loginObj = {'type':1, 'mail':mail, 'passwd':passwd};
socket.emit('login', encodeData(loginObj));

var findUserByMailObj = {'userid':userid, 'mail':'1577594730@qq.com'}
socket.emit('finduserbymail', encodeData(findUserByMailObj));

var addFriendByMailObj = {'userid':userid, 'mail':'1577594730@qq.com'}
socket.emit('addfriendbymail', encodeData(addFriendByMailObj));


/*
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
*/
function handlerException(){
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
}


