/*global module, require*/

var logger = require('logger');
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

var roomId = 500;
var events = ['message','roominfo','history','upline','downline','userinfochange','countTime', 'error', 'err', 'connect', 'connect_timeout', 'connect_error', 'ping', 'pong'];

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

function registerEvents(socket, eventName, roomId, userId){
    //console.log('registerEvents', userId, eventName);
    if(eventName == 'history'){
        
        socket.on(eventName, function(msg){
            onChat(socket, roomId, userId, 'message from: '+userId);
            console.log('onChat', userId);
        });
        return;
    }
    if(eventName == 'message'){
        socket.on(eventName, function(msg){
            console.log(eventName, ': ', msg);
        });
    }
    return;
    socket.on(eventName, function(msg){
        console.log(eventName, ': ', msg);
    });
}

module.exports = {

  /**
   * Before connection (just for faye)
   * @param {client} client connection
   */
  beforeConnect : function (client) {
    // Your logic
    // By example
    // client.setHeader('Authorization', 'OAuth abcd-1234');
    // client.disable('websocket');
        
  },

  /**
   * on socket io connect
   * @param {client} client connection
   * @param {done}   callback function(err) {}
   */
  onConnect : function (client, done) {
    // Your logic
    // client.subscribe('/test', function() {});
    while(length){
        var rand = Math.ceil(Math.random()*10000);
        if(userids[rand] != 1)
            continue;

        length--;
        userids[rand] = 2;
        console.log('rand userid:', rand);

        client['userId'] = rand;
        for(var index in events){
            registerEvents(client, events[index], roomId, client.userId);
        }

        enterRoom(client, roomId, rand);    
        break;
    }

    done();
  },

  /**
   * send a message
   * @param {client} client connection
   * @param {done}   callback function(err) {}
   */
  sendMessage : function (client, done) {
    logger.error('Not implement method sendMessage in generator');
    // Your logic
    //client.emit('test', { hello: 'world' });
    //client.publish('/test', { hello: 'world' });
    done();
  }
};
