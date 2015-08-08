

var redis = require('redis');

var global = require('./global.js');
var db = require('./DBPool.js');
var log = require('./log.js').log;
var logPerformance = require('./log.js').logPerformance;
var communicate = require('./communicate.js');
var parseData = require('./util.js').parseData;
var roomBroadcast = communicate.roomBroadcast;
var issued = communicate.issued;
var DateFormat = require('./util.js').DateFormat;
var redisCli = redis.createClient(serverConfig.redisPort, serverConfig.redisHost);
var common = require('./common.js');


var protocols = {
    /*
    'register':register,
    'login':login,
    'logout':logout,
    'findfriendbyid':findFriendById,
    'addfriend':addFriend,
    'chat':chat,
    'issueStatus':issueStatus,
    */
    //发送聊天消息
    'message' : onMessage,

    //房间操作
    'getRooms' : getRooms,
    'createRoom' : createRoom,
    'enterRoom' : enterRoom,
    'quitRoom' : quitRoom,
    'lsHistory' : lsHistory,

    //用户相关
    //黑名单
    'addBlackList' : addBlackList,
    'removeBlackList' : removeBlackList,
    'getBlackList' : getBlackList,

    //管理员协议
    'countTime' : countTime,
    'onlineNum' : getOnlineNum,
};

function getRooms(){
    var issuedRooms = [];
    for(var roomId in rooms){
        issuedRooms.push(roomId);
    }
    var obj = {
        type : msgType.roomids,
        content : issuedRooms,
    };
    this.emit('message', JSON.stringify(obj));
}

function onMessage(data){
    log.debug('onMessage:', data);

    var costMessage = [];
    costMessage.push(new Date().getTime()); 

    var obj = parseData(data);
    //to do检查这些参数,返回错误
    var roomId = obj['roomId'];
    var userId = obj['userId'];
    var type = obj['type'];
    var content = obj['content'];

    if(!roomId || !userId || !content){
        this.emit('err', 'error message format!');
        return;
    }
    if(type == undefined || type<chatMsgType.min || type>chatMsgType.max){
        this.emit('err', 'message type:'+type+' is not suport!');
        return;
    }
    var insertTime = new Date();
    obj['createTime'] = DateFormat('yyyy-MM-dd hh:mm:ss', insertTime);

    //检查用户是否登录
    var session = sessions[userId];
    if(!session || session['state'] != userState.online){
        this.emit('err', 'user is not login!');
        return;
    }

    //to do 过滤

    //
    var user = session['userInfo'];
    var history = {
        userId:obj['userId'],
        time:obj['createTime'],
        type:obj['type'],
        content:obj['content'],
        nickname:user['nickname'],
        headimg:user['headimg'],
    };
    newestHistory.push(history);

    //转发数据给房间的其它用户
    roomBroadcast(roomId, -1, issuedType.message, obj);

    //入库
    var sql = 'insert into roomchatrecord set roomid=?, time=?, type=?, userid=?, content=?'; 
    var args = [roomId, insertTime, obj['type'], userId, content];
    db.query(sql, args, function(err, rows){
        if(err){
            log.error('insert message:', err);
            return;
        }
        var recoredId = rows.insertId;
        history['id'] = recoredId; 
    });

    costMessage.push(new Date().getTime()); 
    costTimes['message'].push(costMessage);
}
//创建房间
function createRoom(data){
    var obj = parseData(data);
    var userId = obj['userId'];
    var name = obj['roomName'];
    var type = obj['roomType'];
    var discribe = obj['roomDiscribe'];
    var sql = 'insert into rooms set name=?, type=?, discribe=?, boss=?';
    var args = [name, type, discribe, userId];
    db.query(sql, args, function(err, rows){
        if(err){
            log.error(err);
            return;
        }
        //rows.insertId 自动增长主键列的值
    });
}

function enterRoom(data){
    log.trace('enterRoom:', this.id);

    var costEnterRoom = [];
    costEnterRoom.push(new Date().getTime());

    var obj = parseData(data);
    var roomId = obj['roomId'];
    var userId = obj['userId'];

    if(!roomId || !userId){
        this.emit('err', 'message error, roomId:'+roomId+'+userId:'+userId);
        return;
    }
    
    var connectionByRoomid = roomConnections[roomId];
    if(!connectionByRoomid){
        this.emit('err', 'roomId:' + roomId + ' is not exist!');
        return;
    }

    //检查用户是否登录
    if(connectionByRoomid[userId]){
        kickOff(roomId, userId);
        //return;
    }

    var socket = this; 

    var costSqlandCache = [];
    costSqlandCache.push(new Date().getTime());

    //ugly
    loadUserInfo(roomId, userId, socket, function(userInfo){ 

        costSqlandCache.push(new Date().getTime());
        costTimes['loadUserInfoSqlandCache'].push(costSqlandCache);

        //填充用户信息的三个数据结构
        roomConnections[roomId][userId] = socket;

        //根据socket的id存储用户信息
        socket2user[socket.id] = {roomId:roomId,userId:userId};

        //维护房间信息
        rooms[roomId]['roommate'][userId] = userInfo;
        sessions[userId]['userState'] = userState.online;


        log.trace('loadUserInfo enterRoom roomId: ', roomId, 'userId:', userId, 'nickname:', userInfo['nickname']);
        

        //下发房间信息
        issued(roomId, userId, issuedType.roominfo, rooms[roomId]);
        //上线广播
        roomBroadcast(roomId, -1, issuedType.upline, userInfo);

        //增加在线人数
        redisCli.incr('onlineNum');
        redisCli.get('onlineNum', function(err, replay){
            log.trace('upline onlineNum:', replay);
        });

        //下发历史记录
        var history = {};
        history[roomId] = newestHistory.display();
        issued(roomId, userId, issuedType.history, history);
        log.trace('issued history:', socket.id);

        costEnterRoom.push(new Date().getTime());
        costTimes['enterroom'].push(costEnterRoom);
    });
}

function loadUserInfo(roomId, userId, socket, callback){
    //加载用户数据
    //基本信息

    log.trace('loadUserInfo', userId, socket.id);
    if(sessions[userId]){
        log.info('hit user cache');
        callback(sessions[userId].userInfo);
        return;
    }
    else{

        var costSql = [];
        costSql.push(new Date().getTime());

        var sql = 'select nickname, headimg from t_user where userid=?';
        var args = [userId];

        //这两个属性为冗余属性,方便下发用户信息
        var info = {
            roomId: roomId,
            userId: userId,
        };
        db.query(sql, args, function(err, rows){

            console.log('sql loadUserInfo done', userId, socket.id);
            costSql.push(new Date().getTime());
            costTimes['loadUserSql'].push(costSql);

            if(err){
                log.error('loadUserInfo err:', err);
                socket.emit('err', err);
                return;
            }
            if(rows.length === 1){
                row = rows[0];
                info['nickname'] = row['nickname'];
                var reg = /^\//;
                if(reg.test(row['headimg']))
                    row['headimg'] = serverConfig.hostName + row['headimg'];
                info['headimg'] = row['headimg'];
            }else{
                socket.emit('err', 'user is not exit');
                return;
            }

            if(callback !== undefined && typeof(callback) === 'function'){
                session = {};
                sessions[userId] = session;
                session['userInfo'] = info;
                session['time'] = new Date().getTime();
                session['state'] = userState.online;
                callback(info);
            }
        });
    }
}


function quitRoom(data){
    var obj = parseData(data);
    var roomId = obj['roomId'];
    var userId = obj['userId'];
}

function lsHistory(data){
    var obj = parseData(data);
    var roomId = obj['roomId'];
    var beginDate = obj['beginData'];
    var endDate = obj['endData'];
}

function addBlackList(data){

}

function removeBlackList(data){

}

function getBlackList(data){

}
function isInBlackList(roomId, myId, userId){
    var context = getChatContext(roomId, myId);

    log.debug(rooms, roomId, myId);
    log.debug(context);
    return context['blacklist'][userId]? 1:0;
}

function getChatContext(roomId, userId){
    //to do 判错
    return rooms[roomId]['roommate'][userId];
}

function getBlackList(roomId, userId){
    blacklist = {};
    __getBlackList(roomId, userId, blacklist, function(){
        var obj = {
            'type' : 'blacklist',
            'content' : blacklist,
        };
        this.emit('message', JSON.stringify(obj));
    });
}

function __getBlackList(roomId, userId, blacklist, callback){
    sql = 'select blacklist from roommate where roomid=? and userid=?';
    args = [roomId, userId];
    db.query(sql, args, function(err, rows){
        if(err){
            this.emit('err', err);
        }
        if(rows.length === 0){
            
            sql = 'insert into roommate set roomid=?, userid=?';
            db.query(sql, [roomId, userId], function(err, rows){
                if(err){
                    this.emit('err', err);
                }
                if(callback !== undefined && typeof(callback) === 'function'){
                    callback(blacklist);
                }
            });
        }
        else if(rows.length === 1){
            var list = rows[0]['blacklist'].split(',');
            for( var i in list){
                if(list[i] === '')
                    continue;
                blacklist[list[i]] = 1;
            }
            if(callback !== undefined && typeof(callback) === 'function'){
                callback(blacklist);
            }
        }
    });
}

function countTime(data){

    var obj = parseData(data);
    var roomId = obj['roomId'];
    var userId = obj['userId'];
    var connection = roomConnections[roomId][userId];

    result = common.analyzeTime();
    log.info('countTime', result);
    
    connection.emit('countTime', result);
}
function getOnlineNum(data){
    var obj = parseData(data);
    var roomId = obj['roomId'];
    var userId = obj['userId'];
    var connection = roomConnections[roomId][userId];
    redisCli.get('onlineNum', function(err, replay){
        connection.emit('onlineNum', replay);
    });
}

function kickOff(roomId, userId){
    log.trace('踢掉在线用户, userId:' + userId);
    var socket = roomConnections[roomId][userId];
    //to do
    //通知前一个在线用户

    common.onDownline(socket, roomId, userId);
}

module.exports = protocols;
