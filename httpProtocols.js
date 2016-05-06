
var express= require('express');
var fs = require('fs');
var path = require('path');
var app = express();
var formidable = require('formidable');
var global = require('./global.js');
var db = require('./DBPool.js');
var util = require('./util.js');
var log = require('./log.js').logHttpProtocol;

var videoPath = serverConfig.videoPath;
var imgPath = serverConfig.imgPath
var async = require("async");


//login
app.post('/httproute/login', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var mail = fields['mail'];
        var passwd = fields['passwd'];
        if(mail==undefined || mail=="" || passwd==undefined || passwd==""){
            responseError(res, "argument is error");  
        }else{
            var sql = 'select * from t_user where mail=? and passwd=?';
            db.query(sql, [mail,passwd], function(err, rows){
                if(err!=null){
                    responseError(res, err);
                }else if(rows.length>0){
                    responseNormal(res, rows[0]);    
                }else{
                    responseError(res, "user is not exit"); 
                }
            });
        }
    });
});

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

//-----------------show
app.post('/httproute/showtime/add', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = serverConfig.imgPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 20 * 1024 * 1024;

    
    form.parse(req, function(err, fields, files) {
        var showTime = JSON.parse(fields['showTime']);
        var userId = showTime['userId'];
        mylog('show add ', userId);
        if(err!=null){
            responseError(res, err);
            return;
        }
        if(isAnyUndefined([showTime,userId])){
            responseError(res, "error argument");
            return;
        }
        sql = "insert into showtime(userid,time,address,content,pictures,pics_size,pics_color,permission,ats) values(?,?,?,?,?,?,?,?,?)";
        var now = new Date();
        //1:public
        if(fields['permission']==null)
            fields['permission'] = 1;

        var imgPath = serverConfig.imgPath;
        //文件夹格式 uid_timeMs_index.jpg
        var imgNamePrefix = userId+"_"+Date.now()
        var newPicNames = [];
        //重命名文件
        pictures = showTime['pictures'];
        for(var index in pictures){
            var picName = pictures[index];
            var oldName = files[picName]['path'];
            var extname = path.extname(oldName);
            var newName = imgNamePrefix+'_'+index+extname;
            var newPathName = imgPath+newName;
            newPicNames.push(newName);
            fs.rename(oldName , newPathName,function(err){
                if(err!=undefined){
                    console.log('pic rename error:',err);   
                }else{
                    console.log('rename '+newName+" success");    
                }
            });
            index++;
        }
        //获取图片大小
        picsSizeStr = JSON.stringify(showTime['picsSize']);
        //获取图片颜色
        picsColorStr  = JSON.stringify(showTime['picsColor']);
        //console.log('picsColorStr:', picsColorStr);

        picturesStr = JSON.stringify(newPicNames);
        //console.log('picturesStr:', picturesStr);
        values = [userId, now, showTime['address'], showTime['content'], picturesStr,picsSizeStr,picsColorStr,showTime['permission'],showTime['ats']];
        db.query(sql, values, function(err, rows){
            if(err!=null){
                responseError(res, err);
                return;
            }
            var showId = rows.insertId;
            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var timeStr = util.DateFormat('yyyy-MM-dd hh:mm:ss', now);
            var resData = {'id':showId, 'time':timeStr, 'pictures':newPicNames};
            res.write(JSON.stringify(resData));
            res.end();
            console.log('add show success, showid:', showId);
        });
    });
    return;
});

app.post('/httproute/headimg/update', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = serverConfig.imgPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 20 * 1024 * 1024;

    console.log('headimg update');
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var picname= fields['picname'];
        if(err!=null){
            responseError(res, err);
            return;
        }
        if(isAnyUndefined([userid,picname])){
            responseError(res, "error argument");
            return;
        }

        var imgPath = serverConfig.imgPath;
        //文件名格式 uid.jpg
        //重命名文件
        var oldName = files[picname]['path'];
        var extname = path.extname(oldName);
        var newName = userid+extname;
        var newPathName = imgPath+newName;
        console.log('headimg update rename');
        fs.rename(oldName , newPathName,function(err){
            if(err!=undefined){
                console.log('pic rename error:',err);   
            }else{
                console.log('rename '+newName+" success");    
                res.write(JSON.stringify({'headimg':newName}));
                res.end();
            }
        });
    });
    return;
});

function responseGetshow(userid,id,direct,pageNum,req,res){
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
                res.write(JSON.stringify({'datas':[], 'direct':direct}));
                res.end();
                log.info('getshow response');
                return;
            }
            var ids = [];
            for(i in rows){
                ids.push(rows[i]['id']); 
            }
            var idsStr = ids.join(',');

            sql = "select b.likerid,showtimes.* from (select a.id,a.userid,u.nickname,u.headimg,a.time,a.address,a.content,a.pictures,a.pics_size,a.pics_color,a.permission,a.ats,a.like_size,a.comment_size from showtime as a inner join t_user as u on(a.userid=u.userid) where a.id in ("+idsStr+")) as showtimes left join `liker` as b on (showtimes.id=b.showid) and (b.likerid=? or b.likerid=null)";
            mylog('userid:'+userid);
            db.query(sql, [userid], function(err, rows){
                if(err!=null){
                    responseError(res, err);
                    return;
                }
                showdatas = [];
                for(var i in rows){
                    var row = rows[i];
                    likeStatus = 0;
                    if(row['likerid']!=undefined){
                        likeStatus = 1;
                    }
                    pictures = JSON.parse(row['pictures']);
                    picsSize=JSON.parse(row['pics_size']);
                    picsColor=JSON.parse(row['pics_color']);
                    
                    showdatas[row['id']] = {
                        id:row['id'],
                        userid:row['userid'],
                        nickname:row['nickname'],
                        headimg:row['headimg'], 
                        time:util.DateFormat('yyyy-MM-dd hh:mm:ss', row['time']),
                        address:row['address'],
                        content:row['content'],
                        permission:row['permission'],
                        ats:row['ats'],
                        likeSize:row['like_size'],
                        commentSize:row['comment_size'],
                        likeStatus:likeStatus,
                        pictures:pictures,
                        picsSize:picsSize,
                        picsColor:picsColor,
                    }; 
                }
                var showArray = [];
                for(var key in showdatas){
                   showArray.push(showdatas[key]); 
                } 
                showArray.sort(function(a,b){return a['time']<b['time']?1:-1});
                responseNormal(res,{'datas':showArray});
            });
        }
    });
    
}
app.post('/httproute/getshow', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var pageNum = fields['pagenum'];
        var userid = fields['userId'];
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

app.post('/httproute/getshowbyuserid', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var pageNum = fields['pagenum'];
        var userid = fields['userid'];
        var interestUserid = fields['interestUserid']
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
                    responseGetshowByUserid(userid,interestUserid,id,direct,pageNum,req,res)
                }
            });

        }else{
            responseGetshowByUserid(userid,interestUserid,id,direct,pageNum,req,res)
        }
    });//form
    return;
});

function responseGetshowByUserid(userid,interestUserid,id,direct,pageNum,req,res){
    console.log('getshow userid:',userid," id:", id,' direct:',direct,' pageNum:',pageNum);
    var minid = id-pageNum;
    var sql;
    if(direct=='backward'){
        sql = "select id from showtime where userid=? and id<? order by time desc limit "+pageNum;
    }else{
        sql = "select id from showtime where userid=? and id>? order by time desc limit "+pageNum;
    }
    db.query(sql, [interestUserid,id], function(err, rows){
        if(err!=null){
            responseError(res, err);
            return;
        }else{
            if(rows.length==0){
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                res.write(JSON.stringify({'datas':[], 'direct':direct}));
                res.end();
                log.info('getshow response');
                return;
            }
            var ids = [];
            for(i in rows){
                ids.push(rows[i]['id']); 
            }
            var idsStr = ids.join(',');

            sql = "select b.likerid,showtimes.* from (select a.id,a.userid,u.nickname,u.headimg,a.time,a.address,a.content,a.pictures,a.pics_size,a.pics_color,a.permission,a.ats,a.like_size,a.comment_size from showtime as a inner join t_user as u on(a.userid=u.userid) where a.id in ("+idsStr+")) as showtimes left join `liker` as b on (showtimes.id=b.showid) and (b.likerid=? or b.likerid=null)";
            mylog('userid:'+userid);
            db.query(sql, [userid], function(err, rows){
                if(err!=null){
                    responseError(res, err);
                    return;
                }
                showdatas = [];
                for(var i in rows){
                    var row = rows[i];
                    likeStatus = 0;
                    if(row['likerid']!=undefined){
                        likeStatus = 1;
                    }
                    pictures = JSON.parse(row['pictures']);
                    picsSize=JSON.parse(row['pics_size']);
                    picsColor=JSON.parse(row['pics_color']);
                    
                    showdatas[row['id']] = {
                        id:row['id'],
                        userid:row['userid'],
                        nickname:row['nickname'],
                        headimg:row['headimg'], 
                        time:util.DateFormat('yyyy-MM-dd hh:mm:ss', row['time']),
                        address:row['address'],
                        content:row['content'],
                        permission:row['permission'],
                        ats:row['ats'],
                        likeSize:row['like_size'],
                        commentSize:row['comment_size'],
                        likeStatus:likeStatus,
                        pictures:pictures,
                        picsSize:picsSize,
                        picsColor:picsColor,
                    }; 
                }
                var showArray = [];
                for(var key in showdatas){
                   showArray.push(showdatas[key]); 
                } 
                showArray.sort(function(a,b){return a['time']<b['time']?1:-1});
                responseNormal(res,{'datas':showArray});
            });
        }
    });
    
}

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

//----------------action
app.post('/httproute/action/add', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = videoPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 20 * 1024 * 1024;

    form.parse(req, function(err, fields, files) {
        if(files['videofile']==undefined || files['actionImage']==undefined){
            responseError(res, 'argument is error');
            return;
        }
        sql = "insert into actions (userid,name,tags,notices,video_name,action_image) values(?,?,?,?,?,?)";
        var videoFileName = files['videofile']['path'].replace(videoPath, "");
        var actionImageName = files['actionImage']['path'].replace(videoPath, "");
        fs.rename(videoPath+actionImageName , imgPath+actionImageName,function(err){
            if(err!=undefined){
                console.log(err)    
            }else{
                console.log('rename '+imgPath+actionImageName+" success");    
            }
        });
        var userId = fields['userId']
        var actionItem = JSON.parse(fields['actionItem'])
        tagsStr = actionItem['tags'].join(',')
        noticesStr = actionItem['notices'].join('##')
        values = [userId, actionItem['name'], tagsStr, noticesStr, videoFileName,actionImageName];
        db.query(sql, values, function(err, rows){
            if(err!=null){
                responseError(res, err);
                return;
            }
            var actionId = rows.insertId;
            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var resData = {'actionId':actionId, 'videoName':videoFileName, 'actionImage':actionImageName};
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
        videoFileName = fields['videoName'];
        actionImage = fields['actionImage']
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
            fs.unlink(imgPath+actionImage, function(err){
                if(err){
                    responseError(res, err);
                }else{
                    console.log('rm actionImage:'+actionImage);
                }
            });

            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var resData = {'actionId':actionId, 'videoName':videoFileName, 'actionImage':actionImage};
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
        var actionId = actionItem['id']
        var actionName = actionItem['name']
        var tagsStr = actionItem['tags'].join(',')
        var noticesStr = actionItem['notices'].join('##')
        var videoName = actionItem['videoName'];
        var actionImage = actionItem['actionImage'];

        if(files['videofile']!=undefined && files['actionImage']!=undefined){
            sql = "update actions set name=?,tags=?,notices=?,video_name=?,action_image=? where id=?";
            var newVideoName = files['videofile']['path'].replace(videoPath, "");
            var newActionImage = files['actionImage']['path'].replace(videoPath, "");
            
            values = [actionName, tagsStr, noticesStr, newVideoName,newActionImage,actionId];
            
            db.query(sql, values, function(err, rows){
                if(err!=null){
                    responseError(res, err);
                    return;
                }
                //delete old video file
                deleteFile(videoPath+videoName,function(err){
                    if(err){
                        responseError(res, err);
                    }
                });
                //delete old actionImage file
                deleteFile(imgPath+actionImage,function(err){
                    if(err){
                        responseError(res, err);
                    }
                });
                //rename actionImage
                fs.rename(videoPath+newActionImage, imgPath+newActionImage,function(err){
                    if(err!=undefined){
                        console.log(err);  
                    }
                });

                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                var resData = {'actionId':actionId, 'videoName':newVideoName,'actionImage':newActionImage};
                mylog('new videoName:'+newVideoName)
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
                    var resData = {'actionId':actionId, 'videoName':videoName,'actionImage':actionImage};
                    res.write(JSON.stringify(resData));
                    res.end();
                }
            });
        }
    });
    return;
});

function deleteFile(file,callback){
    fs.exists(file, function(exists){
        if(exists){
            fs.unlink(file, function(err){
                callback(err)
                if(err==undefined)
                    console.log('re success:'+file);
            });       
        }else{
            mylog('rm file:'+file+" is not exists");
        }
    });
}

app.post('/httproute/actions', function (req, res) {
    mylog('/httproute/actions');
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
                    tags=row['tags']?row['tags'].split(','):[];
                    for(var i=0;i<tags.length;i++){
                        console.log(tags[i])
                        tags[i] = parseInt(tags[i])
                    }
                    console.log(tags)
                    actionDatas.push({
                        id:row['id'],
                        name:row['name'],
                        videoName:row['video_name'],
                        actionImage:row['action_image'],
                        tags:tags,
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

//----------------lesson
app.post('/httproute/lesson/add', function (req, res) {
    var form = new formidable.IncomingForm();
    form.multiples = true;
    form.uploadDir = imgPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 30 * 1024 * 1024;

    form.parse(req, function(err, fields, files) {
        if(err!=null){
            console.log(err);
            responseError(res,err);
            return
        }
        sql = "insert into lessons(userid,name,cover,bodies,address,purpose,cost_time,description,recycle_times,fat_effect,muscle_effect) values(?,?,?,?,?,?,?,?,?,?,?)";
        var userId = fields['userId']
        var lesson = JSON.parse(fields['lesson'])
        var lessonActions = lesson['lessonActions']
        var coverFileName = files['cover']['path'].replace(imgPath, "");
        var name = lesson['name'];
        var address = lesson['address'];
        var purpose = lesson['purpose'];
        var costTime = lesson['costTime'];
        var description = lesson['description'];
        var recycleTimes = lesson['recycleTimes'];
        var fatEffect = lesson['fatEffect'];
        var muscleEffect = lesson['muscleEffect'];
        if(userId==undefined||lesson==undefined||name==undefined||address==undefined||purpose==undefined||costTime==undefined||description==undefined||recycleTimes==undefined||fatEffect==undefined||muscleEffect==undefined||lesson['bodies']==undefined||lessonActions==undefined){
            responseError(res,"argument error");
            return
        }
        bodiesStr = lesson['bodies'].join(',');
        values = [userId,name,coverFileName,bodiesStr,address,purpose,costTime,description,recycleTimes,fatEffect,muscleEffect];
        db.query(sql, values, function(err, rows){
            if(err!=null){
                responseError(res,err);
            }else{
                var lessonId = rows.insertId;
                console.log('lesson id:'+lessonId+", cover:"+coverFileName);
                responseNormal(res, {'id':lessonId,'cover':coverFileName});

                var infosSize = lessonActions.length;
                for(var i=0;i<infosSize;i++){
                    order=i;
                    info = lessonActions[i];
                    sql='insert into lesson_actions(lessonid,actionid,`order`,reset_time,times,groups)values(?,?,?,?,?,?)';
                    values=[lessonId,info['actionId'],order,info['resetTime'],info['times'],info['groups']];
                    db.query(sql, values, function(err, rows){
                        if(err!=null){
                            mylog('insert lesson_actions error:'+err);
                        }else{
                            mylog('insert lesson_actions lessonid: '+lessonId+"actionId: "+info['actionId']);
                        }
                    });
                }
            }
        });
        
    });
});

app.post('/httproute/lessons', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userId = fields['userId'];
        if(userId==undefined){
            responseError(res,"argument error");
            return
        }

        //查询课程列表时只返回课程相关信息,当点击进入课程详情时根据lessonid查询相关信息(如:动作列表)
        var sql = 'select * from lessons where userid = ?';
        //var sql = "select l.id as lessonid,l.name,l.cover,l.bodies,l.address,l.purpose,l.cost_time,l.description,l.recycle_times,l.fat_effect,l.muscle_effect,a.id as actionid,a.name as action_name,a.tags,a.notices,a.video_name,a.action_image from lessons as l join lesson_actions as la on(l.id=la.lessonid) join actions as a on(la.actionid=a.id) where l.userid=? order by la.order";
        //课程详情查询
        //var sql = "select la.reset_time,la.times,la.groups,a.id as actionid,a.name as action_name,a.tags,a.notices,a.video_name,a.action_image lesson_actions as la join actions as a on(la.actionid=a.id) where la.lessonid=? order by la.order";
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
                        cover:row['cover'],
                        bodies:row['bodies'].split(','),
                        address:row['address'],
                        purpose:row['purpose'],
                        costTime:row['cost_time'],
                        description:row['description'],
                        recycleTimes:row['recycle_times'],
                        fatEffect:row['fat_effect'],
                        muscleEffect:row['muscle_effect'],
                    });
                } 
                responseNormal(res, {'datas':lessons});
            }
        });
    });
});

app.post('/httproute/lesson/delete', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userId = fields['userId'];
        var id = fields['id'];
        if(userId==undefined || id==undefined){
            responseError(res,"argument error");
            return
        }
        mylog('lesson delete id:'+id+", userid:"+userId);
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

app.post('/httproute/lesson/update', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = imgPath;
    form.keepExtensions = true;
    form.maxFieldsSize = 2 * 1024 * 1024;

    form.parse(req, function(err, fields, files) {
        var userId = fields['userId'];
        var lesson = JSON.parse(fields['lesson']);
        var lessonActions = lesson['lessonActions'];
        var lessonId = lesson['id'];
        var name = lesson['name'];
        var address = lesson['address'];
        var purpose = lesson['purpose'];
        var costTime = lesson['costTime'];
        var description = lesson['description'];
        var recycleTimes = lesson['recycleTimes'];
        var fatEffect = lesson['fatEffect'];
        var muscleEffect = lesson['muscleEffect'];
        if(userId==undefined||lesson==undefined||name==undefined||address==undefined||purpose==undefined||costTime==undefined||description==undefined||recycleTimes==undefined||fatEffect==undefined||muscleEffect==undefined||lesson['bodies']==undefined||lessonActions==undefined){
            responseError(res,"argument error");
            return
        }
        if(userId==undefined || lesson==undefined){
            responseError(res,"argument error");
            return
        }
        bodiesStr = lesson['bodies'].join(',')

        if(files['cover']!=null){
            var coverFileName = files['cover']['path'].replace(imgPath, "");
            values = [name,coverFileName,bodiesStr,address,purpose,costTime,description,recycleTimes,fatEffect,muscleEffect,lessonId];
            sql = "update lessons set name=?,cover=?,bodies=?,address=?,purpose=?,cost_time=?,description=?,recycle_times=?,fat_effect=?,muscle_effect=? where id=?";
            db.query(sql, values, function(err, rows){
                if(err!=null){
                    responseError(res,err);
                }else{
                    
                    responseNormal(res, {'id':lessonId, 'cover':coverFileName});
                }
            });
        }else{
            values = [name,bodiesStr,address,purpose,costTime,description,recycleTimes,fatEffect,muscleEffect,lessonId];
            sql = "update lessons set name=?,bodies=?,address=?,purpose=?,cost_time=?,description=?,recycle_times=?,fat_effect=?,muscle_effect=? where id=?";
            db.query(sql, values, function(err, rows){
                if(err!=null){
                    responseError(res,err);
                }else{
                    responseNormal(res, {'id':lessonId});
                }
            });
        }
        var infosSize = lessonActions.length;
        for(var i=0;i<infosSize;i++){
            order=i;
            info = lessonActions[i];
            mylog('update lesson_actions:'+lessonId+", "+JSON.stringify(info));
            sql='update lesson_actions set `order`=?,reset_time=?,times=?,groups=? where lessonid=? and actionid=?';
            values=[order,info['resetTime'],info['times'],info['groups'],lessonId,info['actionId']];
            db.query(sql, values, function(err, rows){
                if(err!=null){
                    mylog('update lesson_actions error:'+err);
                }
            });
        }
    });
});


//课程详情查询
app.post('/httproute/lesson_actions', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userId = fields['userId'];
        var lessonId = fields['lessonId'];
        if(userId==undefined||lessonId==undefined){
            responseError(res,"argument error");
            return
        }

        var sql = "select la.reset_time,la.times,la.groups,a.id as actionid,a.name as action_name,a.tags,a.notices,a.video_name,a.action_image from lesson_actions as la join actions as a on(la.actionid=a.id) where la.lessonid=? order by la.order";
        db.query(sql, [lessonId], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                lessonActions = [];
                for(var i in rows){
                    row = rows[i];
                    lessonActions.push({
                        actionId:row['actionid'],
                        groups:row['groups'],
                        times:row['times'],
                        resetTime:row['reset_time'],
                        actionName:row['action_name'],
                        tags:row['tags']?row['tags'].split(','):[],
                        notices:row['notices']?row['notices'].split('##'):[],
                        videoName:row['video_name'],
                        actionImage:row['action_image'],
                    });
                } 
                responseNormal(res, {'datas':lessonActions});
            }
        });
    });
});

app.post('/httproute/workouts', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        if(userid==undefined){
            responseError(res,"argument error");
            return
        }

        var sql = "select w.id,w.lessonid,w.week,l.name,l.cover,l.bodies,l.address,l.cost_time,l.description,l.recycle_times,l.fat_effect,l.muscle_effect from workout as w join lessons as l on (w.lessonid=l.id) where w.userid=? order by w.week";
        db.query(sql, [userid], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                datas = [];
                for(var i in rows){
                    row = rows[i];
                    datas.push({
                        //数据
                        'id':row['id'],
                        'lessonId':row['lessonid'],
                        'week':row['week'],
                        'lesson':{
                            'id':row['lessonid'],
                            'name':row['name'],
                            'cover':row['cover'],
                            'bodies':row['bodies']?row['bodies'].split(','):[],
                            'address':row['address'],
                            'purpose':row['purpose'],
                            'costTime':row['cost_time'],
                            'description':row['description'],
                            'recycleTimes':row['recycle_times'],
                            'fatEffect':row['fat_effect'],
                            'muscleEffect':row['muscle_effect'],
                        }
                    });
                } 
                responseNormal(res, {'datas':datas});
                //responseNormal(res, datas);
            }
        });
    });
});

app.post('/httproute/workout', function (req, res) {
    console.log('workout');
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var week = fields['week'];
        console.log("workout userid:",userid,", week:"+week);
        if(userid==undefined || week==undefined){
            responseError(res,"argument error");
            return
        }

        var sql = "select w.id,w.lessonid,w.week,l.name,l.cover,l.bodies,l.address,l.cost_time,l.description,l.recycle_times,l.fat_effect,l.muscle_effect from workout as w join lessons as l on (w.lessonid=l.id) where w.userid=? and w.week=?";
        db.query(sql, [userid,week], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                data = [];
                if(rows.length==1){
                    row = rows[0];
                    data={
                        //数据
                        'id':row['id'],
                        'lessonId':row['lessonid'],
                        'week':row['week'],
                        'lesson':{
                            'id':row['lessonid'],
                            'name':row['name'],
                            'cover':row['cover'],
                            'bodies':row['bodies']?row['bodies'].split(','):[],
                            'address':row['address'],
                            'purpose':row['purpose'],
                            'costTime':row['cost_time'],
                            'description':row['description'],
                            'recycleTimes':row['recycle_times'],
                            'fatEffect':row['fat_effect'],
                            'muscleEffect':row['muscle_effect'],
                        }
                    };
                }
                console.log(data);
                responseNormal(res,data);
            }
        });
    });
});


app.post('/httproute/workout/delete', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var id = fields['id'];
        if(isAnyUndefined([userid,id])){
            responseError(res,"argument error");
            return
        }

        var sql = "delete from workout where userid=? and id=?";
        db.query(sql, [userid,id], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                responseNormal(res, {'id':id});
            }
        });
    });
});
app.post('/httproute/workout/add', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var lessonId = fields['lessonId'];
        var week = fields['week'];
        if(isAnyUndefined([userid,lessonId,week])){
            responseError(res,"argument error");
            return
        }

        var sql = "insert into workout (userid,lessonid,week)values(?,?,?)";
        db.query(sql, [userid,lessonId,week], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                var id = rows.insertId;
                responseNormal(res, {'id':id});
            }
        });
    });
});
app.post('/httproute/workout/update', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var lessonId = fields['lessonId'];
        var week = fields['week'];
        if(isAnyUndefined([userid,lessonId,week])){
            responseError(res,"argument error");
            return
        }

        var sql = "update workout set lessonid=?,week=? where id=?";
        db.query(sql, [lessonId,week,userid], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                responseNormal(res, {'id':id});
            }
        });
    });
});

app.post('/httproute/user', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var token = fields['token'];

        log.info('getuser userid:',userid,' ,token:',token);
        if(!userid||!token){
            responseError(res,"argument error");
            return
        }

        var sql = "select u.userid,u.nickname,u.headimg from t_user as u where u.userid=?";
        db.query(sql, [userid], function(err, rows){
            if(err){
                responseError(res, err);
                log.info('getuser error',JSON.stringify(err));
            }else{
                data = rows[0]
                if(data){
                    user = {
                        'userid':data['userid'],
                        'nickname':data['nickname'],
                        'headImg':data['headimg'],
                    };
                    log.info(JSON.stringify(user));
                    responseNormal(res, user);
                }else{
                    responseError(res,"userid not exist");
                }
            }
        });
    });
});

app.post('/httproute/friends', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        if(userid==undefined){
            responseError(res,"argument error");
            return
        }

        var sql = "select u.userid,u.nickname,u.headimg from t_friends as f join t_user as u on (f.friendid=u.userid) where f.userid=?";
        db.query(sql, [userid], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                datas = [];
                for(var i in rows){
                    row = rows[i];
                    datas.push({
                        //数据
                        'userid':row['userid'],
                        'nickname':row['nickname'],
                        'headImg':row['headimg'],
                    });
                } 
                responseNormal(res, {'datas':datas});
            }
        });
    });
});

app.post('/httproute/recommendFriends', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        if(userid==undefined){
            responseError(res,"argument error");
            return
        }

        var sql = "select userid,nickname,headimg from t_user";
        db.query(sql, [userid], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                datas = [];
                for(var i in rows){
                    row = rows[i];
                    datas.push({
                        //数据
                        'userid':row['userid'],
                        'nickname':row['nickname'],
                        'headImg':row['headimg'],
                    });
                } 
                responseNormal(res, {'datas':datas});
            }
        });
    });
});

app.post('/httproute/friends/delete', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var friendid = fields['friendid'];
        if(userid==undefined || friendid==undefined){
            responseError(res,"argument error");
            return
        }

        var sql = "delete from t_friends where userid=? and friendid=?";
        db.query(sql, [userid,friendid], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                responseNormal(res, {'friendid':friendid});
            }
        });
    });
});
app.post('/httproute/friends/add', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var friendid = fields['friendid'];
        if(userid==undefined || friendid==undefined){
            responseError(res,"argument error");
            return
        }

        var sql = "insert into t_friends (userid,friendid)values(?,?)";
        db.query(sql, [userid,friendid], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                responseNormal(res, {'friendid':friendid});
            }
        });
    });
});

app.post('/httproute/chatgroup', function(req, res){
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        if(userid==undefined){
            responseError(res,"argument error");
            return
        }

        var sql = "select * from t_chatgroup where userid=?";
        db.query(sql, [userid], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                len = rows.length;
                datas = []
                for(var i=0;i<len;i++){
                    data = rows[i];
                    datas.push({
                        'chatgroupId':data['chatgroup_id'],
                        'name':data['name'],
                    });
                }
                responseNormal(res, {'datas':datas});
            }
        });
    });
});


//---------------dongfou----------------------
app.post('/httproute/sports', function (req, res) {
    console.log('post sports');
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var sql = "select * from t_sport";
        db.query(sql, [], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                responseNormal(res, {'datas':rows});
            }
        });
    });
});

app.get('/httproute/sports', function (req, res) {
    console.log('get sports');
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var sql = "select * from t_sport";
        db.query(sql, [], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                responseNormal(res, {'datas':rows});
            }
        });
    });
});

app.post('/httproute/dongfou/login', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var mail = fields['mail'];
        var passwd = fields['passwd'];
        if(mail==undefined || mail=="" || passwd==undefined || passwd==""){
            responseError(res, "argument is error");  
        }else{
            var sql = 'select * from t_dongfou_user where mail=? and passwd=?';
            db.query(sql, [mail,passwd], function(err, rows){
                if(err!=null){
                    responseError(res, err);
                }else if(rows.length>0){
                    responseNormal(res, rows[0]);    
                }else{
                    responseError(res, "user is not exit"); 
                }
            });
        }
    });
});

//register
app.post('/httproute/dongfou/register', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var mail = fields['mail'];
        var passwd = fields['passwd'];
        if(mail==undefined || mail=="" || passwd==undefined || passwd==""){
            res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
            var resData = {'error':"error arguments"};
            responseError(res, resData); 
            return;
        }
        checkMail = 'select 1 from t_user where mail=?'
        db.query(checkMail, [mail], function(err, rows){
            if(err!=null){
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                var resData = {'error':err};
                responseError(res, resData); 
                return;
            }
            if(rows.length>0){
                res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                var resData = {'error':'mail is already register'};
                responseError(res, resData); 
                return;
            }else{
                sql = "insert into t_dongfou_user(mail,passwd)values(?,?)";
                values = [mail, passwd];
                db.query(sql, values, function(err, rows){
                    if(err!=null){
                        res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                        var resData = {'error':err};
                        responseError(res, resData); 
                        return;
                    }
                    var userid = rows.insertId;
                    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
                    var resData = {'userid':userid};
                    res.write(JSON.stringify(resData));
                    res.end();
                    log.trace('register success:',mail, passwd);
                });
            }
        });
    });
});

app.post('/httproute/dongfou/upload/sportrecord', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var recordsStr = fields['records'];
        console.log(recordsStr);
        if(recordsStr==undefined || recordsStr==""){
            responseError(res, "argument is error");  
        }else{
            var records = JSON.parse(fields['records']);
            var sql = 'insert into t_sport_record(userid,sportid,amount,arg1,arg2,time) values (?,?,?,?,?,?)';
            async.map(records, function(record, callback) {
                console.log(typeof(record['time']));
                db.query(sql, [record['userid'],record['sportid'],record['amount'],record['arg1'],record['arg2'],record['time']], function(err, rows){
                    if(err!=null){
                        callback(err,null);
                    }else{
                        var data = {
                            id:record['id'],
                            seq:rows.insertId,
                            userid:record['userid'],
                        };
                        console.log(data);
                        callback(null, data);
                    }
                });
            }, function(err, results){
                console.log(err,results);
                if(err){
                    responseError(res, err);
                    return;
                }
                responseNormal(res,{'datas':results});
            });
        }
    });
});

app.post('/httproute/dongfou/feedback', function (req, res) {
    var form = new formidable.IncomingForm();

    form.parse(req, function(err, fields, files) {
        var userid = fields['userid'];
        var content = fields['content'];
        console.log(content);
        if(userid==undefined || content==undefined || content==""){
            responseError(res, "argument is error");  
        }else{
            var sql = 'insert into t_feedback(userid,content) values (?,?)';
            db.query(sql, [userid,content], function(err, rows){
                if(err!=null){
                    responseError(res, err);
                }else{
                    responseNormal(res,{});
                }
            });
        }
    });
});






//-------------------公共方法-------------------

function mylog(msg){
    console.log(msg);
    log.info(msg);
}
function responseError(res, error){
    console.log(error);
    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
    res.write(JSON.stringify({'error':JSON.stringify(error)}));
    res.end();
}

function responseNormal(res, data){
    res.writeHead(200, {'content-type': 'text/plain;charset=UTF-8'});
    res.write(JSON.stringify(data));
    res.end();
}

function arrayRemoveElement(elements, e){
    var i = elements.indexOf(e);
    if(i != -1) {
        elements.splice(i, 1);
    }
}

function isAnyUndefined(datas){
    var size = datas.length;
    for(var i=0;i<size;i++){
        if(datas[i]==undefined)
            return true;
    }
    return false;
}

//-------------------公共方法-------------------
//
//post方法框架
/*
app.post('/httproute/lesson_actions', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var userId = fields['userId'];
        if(userId==undefined){
            responseError(res,"argument error");
            return
        }

        var sql = "";
        db.query(sql, [], function(err, rows){
            if(err){
                responseError(res, err);
            }else{
                datas = [];
                for(var i in rows){
                    row = rows[i];
                    datas.push({
                        //数据
                    });
                } 
                responseNormal(res, datas);
            }
        });
    });
});
*/




app.listen(5003);
log.trace('http protocol listen on 5003')

