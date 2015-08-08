
var SocketIO = require('socket.io');
var fs = require('fs');
var mysql = require('mysql');
var async = require('async');
var redis = require('redis');
var os = require('os');


var DateFormat = require('./util.js').DateFormat;
var protocols = require('./protocols.js');
var db = require('./DBPool.js');
var log = require('./log.js').log;
var logPerformance = require('./log.js').logPerformance;

var global = require('./global.js');
var communicate = require('./communicate.js');
var roomBroadcast = communicate.roomBroadcast;
var parseData = require('./util.js').parseData;
var common = require('./common.js');

var redisCli = redis.createClient(serverConfig.redisPort, serverConfig.redisHost);

//暂时处理没有捕获的错误,记录错误日志
process.on('uncaughtException', function (err) {
    log.fatal('uncaughtException:', err);
    log.fatal('uncaughtException code:', err.code);
    log.fatal('uncaughtException:', err.stack);
    // async throw出来的异常 [Error: Callback was already called.]
});


function onDownLine(){
    
}

function loadHistory(cb){
    //获取历史数据
    var sql = 'select * from (select r.* from roomchatrecord as r order by r.time desc limit ?) as t join t_user as u using(userid)';
    var args = [serverConfig.historyNum];
    log.trace('load history');
    db.query(sql, args, function(err, rows){
        if(err){
            console.log('loadHistory err:', err);
            cb(err);
            return;
        }
        
        var i = rows.length - 1;
        var headimgreg = /^\//;
        while(i>=0){
            var row = rows[i--];
            if(headimgreg.test(row['headimg'])){
                row['headimg'] = serverConfig.hostName + row['headimg'];
            }

            var history = {
                id:row['id'],
                userId:row['userid'],
                time: DateFormat('yyyy-MM-dd hh:mm:ss',row['time']),
                type:row['type'],
                content:row['content'],
                nickname:row['nickname'],
                headimg:row['headimg'],
            };
            newestHistory.push(history);
        }
        cb(null, null);
    });
}

function loadRoomsInfo(cb){
    //填充房间数据
    var sql = 'select * from rooms';
    log.trace('load rooms info');
    db.query(sql, [], function(err, rows){
        if(err){
            console.log(err);
            cb(err);
            return;
        } 
        if(rows.length === 0){
            log.error('err', 'room is not exit');
            cb('room is not exit');
            return;
        } 
        for(var i in rows){
            var room = rows[i];
            var roomId = rows[i]['id'];

            //目前只有一个房间,若增加了房间则在redis2Server中做出相应的修改
            serverConfig.roomId = roomId;
            log.trace('roomId:', serverConfig.roomId);

            roomConnections[roomId] = {};
            rooms[roomId] = room;
            room['roommate'] = {};
            //多个房间可以修改成onlineNum_roomid
            redisCli.set('onlineNum', 0);
        }

        log.trace('load rooms info:', rooms);
        //初始化的时候是否加载所以用户的信息(问题:基数很大,但是大部分不在线,如果不下发用户,看历史记录是从列表中找不到该用户的信息)
        //解决:不加载用户列表,只维护在线列表,历史记录特殊处理,下发数据包括用户基本信息(如:名称,头像等)
        cb(null, null);
    });
}

function afterLoadInfo(err, results){
    if(err){
        log.error('afterLoadInfo err:', err);
        return;
    } 

    //启动监听端口
    var io = SocketIO(serverConfig.listenPort);
    console.log('listen on:', serverConfig.listenPort); 

    //注册从redis获取消息的服务
    redis2Server();
    userInfoChange();

    io.on('connection', function(socket){
        log.trace('onConnect:', socket.id);
        for(var protocolName in protocols)
        {
            var protocolFun = protocols[protocolName];
            socket.on(protocolName, protocolFun);
        }
        //socket.emit('message', '连接成功');
        //socket.emit('myConnection', 'R U ok!');
        
        socket.on('disconnect', function(){
            var user = socket2user[socket.id];
            if(user){
                var userId = user['userId'];
                var roomId = user['roomId'];
                //清理数据
                common.onDownline(this, roomId, userId);
            }
            else{
                log.trace(socket.id, 'not enterroom user down line!');
            }
        });
    });
    
    setTimeout(manageSessions, serverConfig.sessionCheckTime);

    var totalmem = os.totalmem();
    var cpus = os.cpus();
    logPerformance.info('totalmem:'+totalmem/1048576+'mb');
    logPerformance.info('cups:'+cpus.length);

    if(serverConfig.analysisPerformanceTime){
        var analysisTime = serverConfig.analysisPerformanceTime;
        setTimeout(function showAnalysis(){
            redisCli.get('onlineNum', function(err, onlineNum){
                if(err){
                    log.error('redisCli get onlineNum error:', err);
                    return;
                }
                var result = common.analyzeTime(onlineNum);

                if(result.length){
                    var loadavg = os.loadavg();
                    logPerformance.info('loadavg:'+loadavg[0]+' '+loadavg[1]+' '+loadavg[2]);
                    var freemem = os.freemem();
                    logPerformance.info('memFreeRate:'+freemem/totalmem);

                    logPerformance.info('online:'+onlineNum);
                    for(var i in result)
                        logPerformance.info(result[i]);
                }
                setTimeout(showAnalysis, analysisTime);
            });
            
        }, analysisTime);
    }
}

function manageSessions(){
    var now = new Date().getTime();
    for(var userid in sessions){
        var session = sessions[userid];
        if(session['state'] == userState.offline && now-session['time']>serverConfig.sessionTime){
            delete sessions[userid];
            log.info('session is out of date:', userid);
        }
    }
    setTimeout(manageSessions, serverConfig.sessionCheckTime);
}

//从redis中获取用户发送的消息
function redis2Server(){
    var ioClient = require('socket.io-client');
    var redis = require('redis');

    var msgSocket = ioClient.connect('http://localhost:'+serverConfig.listenPort);

    //从redis中取数据
    //建立连接
    redis_cli = redis.createClient(serverConfig.redisPort, serverConfig.redisHost);
    //订阅该频道
    redis_cli.subscribe('football_comment:room:0');					
    //监听信息
    var roomId = serverConfig.roomId;
    redis_cli.on('message',function(channel,message){
            log.debug('redis:', message);
            msg = parseData(message);
            var obj = {
                roomId : roomId,
                userId : msg['userid'],
                type : chatMsgType.text,
                content : msg['content'],
            };
            msgSocket.emit('message', JSON.stringify(obj));
    });
}

function userInfoChange(){
    var redis = require('redis');

    //从redis中取数据
    //建立连接
    redis_cli = redis.createClient(serverConfig.redisPort, serverConfig.redisHost);
    //订阅该频道
    redis_cli.subscribe('qqsd_user_change_info');
    //监听信息
    var roomId = serverConfig.roomId;
    redis_cli.on('message',function(channel,message){
            msg = parseData(message);
            log.debug('info change:', msg);
            var session = sessions[parseInt(msg['userid'])];
            if(!session){
                log.error('user is not online', msg['userid']);
                return;
            }
            var info = session['userInfo'];

            //add prefixPath to the img store in our server
            var headimgreg = /^\//;
            if(msg['newheadimg'] && headimgreg.test(msg['newheadimg'])){
                msg['newheadimg'] = serverConfig.hostName + msg['newheadimg'];
            }

            if(info){
                if(msg['newname'])
                    info['nickname'] = msg['newname'];
                if(msg['newheadimg'])
                    info['headimg'] = msg['newheadimg'];
            }

            newestHistory.forEach(function(data){
                if(data['userId'] == msg['userid']){
                    if(msg['newname'])
                        data['nickname'] = msg['newname'];
                    if(msg['newheadimg'])
                        data['headimg'] = msg['newheadimg'];      
                    log.trace('history change', data['userId']);
                }
            });

            roomBroadcast(roomId, -1, issuedType.userinfochange, {roomId:roomId,userId:msg['userid'],nickname:msg['newname'], headimg:msg['newheadimg']});
            
    });
}


function init(){
    async.parallel(
        [
            //加载历史记录
            loadHistory,
            //加载房间数据
            loadRoomsInfo,
        ],
        //启动监听服务
        afterLoadInfo
    );
}

function exit(){

}

init();
