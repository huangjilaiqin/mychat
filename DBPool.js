
var mysql = require('mysql');
var dbConfig = require('./db.json');
var log = require('./log.js').log;

var DBPool = function(config){
    if(!config){
        throw new Error('please apoint config about pool!');
    }
    this.pool = mysql.createPool(config);
};
//增删改查都是用query方法
DBPool.prototype.query = function(sql, args, cb){
    this.pool.getConnection(function(err, connection) {
        if(err){
            cb(err);
            return;
        }
        //connection.query("SET character_set_client=utf8,character_set_connection=utf8");
        //connection.query("set names utf8;");

        connection.query(sql, args, function(err, rows) {
            connection.release();
            cb(err, rows);
        });
    });   
}

DBPool.prototype.end = function(){
    this.pool.end(function(err){
        if(err){
            log.error(err);        
            return;
        }
        log.trace('all connections end');
    });
}

DBPool.prototype.on = function(type, cb){
    this.pool.on(type, cb);
}

DBPool.prototype.releaseConnection = function(connection){
    this.pool.releaseConnection(connection);
}

var pool = new DBPool(dbConfig);
pool.on('connection', function(connection){
    log.trace('new pool connection');
    connection.on('error', function(err){
        //连接长时间不使用,mysql服务器主动关闭
        if(err.code === 'PROTOCOL_CONNECTION_LOST'){
            pool.releaseConnection(this);
            log.trace('mysql server close the connection, remove the connection from poll');
        }
    });
});


module.exports = pool;
