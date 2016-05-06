


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
var fs = require('fs');
var md5 = require('md5');


var protocols = {
    'register':onRegister,
    'changeUserInfo':onChangeUserInfo,
    'verifyToken':onVerifyToken,
    'loadInitData':onLoadInitData,
    'login':onLogin,
    'logout':onLogout,
    'finduserbymail':onFindUserByMail,
    'addfriendbymail':onAddFriendByMail,
    'addfriend':onAddFriend,
    'changename':onChangename,
    //'issueStatus':onIssueStatus,
    //发送聊天消息
    'message' : onMessage,
    'offlinemessage':onLoadOfflineMessage,
    'history' : onHistory,
    'uploadrun' : onUploadRun,
    'createtag':onCreateTag,
    'gettags':onGetTags,
    //'uploadvideo':onUploadvideo,

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
    var nickname = obj['nickname'];
    var passwd = obj['passwd'];
    var headImg = obj['headImg'];
    log.trace('register', obj);
    var emitter = this;
    if(obj['error']){
        log.trace('register error', obj['error']);
        emitter.emit('register', JSON.stringify(obj));
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
                        db.query('insert into t_user(mail,nickname, passwd) values (?,?,?)', [mail,nickname,passwd], function(err, rows){
                            if(err){
                                emitter.emit('register', JSON.stringify({'error':err}));
                            }else{
                                var userId = rows.insertId;
                                log.info('register userid:'+userId);
                                //写头像
                                if(headImg.length>0){
                                    var buf = new Buffer(headImg, "base64");
                                    headImgPath = serverConfig.img+userId+".jpg"
                                    fs.writeFile(headImgPath, buf, function(err){
                                        if(err){
                                            log.error("write headImg err:"+err);
                                            return;
                                        }
                                        log.info("write headImg success");
                                            
                                    });
                                }
                                emitter.emit('register', JSON.stringify({'userid':userId}));
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
function checkChangeUserInfo(data){
    var obj = JSON.parse(data);
    var mail = obj['mail'];
    var passwd = obj['passwd'];
    var nickname = obj['nickname'];
    if(!nickname)
        return {'error':'error nickname is null'};
    if(!passwd)
        return {'error':'error passwd is null'};
    if(!mail || !mailReg.test(mail))
        return {'error':'error mail address:['+mail+']'};
    
    return obj;
}
function onChangeUserInfo(data){
    log.trace('changeUserInfo', data);
    var obj = checkChangeUserInfo(data);
    var userid = obj['userid'];
    var mail = obj['mail'];
    var nickname = obj['nickname'];
    var passwd = obj['passwd'];
    var headImgName = obj['headImgName'];
    var headImgContent = obj['headImgContent'];
    var emitter = this;
    if(obj['error']){
        log.trace('changeUserInfo error', obj['error']);
        emitter.emit('changeUserInfo', JSON.stringify(obj));
    }else{
        
        db.query('select 1 from t_user where userid = ?', [userid], function(err, rows){
            if(err){
                emitter.emit('changeUserInfo', JSON.stringify({'error':err}));
            }else if(rows.length==0){
                emitter.emit('changeUserInfo', JSON.stringify({'error':'user is not exit'}));
            }else{
                if(headImgName && headImgContent){
                    db.query('update t_user set mail=?,nickname=?, passwd=?, headImg=? where mail=?', [mail,nickname,passwd,headImgName,userid], function(err, rows){
                        if(err){
                            emitter.emit('changeUserInfo', JSON.stringify({'error':err}));
                        }else{
                            log.info('changeUserInfo userid:'+userid);
                            //写头像
                            if(headImgContent.length>0){
                                var buf = new Buffer(headImgContent, "base64");
                                headImgPath = serverConfig.img+headImgName;
                                fs.writeFile(headImgPath, buf, function(err){
                                    if(err){
                                        log.error("write headImg err:"+err);
                                        return;
                                    }
                                    log.info("write headImg success");
                                        
                                });
                            }
                            emitter.emit('changeUserInfo', JSON.stringify({}));
                        }
                    });
                }else{
                    db.query('update t_user set mail=?,nickname=?, passwd=? where mail=?', [mail,nickname,passwd,userid], function(err, rows){
                        if(err){
                            emitter.emit('changeUserInfo', JSON.stringify({'error':err}));
                        }else{
                            log.info('changeUserInfo userid:'+userid);
                            emitter.emit('changeUserInfo', JSON.stringify({}));
                        }
                    });
                }
            }
        });
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

function onVerifyToken(data){
    log.debug('onVerifyToken:', data);
    var obj = checkVerifyToken(data);
    var userid = obj['userid'];
    var token = obj['token'];
    var emitter = this;

    if(obj['error']){
        emitter.emit('verifyToken', JSON.stringify(obj));
    }else{
        if(verifyToken(userid,token)){
            //token有效
            emitter.emit('verifyToken', JSON.stringify({'userid':userid,'token':token}));
        }else{
            //需要登录
            emitter.emit('verifyToken', JSON.stringify({'error':'token is expire', 'errno':401}));
        }
    }
}

function verifyToken(userid,token){
    oldToken=getToken(userid);
    if(token==oldToken){
        //token有效
        return 1;
    }else{
        //需要登录
        return 0;
    }
}

function checkVerifyToken(data){
    var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid || !token){
        return {'error':'error argument'};
    }
    return obj;
}

function getToken(key){
    return tokens[key];
}

function generateToken(userid){
    return md5(userid);    
}

//加载初始信息
function onLoadInitData(data){
    log.debug('onLoadInitData:', data);
    var emitter = this;
    var obj = JSON.parse(data);
    var userid = obj['userid'];
    var token = obj['token'];
    if(!userid||!token){
        emitter.emit('login', JSON.stringify({'error':'error arguments'}));
    }else{
        if(verifyToken(userid,token)==0){
            emitter.emit('loadInitData', JSON.stringify({'error':'token is expire', 'errno':401}));
            return;
        }

        var session = {};
        sessions[userid] = session;
        session['socket'] = emitter;

        newData = loadInitData(userid);
        emitter.emit('loadInitData', JSON.stringify(newData));
    }
}

function loadInitData(userid){
    return {};
}

function onLogin(data){
    log.debug('onLogin:', data);
    var emitter = this;
    var obj = checkLogin(data);
    var mail = obj['mail'];
    var passwd = obj['passwd'];
    if(obj['error']){
        emitter.emit('login', JSON.stringify(obj));
    }else{
        db.query('select userid,mail,nickname,phone,headimg,status from t_user where mail=? and passwd=?', [mail, passwd], function(err, rows){
            if(err){
                emitter.emit('login', JSON.stringify({'error':err}));
            }else{
                if(rows.length == 0){
                    emitter.emit('login', JSON.stringify({'errno':102}));
                }else{
                    var userid = rows[0]['userid'];
                    token = generateToken(userid);
                    tokens[userid] = token;
                    emitter.emit('login', JSON.stringify({'userid':userid,'token':token}));
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

function onAddFriend(data){
    var obj = JSON.parse(data);
    var emitter = this;
    var userid = obj['userid'];
    var friendid = obj['friendid'];
    if(!userid && !friendid)
        emitter.emit('addfriend', JSON.stringify({'error':"argument error"}));
    else{
        db.query('insert into t_friends (userid,friendid) values (?,?)', [userid,friendid], function(err, rows){
            if(err){
                emitter.emit('addfriend', JSON.stringify({'friendid':friendid,'error':JSON.stringify(err)}));
            }else{
                emitter.emit('addfriend', JSON.stringify({'friendid':friendid}));
            }
        });
    }
}

function onChangename(data){
    var obj = JSON.parse(data);
    var emitter = this;
    var userid = obj['userid'];
    var name = obj['name'];
    if(!userid && !name)
        emitter.emit('changename', JSON.stringify({'error':"argument error"}));
    else{
        db.query('update t_user set nickname=? where userid=?', [name,userid], function(err, rows){
            if(err){
                emitter.emit('changename', JSON.stringify({'error':JSON.stringify(err)}));
            }else{
                emitter.emit('changename', JSON.stringify({'userid':userid,'name':name}));
            }
        });
    }
}

function onIssueStatus(data){

}

function checkMessage(data){
    var obj = parseData(data);
    var userId = obj['userid'];
    var chatgroupId = obj['chatgroupId'];
    var type = obj['type'];
    var content = obj['content'];
    if(!userId || !chatgroupId || !content){
        return {'errno':100,'error':'error args'};
    }
    if(type == undefined || type<chatMsgType.min || type>chatMsgType.max){
        return {id:userId, 'errno': 301};
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

    var id = obj['id'];
    var chatgroupId = obj['chatgroupId'];
    var userid = obj['userid'];
    var friendid = obj['friendid'];
    var type = obj['type'];
    var content = obj['content'];
    var seq = obj['seq'];


    var insertTime = new Date();
    time = DateFormat('yyyy-MM-dd hh:mm:ss', insertTime);

    //入库
    var sql = 'insert into t_chatrecord set id=?,chatgroup_id=?,time=?,userid=?,type=?,content=?'; 
    var args = [id,chatgroupId,time,userid,type,content];
    db.query(sql, args, function(err, rows){
        if(err){
            log.error('insert message:', err);
            return;
        }
        var seq = rows.insertId;
        //响应自己
        emitter.emit('messageResp', JSON.stringify({'id':id,'chatgroupId':chatgroupId, 'seq':seq}));
        //发送给朋友
        var friend = sessions[friendid];
        if(friend){
            log.info(userid+" to "+friendid+" "+content);
            friend['socket'].emit('message', JSON.stringify({'chatgroupId':chatgroupId ,'userid':userid, 'type':type, 'content':content, 'time':time,'seq':seq}));
        }else{
            //好友离线
            log.info('friend:'+friendid+" is offline!");
            for(key in sessions){
                log.info('friendid:'+key+", "+typeof(key)+", "+typeof(friendid));
            }
        }
    });
}

function checkLoadOfflineMessage(data){
    var obj = parseData(data);
    var userid = obj['userid'];
    var args = obj['args'];
    if(!userid||!args){
        return {'errno':100,'error':'error args'};
    }
    return obj;
}

function onLoadOfflineMessage(data){
    log.debug('onLoadOfflineMessage:', data);
    console.log('onLoadOfflineMessage:', data);

    var emitter = this;
    var obj = checkLoadOfflineMessage(data);
    if(obj['errno']){
        emitter.emit('offlinemessage', JSON.stringify(obj));    
        return;
    }

    var userid = obj['userid'];
    var args = obj['args'];

    console.log(args);
    sql = 'select * from t_chatrecord where chatgroup_id=? and seq>? order by seq;'
    for(chatgroupId in args){
        seq = args[chatgroupId] 
        db.query(sql, [chatgroupId,seq], function(err, rows){
            if(err){
                emitter.emit('offlinemessage', JSON.stringify({'error':JSON.stringify(err)}));
                return;
            }
            for(i in rows){
                row = rows[i];
                row['chatgroupId']=row['chatgroup_id'];
                delete row['chatgroup_id'];
            }
            emitter.emit('offlinemessage', JSON.stringify({'datas':rows}));
        });
    }

    /*
    var sql = 'insert into t_chatrecord set id=?,chatgroup_id=?,time=?,userid=?,type=?,content=?'; 
    var args = [id,chatgroupId,time,userid,type,content];
    db.query(sql, args, function(err, rows){
        if(err){
            log.error('insert message:', err);
            return;
        }
        var seq = rows.insertId;
        //响应自己
        emitter.emit('offlinemessage', JSON.stringify({'id':id,'chatgroupId':chatgroupId, 'seq':seq}));
    });
    */
}

function checkCreateTag(data){
    var obj = parseData(data);
    var userId = obj['userid'];
    var name = obj['name'];
    var seq = obj['seq'];
    if(!userId || !name || !seq){
        return {id:userId, 'error':'format error:'+data};
    }
    return obj;
}
function onCreateTag(data){
    log.debug('onCreateTag:', data);

    var emitter = this;
    var obj = checkCreateTag(data);

    if(obj['errno']){
        emitter.emit('createtag', JSON.stringify(obj));    
        return;
    }

    var userId = obj['userid'];
    var name = obj['name'];
    var seq = obj['seq'];

    var sql = 'insert into action_tags set userid=?,name=?'; 
    var args = [userId,name];
    db.query(sql, args, function(err, rows){
        if(err){
            log.error('insert tags:', err);
            return;
        }
        var recoredId = rows.insertId;
        emitter.emit('createtagResp', JSON.stringify({'id':recoredId,'name':name, 'seq':seq}));
    });
}

function checkGetTags(data){
    var obj = parseData(data);
    var userId = obj['userid'];
    if(!userId){
        return {id:userId, 'error':'format error:'+data};
    }
    return obj;
}
function onGetTags(data){
    log.debug('onGetTags:', data);

    var emitter = this;
    var obj = checkGetTags(data);

    if(obj['errno']){
        emitter.emit('gettagsResp', JSON.stringify(obj));    
        return;
    }

    var userId = obj['userid'];

    var sql = 'select * from action_tags where userid=?'; 
    var args = [userId];
    db.query(sql, args, function(err, rows){
        if(err){
            log.error('insert tags:', err);
            return;
        }
        for(var i=0;i<rows.length;i++){
            delete rows[i]['userid'];
        }
        emitter.emit('gettagsResp', JSON.stringify({'tagDatas':rows}));
    });
}

function checkUploadVideo(data){
    var obj = parseData(data);
    var userId = obj['userid'];
    var name = obj['name'];
    var format = obj['format'];
    var seq = obj['seq'];
    if(!userId || !name || !seq ||!format){
        return {id:userId, 'error':'format error:'+data};
    }
    return obj;
}
function onUploadVideo(data){
    log.debug('onUploadVide:', data);

    var emitter = this;
    var obj = checkUploadVideo(data);

    if(obj['errno']){
        emitter.emit('uploadvideo', JSON.stringify(obj));    
        return;
    }

    var userId = obj['userid'];
    var name = obj['name'];
    var tags = obj['tags'];
    var notice = obj['notice'];
    var format = obj['format'];
    var seq = obj['seq'];

    var videoName = '';
    var videoPath = '';
    var sql = 'insert into action_video set userid=?,name=?,tags=?,notice=?,video=?'; 
    var args = [userId,name,tags,notice,];
    db.query(sql, args, function(err, rows){
        if(err){
            log.error('insert tags:', err);
            return;
        }
        var recoredId = rows.insertId;
        emitter.emit('createtagResp', JSON.stringify({'id':recoredId, 'seq':seq}));
    });
}

function checkHistory(data){
    var obj = parseData(data);
    var userId = obj['userid'];
    var friendId = obj['friendid'];
    var id = obj['id'];
    var content = obj['content'];
    if(!userId || !friendId || !id){
        return {id:userId, 'errno':100};
    }
    return obj;
}

function onHistory(data){
    log.debug('onHistory:', data);

    var emitter = this;
    var obj = checkHistory(data);

    if(obj['errno']){
        emitter.emit('message', JSON.stringify(obj));    
        return;
    }

    var userId = obj['userid'];
    var friendId = obj['friendid'];
    var id = obj['id'];

    //查库
    var sql = 'select * from t_chatrecord where ((userid=? and friendid=?) or (friendid=? and userid=?)) and id<? order by id desc limit 10'; 
    var args = [userId,friendId,userId,friendId,id];
    if(id == undefined || id<=0){
        sql = 'select * from t_chatrecord where ((userid=? and friendid=?) or (friendid=? and userid=?)) order by id desc limit 10'; 
        args = [userId,friendId,userId,friendId];   
    }
    db.query(sql, args, function(err, rows){
        if(err){
            log.error('insert message:', err);
            return;
        }
        for(var i=0;i<rows.length;i++){
            var row = rows[i];
            log.info(row.content+", "+row.time);
        }
        log.info(JSON.stringify({'friendid':friendId, 'messages':rows}));
        emitter.emit('history', JSON.stringify({'friendid':friendId, 'messages':rows}));
    });
}

function checkRunData(data){
    var obj = parseData(data);
    var userId = obj['userid'];
    var myload = obj['myload'];
    var mytime = obj['mytime'];
    if(!userId){
        return {id:userId, 'errno':100};
    }
    return obj;
}

function onUploadRun(data){
    log.debug('onUploadRun:', data);

    var emitter = this;
    var obj = checkRunData(data);

    if(obj['errno']){
        emitter.emit('uploadrun', JSON.stringify(obj));    
        return;
    }

    var userId = obj['userid'];
    var myloadStr = data['myload'];
    var mytimeStr = obj['mytime'];

    log.debug('userid:'+userId, "myload:"+myloadStr, "mytime:"+mytimeStr);

    db.query('insert into t_run(userid,load,time,uploadtime) values (?,?,?,?)', [userId, myloadStr, mytimeStr, new Date()], function(err, rows){
        emitter.emit('uploadrun', JSON.stringify({'userid':userId}));
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
