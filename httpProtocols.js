
var express= require('express');
console.log('express');
var app = express();
var formidable = require('formidable');
var global = require('./global.js');
var db = require('./DBPool.js');
var util = require('./util.js');

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

//upload vedio
app.post('/httproute/uploadvedio', function (req, res) {
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
