
var express= require('express')
console.log('express');
var app = express()
var formidable = require('formidable');
var global = require('./global.js');
var db = require('./DBPool.js');

// GET method route
app.get('/httproute', function (req, res) {
    res.send('GET request to the homepage')
});
app.get('/httproute/1', function (req, res) {
    res.send('GET request to the homepage 1')
});


// POST method route
app.post('/httproute/show', function (req, res) {
    var form = new formidable.IncomingForm();

    form.multiples = true;
    form.uploadDir = './upload';
    form.keepExtensions = true;
    form.maxFieldsSize = 20 * 1024 * 1024;

    form.parse(req, function(err, fields, files) {
        console.log("fields:", fields);
        console.log("files:",files);
        res.writeHead(200, {'content-type': 'text/plain'});
        res.write('upload success\n\n');
        res.end(JSON.stringify({fields: fields, files: files}));
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

    form.on('field', function(name, value){
        console.log('name:'+name+", value:"+value);
    });
    form.on('file', function(name, file) {
        console.log('name:'+name+", file:"+file);
    });

    form.parse(req, function(err, fields, files) {
        //console.log("fields:", fields);
        //console.log("files:",files);
        sql = "insert into action_vedios (userid,name,tags,notice,vedio) values(?,?,?,?,?)";
        ///home/service/nginx/html/vedio/upload_7257d3f9cd94c9e7416c43d008d1c33d.mp4
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
