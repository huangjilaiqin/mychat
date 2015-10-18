
var express= require('express')
console.log('express');
var app = express()
var formidable = require('formidable');

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

app.listen(5003);
