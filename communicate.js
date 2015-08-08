

var log = require('./log.js');

function issued(roomId, userId, type, issuedObj){
    //log.debug('issued:', issuedObj);
    roomConnections[roomId][userId].emit(type, JSON.stringify(issuedObj));
}

//to do 黑名单处理
//userId 为广播者则表示不给本人广播,-1表示给所有的人广播

function roomBroadcast(roomId, userId, type, obj){
        
    var connections = roomConnections[roomId];
    //log.debug('roomBroadcast type:', type, 'connection size:',connections.length);
    for(var uid in connections){
        //log.debug('roomBroadcast:',uid);
        if(uid == userId)
            continue;

        issued(roomId, uid, type, obj);
    }
}

module.exports = {
    issued : issued,
    roomBroadcast : roomBroadcast,
};
