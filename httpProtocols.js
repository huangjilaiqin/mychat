
var express= require('express');
console.log('express');
var app = express();
var formidable = require('formidable');
var global = require('./global.js');
var db = require('./DBPool.js');
var util = require('./util.js');
var log = require('./log.js').logHttpProtocol;

// GET method route
app.get('/httproute', function (req, res) {
    res.send('GET request to the homepage')
    res.end();
});
app.get('/httproute/1', function (req, res) {
    res.send('GET request to the homepage 1')
    res.end();
});
app.get('/ws', function (req, res) {
    res.send('GET request to the homepage ws 5003')
    res.end();
});




// POST method route
app.post('/httproute/show', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = serverConfig.imgPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 20 * 1024 * 1024;

    log.trace('show');
    form.parse(req, function(err, fields, files) {
        sql = "insert into showtime(userid,time,address,content,pictures,permission,ats) values(?,?,?,?,?,?,?)";
        var time = new Date();
        var timeStr = util.DateFormat('yyyy-MM-dd hh:mm:ss', time.getTime())
        //1:public
        if(fields['permission']==null)
            fields['permission'] = 1;
        //replace pictures name
        //fields['pictures']
        var imgPath = serverConfig.imgPath;
        for(var picName in files){
            var rename = files[picName]['path'].replace(imgPath, "");
            fields['pictures'] = fields['pictures'].replace(picName, rename);
        }
        values = [fields['userid'], time, fields['address'], fields['content'], fields['pictures'],fields['permission'],fields['ats']];
        db.query(sql, values, function(err, rows){
            if(err!=null){
                console.log(err);
                return;
            }
            var showId = rows.insertId;
            res.writeHead(200, {'content-type': 'text/plain'});
            var resData = {'showid':showId, 'time':timeStr};
            res.write(JSON.stringify(resData));
            res.end();
        });
    });
    return;
});

app.post('/httproute/getshow', function (req, res) {
    var form = new formidable.IncomingForm();

    log.trace('getshow');
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var id = fields['id'];
        var sql;
        var values = [];

        sql = "select a.id as aid,a.userid,a.time,a.address,a.content,a.pictures,a.permission,a.ats,b.id as bid,b.liker,c.id as cid,c.commentuid,c.becommentuid,c.comment,c.time as commenttime from showtime a left join `like` b on (a.id=b.showid) left join comment c on (a.id=c.showid) where a.userid=? and a.id>? and a.id<?";
        if(id==null){
            id = 0;
        }
        values[0] = userid;
        values[1] = id;
        values[2] = id+10;

        db.query(sql, values, function(err, rows){
            if(err!=null){
                console.log(err);
                return;
            }
            showdatas = [];
            console.log(rows);
            log.info('getshow ', rows);
            for(var i in rows){
                var row = rows[i];
                if(!showdatas[row['aid']]){
                    comments = [];
                    liker = [];
                    if(row['liker']){
                        likerStrArray = row['liker'].split(',');
                        for(var i in likerStrArray){
                            liker.push(parseInt(likerStrArray[i]));  
                        }
                    }
                    pictures = [];
                    if(row['pictures']){
                        pictures = row['pictures'].split('##');
                    }
                    showdatas[row['aid']] = {
                        'id':row['aid'],
                        userid:row['userid'],
                        time:row['time'],
                        address:row['address'],
                        content:row['content'],
                        pictures:pictures,
                        permission:row['permission'],
                        ats:row['ats'],
                        liker:liker,
                        comments:comments,
                    }; 
                    commentItem = {
                        id:row['cid'],
                        commentuid:row['commentuid'],
                        becommentuid:row['becommentuid'],
                        comment:row['comment'],
                        time:row['time'],
                        };
                    comments.push(commentItem);
                }else{
                    // to do sort comment
                    comments = showdatas[row['aid']]['comment'];
                    commentItem = {
                        id:row['cid'],
                        commentuid:row['commentuid'],
                        becommentuid:row['becommentuid'],
                        comment:row['comment'],
                        time:row['time'],
                        };
                    comments.push(commentItem);
                }
            }
            //to do sort showdatas
            var showArray = [];
            for(var key in showdatas){
               showArray.push(showdatas[key]); 
            } 
            res.writeHead(200, {'content-type': 'text/plain'});
            res.write(JSON.stringify(showArray));
            res.end();
            log.info('getshow response');
        });
    });
    return;
});


//to do 楠岃瘉
//register
app.post('/httproute/register', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var mail = fields['mail'];
        var nickname = fields['nickname'];
        var passwd = fields['passwd'];
        if(mail==undefined || mail=="" || nickname==undefined || nickname=="" || passwd==undefined || passwd==""){
            res.writeHead(200, {'content-type': 'text/plain'});
            var resData = {'error':"error arguments"};
            res.write(JSON.stringify(resData));
            res.end();
            return;
        }
        log.trace('register:',mail, nickname, passwd);
        checkMail = 'select 1 from t_user where mail=?'
        db.query(checkMail, [mail], function(err, rows){
            if(err!=null){
                res.writeHead(200, {'content-type': 'text/plain'});
                var resData = {'error':err};
                res.write(JSON.stringify(resData));
                res.end();
                return;
            }
            if(rows.length>0){
                res.writeHead(200, {'content-type': 'text/plain'});
                var resData = {'error':'mail is already register'};
                res.write(JSON.stringify(resData));
                res.end();
                return;
            }else{
                sql = "insert into t_user(mail,nickname,passwd)values(?,?,?)";
                values = [mail, nickname, passwd];
                db.query(sql, values, function(err, rows){
                    if(err!=null){
                        res.writeHead(200, {'content-type': 'text/plain'});
                        var resData = {'error':err};
                        res.write(JSON.stringify(resData));
                        res.end();
                        return;
                    }
                    var userid = rows.insertId;
                    res.writeHead(200, {'content-type': 'text/plain'});
                    var resData = {'userid':userid};
                    res.write(JSON.stringify(resData));
                    res.end();
                    log.trace('register success:',mail, nickname, passwd);
                });
            }
        });
    });
});

app.post('/httproute/vedios', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = serverConfig.vedioPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 20 * 1024 * 1024;

    form.parse(req, function(err, fields, files) {
        sql = "insert into action_vedios (userid,name,tags,notice,vedio) values(?,?,?,?,?)";
        var vedioFileName = files['vediofile']['path'].replace(serverConfig.vedioPath, "");
        values = [fields['userid'], fields['name'], fields['tags'], fields['notice'], vedioFileName];
        db.query(sql, values, function(err, rows){
            if(err!=null){
                console.log(err);
                return;
            }
            var vedioId = rows.insertId;
            res.writeHead(200, {'content-type': 'text/plain'});
            var resData = {'vedioid':vedioId};
            res.write(JSON.stringify(resData));
            res.end();
        });
    });
    return;
});


app.listen(5003);
log.trace('http protocol listen on 5003')

