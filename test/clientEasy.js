
var io = require('socket.io-client');
var host = 'ws://localhost:5002';
var uhost2 = 'ws://123.59.40.113:5002';
//var uhost2 = 'http://ws.o-topcy.com';

var socket = io.connect(uhost2, {
    transports: ["websocket", 'flashsocket', 'htmlfile', 'xhr-multipart', 'polling-xhr', 'jsonp-polling'],
});

function parseDataByJSON(data){
    var obj = JSON.parse(data);
    return obj;
}
var parseData = parseDataByJSON;

var events = ['login','message', 'error', 'err', 'connect', 'connect_timeout', 'connect_error', 'ping', 'pong'];

for(var index in events){
    var eventName = events[index];
    (function(eventName){
        console.log('register ', eventName);
        socket.on(eventName, function(msg){
            if(msg)
                console.log(eventName, ': ', msg);
            else
                console.log('on:'+eventName);
        });
    })(eventName);
}

var reflectCall = {
    message:onMessage,
};

var msgType = {
    text : 0,
    img : 1,
    file : 2,
    voice : 3,
    video : 4,
};
var REGISTER_MAIL = 1;
var REGISTER_WEIXIN = 2;

if(process.argv.length!=4){
    console.log('node clientEasy.js mail passwd');
    exit();
}

var mail = process.argv[2];
var passwd = process.argv[3];
var userId;

//*****************事件监听************************
socket.on('login', function(msg){
    var obj = JSON.parse(msg);
    userId = obj['userid'];
    console.log('login success! userid:'+userId);
});


socket.emit('login', JSON.stringify({type:REGISTER_MAIL, mail:mail, passwd:passwd}));


//userid friendid type content
function onMessage(datas){
    if(datas.length != 4){
        console.log('message friendid type content');
        return;
    }
    var message = {
        userid : userId,
        friendid : datas[1], 
        type : msgType[datas[2]],
        //内容暂时不支持双引号引起作为一个整体的特性
        content : datas[3],
    };
    console.log(message);
    socket.emit('message', JSON.stringify(message));
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


