
require('./global.js');
var log = require('./log.js').log;
var logPerformance = require('./log.js').logPerformance;
var communicate = require('./communicate.js');
var roomBroadcast = communicate.roomBroadcast;
var issued = communicate.issued;

function onDownline(socket, roomId, userId){
    delete socket2user[socket.id];
    delete rooms[roomId]['roommate'][userId];
    delete roomConnections[roomId][userId];

    sessions[userId]['userState'] = userState.offline;

    redisCli.decr('onlineNum', function(err, replay){
        log.trace('downline onlineNum:', replay);    
    });
    roomBroadcast(roomId, -1, issuedType.downline, {roomId:roomId,userId:userId});
}

function analyzeTime(onlineNum){

    var analyze = [];

    for(var type in costTimes){
        var costTime = costTimes[type];
        var length = costTime.length;
        if(length<1)
            continue;
        var totalTime = 0;
        var minCost = maxCost = costTime[0][1] - costTime[0][0];
        for(var i=0; i<length; i++){
            var item = costTime[i];
            var cost = item[1] - item[0];
            totalTime += cost;
            if(cost>maxCost)
                maxCost = cost;
            else if(cost<minCost)
                minCost = cost;
        }
        var averageTime = totalTime/length;
        var str = 'type:' + type + ' length:' + length + ' averageTime:' + averageTime + ' maxCost:' + maxCost + ' minCost:' + minCost;
        console.log(str);
        analyze.push(str);
        //将处理过的数据删除
        delete costTimes[type];
        costTimes[type] = [];
    }
    return analyze;
}

module.exports = {
    onDownline : onDownline,
    analyzeTime : analyzeTime,
};
