


var global = require('./global.js');
var db = require('./DBPool.js');
var log = require('./log.js').log;
var logPerformance = require('./log.js').logPerformance;
var communicate = require('./communicate.js');
var parseData = require('./util.js').parseData;
var roomBroadcast = communicate.roomBroadcast;
var issued = communicate.issued;
var DateFormat = require('./util.js').DateFormat;
var common = require('./common.js');


var protocols = {
    'register':onRegister,
    'login':onLogin,
    'logout':onLogout,
    'finduserbymail':onFindUserByMail,
    'addfriendbymail':onAddFriendByMail,
    //'issueStatus':onIssueStatus,
    //发送聊天消息
    'message' : onMessage,

    /*
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
    */
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

var mailReg = /^\w+@\w+\.\w+$/;
var REGISTER_MAIL = 1;
var REGISTER_WEIXIN = 2;
var registerTypes = [REGISTER_MAIL, REGISTER_WEIXIN];

function checkRegister(data){
    var obj = JSON.parse(data);
    var registerType = obj['type'];
    var mail = obj['mail'];
    var passwd = obj['passwd'];
    if(!registerType || !registerTypes[registerType]){
        return {'error':'error register type:['+registerType+']'};
    }
    switch(registerType){
        case REGISTER_MAIL:
            var mail = obj['mail'];
            if(!passwd)
                return {'error':'error passwd is null'};
            if(!mail || !mailReg.test(mail))
                return {'error':'error mail address:['+mail+']'};

            break;
        case REGISTER_WEIXIN:
            break;
        default:
            break;
    }
    return obj;
}

function onRegister(data){
    log.trace('register', data);
    var obj = checkRegister(data);
    var type = obj['type'];
    var mail = obj['mail'];
    var passwd = obj['passwd'];
    log.trace('register', obj);
    var emitter = this;
    if(obj['error']){
        log.trace('register error', obj['error']);
        emitter.emit('register', JSON.stringify(obj['error']));
    }else{
        log.trace('register', 'register no error');
        switch(type){
            case REGISTER_MAIL:
                log.trace('register mail');
                db.query('select 1 from t_user where mail = ?', [mail], function(err, rows){
                    if(err){
                        emitter.emit('register', JSON.stringify({'error':err}));
                    }else if(rows.length!=0){
                        emitter.emit('register', JSON.stringify({'errno':103}));
                    }else{
                        log.trace('register mail insert');
                        db.query('insert into t_user(mail, passwd) values (?, ?)', [mail, passwd], function(err, rows){
                            if(err){
                                emitter.emit('register', JSON.stringify({'error':err}));
                            }else{
                                emitter.emit('register', JSON.stringify({}));
                            }
                        });
                    }
                });
                break;
            case REGISTER_WEIXIN:
                break;
            default:
                emitter.emit('register', JSON.stringify({'error':'error anyway'}));
                break;
        }
    }
}

function checkLogin(data){
    var obj = JSON.parse(data);
    var type = obj['type'];
    if(!type || !registerTypes[type]){
        return {'error':'error login type:['+type+']'};
    }
    switch(type){
        case REGISTER_MAIL:
            if(!obj['mail'] || !obj['passwd'])
                return {'login':{'errno':101}};
            break;
        case REGISTER_WEIXIN:
            break;
        default:
            break;
    }
    return obj;
}

var USER_STATUS_ONLINE = 1;
var USER_STATUS_OFFLINE = 2;
var USER_STATUS_BUSY = 3;

function onLogin(data){
    var obj = checkLogin(data);
    var status =  obj['status']?obj['status']:USER_STATUS_ONLINE;
    var emitter = this;
    var mail = obj['mail'];
    var passwd = obj['passwd'];
    if(obj['error']){
        emitter.emit('login', JSON.stringify(obj));
    }else{
        db.query('select userid from t_user where mail=? and passwd=?', [mail, passwd], function(err, rows){
            if(err){
                emitter.emit('login', JSON.stringify({'error':err}));
            }else{
                if(rows.length == 0){
                    emitter.emit('login', JSON.stringify({'errno':102}));
                }else{
                    var userId = rows[0]['userid'];
                    emitter.emit('login', JSON.stringify({'userid':userId}));
                    db.query('update t_user set status=? where userid=?', [status, userId], function(err, rows){
                        log.trace(userId+" set status:"+status);
                    });
                    db.query('select u.* from (select friendid from t_friends where userid = ?) as f inner join t_user as u on(f.friendid=u.userid)', [userId], function(err, rows){
                        if(err){
                            emitter.emit('login', JSON.stringify({'error':err}));
                        }else{
                            var session = {};
                            sessions[userId] = session;
                            session['socket'] = emitter;
                            var friends = {};
                            session['friends'] = friends;
                            for(i in rows){
                                var friend = rows[i];
                                friends[friend['userid']] = friend;
                            }
                            emitter.emit('init', JSON.stringify(rows));
                            //通知好友上线
                            //to do
                        }
                    });
                }
            }        
        });
    }
}

function onLogout(data){

}
function onFindUserByMail(data){
    var obj = JSON.parse(data);
    log.trace('finduserbymail:', obj);
    var emitter = this;
    var mail = obj['mail'];
    if(!mail)
        emitter.emit('finduserbymail', JSON.stringify({'errno':201}));
    else{
        db.query('select nickname,headimg,status from t_user where mail=?', [mail], function(err, rows){
            if(err){
                emitter.emit('finduserbymail', JSON.stringify({'error':err}));
            }else{
                if(rows.length == 0){
                    emitter.emit('finduserbymail', JSON.stringify({'errno':202}));
                }else{
                    emitter.emit('finduserbymail', JSON.stringify(rows[0]));
                }
            }   
        });
    }
}
function onAddFriendByMail(data){
    var obj = JSON.parse(data);
    var emitter = this;
    var mail = obj['mail'];
    var userId = obj['userid'];
    if(!mail)
        emitter.emit('addfriendbymail', JSON.stringify({'errno':201}));
    else{
        db.query('select userid from t_user where mail=?', [mail], function(err, rows){
            if(err){
                emitter.emit('addfriendbymail', JSON.stringify({'error':err}));
            }else{
                if(rows.length == 0){
                    emitter.emit('addfriendbymail', JSON.stringify({'errno':202}));
                }else{
                    db.query('insert into t_friends (userid, friendid) values (?,?)', [userId, rows[0]['userid']], function(err, rows){
                        if(err){
                            emitter.emit('addfriendbymail', JSON.stringify({'error':err}));
                        }else{
                            emitter.emit('addfriendbymail', JSON.stringify({}));
                        }
                    });
                }
            }   
        });
    }
}

function onIssueStatus(data){

}

function checkMessage(data){
    var obj = parseData(data);
    var userId = obj['userid'];
    var friendId = obj['friendid'];
    var type = obj['type'];
    var content = obj['content'];
    if(!userId || !friendId || !content){
        return {'errno':100};
    }
    if(type == undefined || type<chatMsgType.min || type>chatMsgType.max){
        return {'errno': 301};
    }
    return obj;
}

function onMessage(data){
    log.debug('onMessage:', data);

    var emitter = this;
    var obj = checkMessage(data);

    if(obj['errno']){
        emitter.emit('message', JSON.stringify(obj));    
        return;
    }

    var userId = obj['userid'];
    var friendId = obj['friendid'];
    var type = obj['type'];
    var content = obj['content'];


    var insertTime = new Date();
    time = DateFormat('yyyy-MM-dd hh:mm:ss', insertTime);

    //响应自己
    emitter.emit('message', JSON.stringify({}));
    //发送给朋友
    var friend = sessions[friendId];
    if(friend){
        friend['socket'].emit('message', JSON.stringify({'friendid':friendId, 'type':type, 'content':content, 'time':time}));
    }else{
        //好友离线
    }

    //入库
    var sql = 'insert into t_chatrecord set userid=?,friendid=?,time=?,type=?,content=?'; 
    var args = [userId,friendId,time,type,content];
    db.query(sql, args, function(err, rows){
        if(err){
            log.error('insert message:', err);
            return;
        }
        var recoredId = rows.insertId;
    });

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
