
var express= require('express');
var fs = require('fs');
console.log('express');
var app = express();
var formidable = require('formidable');
var global = require('./global.js');
var db = require('./DBPool.js');
var util = require('./util.js');
var log = require('./log.js').logHttpProtocol;

var videoPath = serverConfig.videoPath;
var imgPath = serverConfig.imgPath

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

function arrayRemoveElement(elements, e){
    var i = elements.indexOf(e);
    if(i != -1) {
        elements.splice(i, 1);
    }
}
app.post('/httproute/test', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.keepExtensions = true;

    form.parse(req, function(err, fields, files) {
        if(err!=null){
            responseError(res, err);
            return;
        }
        console.log(fields)
        console.log(fields['str'])
    });
});


// POST method route
app.post('/httproute/show', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = serverConfig.imgPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 20 * 1024 * 1024;

    
    form.parse(req, function(err, fields, files) {
        log.trace('show');
        console.log('show:', fields['userid']);
        if(err!=null){
            responseError(res, err);
            return;
        }
        sql = "insert into showtime(userid,time,address,content,pictures,permission,ats) values(?,?,?,?,?,?,?)";
        var time = new Date();
        var timeStr = util.DateFormat('yyyy-MM-dd hh:mm:ss', time.getTime())
        //1:public
        if(fields['permission']==null)
            fields['permission'] = 1;
        //replace pictures name
        //fields['pictures'] 鏍煎: name1.jpg##name2.jpg
        var imgPath = serverConfig.imgPath;
        //files key: origin file name
        for(var picName in files){
            var rename = files[picName]['path'].replace(imgPath, "");
            fields['pictures'] = fields['pictures'].replace(picName, rename);
        }
        values = [fields['userid'], time, fields['address'], fields['content'], fields['pictures'],fields['permission'],fields['ats']];
        db.query(sql, values, function(err, rows){
            if(err!=null){
                responseError(res, err);
                return;
            }
            var showId = rows.insertId;
            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var resData = {'showid':showId, 'time':timeStr, 'pictures':fields['pictures'].split('##')};
            res.write(JSON.stringify(resData));
            res.end();
            console.log('show success, showid:', showId);
        });
    });
    return;
});

function responseGetshow(userid,id,direct,pageNum,req,res){
    log.trace('getshow userid:',userid," id:", id,' direct:',direct,' pageNum:',pageNum);
    console.log('getshow userid:',userid," id:", id,' direct:',direct,' pageNum:',pageNum);
    var minid = id-pageNum;
    var sql;
    if(direct=='backward'){
        sql = "select id from showtime where id<? order by time desc limit "+pageNum;
    }else{
        sql = "select id from showtime where id>? order by time desc limit "+pageNum;
    }
    db.query(sql, [id], function(err, rows){
        if(err!=null){
            responseError(res, err);
            return;
        }else{
            if(rows.length==0){
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                res.write(JSON.stringify({'showdatas':[], 'direct':direct}));
                res.end();
                log.info('getshow response');
                return;
            }
            var ids = [];
            for(i in rows){
                ids.push(rows[i]['id']); 
            }
            console.log(ids)
            var idsStr = ids.join(',');

            sql = "select a.id as aid,a.userid,u.nickname,u.headimg,a.time,a.address,a.content,a.pictures,a.permission,a.ats,b.id as bid,b.liker,c.id as cid,c.commentuid,c.becommentuid,c.comment,c.time as commenttime from showtime a left join `like` b on (a.id=b.showid) left join comment c on (a.id=c.showid) left join t_user u on a.userid=u.userid where a.id in ("+idsStr+")";
            db.query(sql, [], function(err, rows){
                if(err!=null){
                    responseError(res, err);
                    return;
                }
                showdatas = [];
                //console.log(rows);
                //log.info('getshow ', rows);
                for(var i in rows){
                    var row = rows[i];
                    if(!showdatas[row['aid']]){
                        comments = [];
                        liker = [];
                        likeStatus = 0;
                        if(row['liker']){
                            likerStrArray = row['liker'].split(';');
                            for(var i in likerStrArray){
                                likeUserid = parseInt(likerStrArray[i])
                                liker.push(likeUserid);  
                                if(likeUserid==userid)
                                    likeStatus = 1;
                            }
                        }
                        pictures = [];
                        if(row['pictures']){
                            pictures = row['pictures'].split('##');
                        }
                        showdatas[row['aid']] = {
                            'id':row['aid'],
                            userid:row['userid'],
                            nickname:row['nickname'],
                            headimg:row['headimg'], 
                            time:row['time'],
                            address:row['address'],
                            content:row['content'],
                            pictures:pictures,
                            permission:row['permission'],
                            ats:row['ats'],
                            liker:liker,
                            likeStatus:likeStatus,
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
                showArray.sort(function(a,b){return a['time']<b['time']?1:-1});
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                res.write(JSON.stringify({'showdatas':showArray, 'direct':direct}));
                res.end();
                log.info('getshow response');
            });
        }
            
    });
    
}

app.post('/httproute/getshow', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var pageNum = fields['pagenum'];
        var userid = fields['userid'];
        var id = fields['id'];
        // backward, forward
        var direct = fields['direct']? fields['direct']:'backward';

        if(id==null){
            var newIdSql = 'select id from showtime order by time desc limit 1';
            db.query(newIdSql, [], function(err, rows){
                if(err){
                    responseError(res, err);
                }else{
                    if(rows.length==0){
                        id = 0;
                    }else{
                        id = rows[0]['id']+1;
                    }
                    console.log('newest id:', id);
                    responseGetshow(userid,id,direct,pageNum,req,res)
                }
            });

        }else{
            responseGetshow(userid,id,direct,pageNum,req,res)
        }
    });//form
    return;
});

app.post('/httproute/actions', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];

        var sql = 'select * from actions where userid = ?';
        db.query(sql, [userid], function(err, rows){
            if(err){
                responseError(res, err);
            
            }else{
                actionDatas = [];
                for(var i in rows){
                    row = rows[i];
                    actionDatas.push({
                        id:row['id'],
                        name:row['name'],
                        videoName:row['video_name'],
                        tags:row['tags']?row['tags'].split(','):[],
                        notices:row['notices']?row['notices'].split('##'):[],
                    });
                } 
                console.log('actioins length:', actionDatas.length);
                console.log(JSON.stringify({'actionDatas':actionDatas}));
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                res.write(JSON.stringify({'actionDatas':actionDatas}));
                res.end();
            }
        });
    });//form
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
            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var resData = {'error':"error arguments"};
            res.write(JSON.stringify(resData));
            res.end();
            return;
        }
        log.trace('register:',mail, nickname, passwd);
        checkMail = 'select 1 from t_user where mail=?'
        db.query(checkMail, [mail], function(err, rows){
            if(err!=null){
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                var resData = {'error':err};
                res.write(JSON.stringify(resData));
                res.end();
                return;
            }
            if(rows.length>0){
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                var resData = {'error':'mail is already register'};
                res.write(JSON.stringify(resData));
                res.end();
                return;
            }else{
                sql = "insert into t_user(mail,nickname,passwd)values(?,?,?)";
                values = [mail, nickname, passwd];
                db.query(sql, values, function(err, rows){
                    if(err!=null){
                        res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                        var resData = {'error':err};
                        res.write(JSON.stringify(resData));
                        res.end();
                        return;
                    }
                    var userid = rows.insertId;
                    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                    var resData = {'userid':userid};
                    res.write(JSON.stringify(resData));
                    res.end();
                    log.trace('register success:',mail, nickname, passwd);
                });
            }
        });
    });
});

app.post('/httproute/like', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var showid = fields['showid'];
        var position = fields['position'];
        log.trace('like', userid, showid, position);

        if(userid==null || showid==null || position==null){
            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var resData = {'error':'argments error'};
            res.write(JSON.stringify(resData));
            res.end();
            return;
        }
        var sql = 'select liker,size from `like` where showid=?';
        db.query(sql, [showid], function(err, rows){
            if(err!=null){
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                var resData = {'error':JSON.stringify(err)};
                console.log('select liker:', resData);
                res.write(JSON.stringify(resData));
                res.end();
                return;
            }
            if(rows.length>0){
                row = rows[0];
                liker = row['liker'].split(';');
                size = row['size'];
                liker.push(userid);
                size++;
                var sql = 'update `like` set liker=?,size=? where showid=?'; 
                db.query(sql, [liker.join(';'),size,showid], function(err, rows){
                    if(err!=null){
                        res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                        var resData = {'error':JSON.stringify(err)};
                        console.log('select liker:', resData);
                        res.write(JSON.stringify(resData));
                        res.end();
                        return;
                    }
                    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                    res.write(JSON.stringify({'showid':showid,'position':position}));
                    res.end();
                });
            }else{
                liker = userid;
                size = 1;
                var sql = 'insert into `like` (liker,size,showid)values(?,?,?)'; 

                console.log('insert like:',liker,size,showid);

                db.query(sql, [liker,size,showid], function(err, rows){
                    if(err!=null){
                        res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                        var resData = {'error':JSON.stringify(err)};
                        console.log(resData);
                        res.write(JSON.stringify(resData));
                        res.end();
                        return;
                    }
                    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                    res.write(JSON.stringify({'showid':showid,'position':position}));
                    res.end();
                });
            }
        });
    });
});

app.post('/httproute/unlike', function (req, res) {
    var form = new formidable.IncomingForm();

    log.trace('unlike');
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var showid = fields['showid'];
        var position = fields['position'];
        log.info('unlike ', userid, showid, position);
        
        if(userid==null || showid==null || position==null){
            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var resData = {'error':'argments error'};
            res.write(JSON.stringify(resData));
            res.end();
            return;
        }
        var sql = 'select liker,size from `like` where showid=?';
        db.query(sql, [showid], function(err, rows){
            if(err!=null){
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                var resData = {'error':JSON.stringify(err)};
                res.write(JSON.stringify(resData));
                res.end();
                log.info('unlike select error', err);
                return;
            }
            if(rows.length>0){
                row = rows[0];
                liker = row['liker'].split(';');
                size = row['size'];
                arrayRemoveElement(liker, ''+userid);
                size--;
                var sql = 'update `like` set liker=?,size=? where showid=?'; 
                db.query(sql, [liker.join(';'),size,showid], function(err, rows){
                    if(err!=null){
                        res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                        var resData = {'error':JSON.stringify(err)};
                        res.write(JSON.stringify(resData));
                        res.end();
                        log.info('unlike update error', err);
                        return;
                    }
                    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                    res.write(JSON.stringify({'showid':showid,'position':position}));
                    res.end();
                });
            }else{
                log.error('unlike error, the user never like this show, '+showid);
            }
        });
    });
});

app.post('/httproute/action/add', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = videoPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 20 * 1024 * 1024;

    form.parse(req, function(err, fields, files) {
        sql = "insert into actions (userid,name,tags,notices,video_name) values(?,?,?,?,?)";
        console.log(files)
        var videoFileName = files['videofile']['path'].replace(videoPath, "");
        var userId = fields['userId']
        var actionItem = JSON.parse(fields['actionItem'])
        tagsStr = JSON.stringify(actionItem['tags'])
        noticesStr = JSON.stringify(actionItem['notices'])
        values = [userId, actionItem['name'], tagsStr, noticesStr, videoFileName];
        db.query(sql, values, function(err, rows){
            if(err!=null){
                responseError(res, err);
                return;
            }
            var actionId = rows.insertId;
            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var resData = {'actionId':actionId, 'videoName':videoFileName};
            res.write(JSON.stringify(resData));
            res.end();
        });
    });
    return;
});

app.post('/httproute/action/delete', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        sql = "delete from actions where id=?";
        videoFileName = fields['name'];
        actionId = fields['id'];
        console.log('delete action, id:',actionId);
        values = [actionId];
        db.query(sql, values, function(err, rows){
            if(err!=null){
                responseError(res, err);
                return;
            }

            fs.unlink(videoPath+videoFileName, function(err){
                if(err){
                    responseError(res, err);
                }else{
                    console.log('rm success');
                }
            });

            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var resData = {'actionId':actionId, 'videoName':videoFileName};
            res.write(JSON.stringify(resData));
            res.end();
        });
    });
    return;
});

app.post('/httproute/action/update', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = videoPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 20 * 1024 * 1024;

    form.parse(req, function(err, fields, files) {
        actionItemStr = fields['actionItem']
        var actionItem = JSON.parse(actionItemStr);
        var oldVideoName = actionItem['videoName']
        var actionId = actionItem['id']
        var actionName = actionItem['name']
        var tagsStr = actionItem['tags'].join(',')
        var noticesStr = actionItem['notices'].join('##')

        if(files['videofile']!=null){
            sql = "update actions set name=?,tags=?,notices=?,video_name=? where id=?";
            var videoFileName = files['videofile']['path'].replace(videoPath, "");
            console.log('update video file:', videoPath, videoFileName);
            
            values = [actionItem['name'], tagsStr, noticesStr, videoFileName, actionId];
            
            db.query(sql, values, function(err, rows){
                if(err!=null){
                    responseError(res, err);
                    return;
                }
                //delete old video file
                fs.unlink(videoPath+oldVideoName, function(err){
                    if(err){
                        responseError(res, err);
                    }else{
                        console.log('rm success');
                    }
                });
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                var resData = {'actionId':actionId, 'videoName':videoFileName};
                res.write(JSON.stringify(resData));
                res.end();
            });
        }else{
            //without update video
            sql = "update actions set name=?,tags=?,notices=? where id=?";
            values = [actionName, tagsStr, noticesStr, actionId];
            db.query(sql, values, function(err, rows){
                if(err!=null){
                    responseError(res, err);
                }else{
                    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                    var resData = {'actionId':actionId};
                    res.write(JSON.stringify(resData));
                    res.end();
                }
            });
        }
    });
    return;
});

app.post('/httproute/lesson/add', function (req, res) {
    var form = new formidable.IncomingForm();
    form.multiples = true;
    form.uploadDir = imgPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 2 * 1024 * 1024;

    form.parse(req, function(err, fields, files) {
        sql = "insert into lessons(userid,name,cover,bodies,address,purpose,cost_time,description,actions_id) values(?,?,?,?,?,?,?,?,?)";
        var userId = fields['userId']
        var lesson = JSON.parse(fields['lesson'])
        var coverFileName = files['cover']['path'].replace(imgPath, "");
        bodiesStr = lesson['bodies'].join(',');
        actionsIdStr = lesson['actionsId'].join(',');
        values = [userId,lessons['name'],coverFileName,bodiesStr,lessons['address'],lessons['purpose'],lessons['cost_time'],lessons['description'],actionsIdStr]];
        db.query(sql, values, function(err, rows){
            if(err!=null){
                responseError(res,err);
            }else{
                var id = rows.insertId;
                responseNormal(res, {'id':id});
            }
        });
    });
});

function responseError(res, error){
    console.log(error);
    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
    res.write(JSON.stringify({'error':JSON.stringify(error)}));
    res.end();
}

app.post('/httproute/lessons', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userId = fields['userId'];

        var sql = 'select * from lessons where userid = ?';
        db.query(sql, [userId], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                lessons = [];
                for(var i in rows){
                    row = rows[i];
                    lessons.push({
                        id:row['id'],
                        name:row['name'],
                        videoName:row['cover'],
                        bodies:row['bodies'],
                        address:row['address'],
                        purpose:row['purpose'],
                        costTime:row['cost_time'],
                        description:row['description'],
                        actionsId:row['actions_id'],
                    });
                } 
                responseNormal(res, {'lessons':lessons});
            }
        });
    });
});

app.post('/httproute/lesson/delete', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userId = fields['userId'];
        var id = fields['id'];
        sql = 'delete from lessons where id=? and userid=?'
        db.query(sql, [id, userId], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                responseNormal(res, {'id':id})
            }
        });
    });
});

function responseNormal(res, data){
    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
    res.write(JSON.stringify(data));
    res.end();
}

app.post('/httproute/lesson/update', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = imgPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 2 * 1024 * 1024;

    form.parse(req, function(err, fields, files) {
        var userId = fields['userId'];
        var lesson = JSON.parse(fields['lesson']);
        bodiesStr = lesson['bodies'].join(',')
        actionsIdStr = lessons['actionsId'].join(',')
        if(files['cover']!=null){
            var coverFileName = files['cover']['path'].replace(imgPath, "");
            values = [lessons['name'],coverFileName,bodiesStr,lessons['address'],lessons['purpose'],lessons['cost_time'],lessons['description'],actionsIdStr, lesson['id']];
            sql = "update lessons set name=?,cover=?,bodies=?,address=?,purpose=?,cost_time=?,description=?,actions_id=? where id=?";
            db.query(sql, values, function(err, rows){
                if(err!=null){
                    responseError(res,err);
                }else{
                    responseNormal(res, {'id':id});
                }
            });
        }else{
            values = [lessons['name'],bodiesStr,lessons['address'],lessons['purpose'],lessons['cost_time'],lessons['description'],actionsIdStr,lesson['id']];
            sql = "update lessons set name=?,bodies=?,address=?,purpose=?,cost_time=?,description=?,actions_id=? where id=?";
            db.query(sql, values, function(err, rows){
                if(err!=null){
                    responseError(res,err);
                }else{
                    responseNormal(res, {'id':id});
                }
            });
        }
    });
});


app.listen(5003);
log.trace('http protocol listen on 5003')

