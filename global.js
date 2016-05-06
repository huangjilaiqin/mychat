

var NewestQueue = require('./util.js').NewestQueue;
serverConfig = require('./server.json');

serverConfig.sessionTime = serverConfig.sessionTime;
serverConfig.sessionCheckTime = serverConfig.sessionCheckTime;

//存储房间信息,用户信息
rooms = {}
//根据uid存储用户连接
roomConnections = {}; 
//根据socket的id存储用户信息
socket2user = {};
//历史消息
newestHistory = new NewestQueue(serverConfig.historyNum); 
//在线人数
onlineNum = 0;

issuedType = {
    message:'message',
    roominfo:'roominfo',
    history:'history',
    upline:'upline',
    downline:'downline',
    userinfochange:'userinfochange',
};

costTimes = {
    message:[],
    enterroom:[],
    loadUserSql:[],
    loadUserInfoSqlandCache:[],
};

chatMsgType = {
    min : 0,
    text : 0,
    img : 1,
    file : 2,
    voice : 3,
    video : 4,
    max : 4,
};

userState = {
    online:0,
    offline:1,
};

sessions = {};
//to do 设置token过期时间
tokens = {};


