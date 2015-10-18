/*
var http = require('http');
var querystring = require('querystring');
var fs = require('fs');


var post_data = querystring.stringify({
    username:'username',
    password:'123456',
    'login-form-type':'pwd',
    files:['myfile'],
    myfile:fs.createReadStream('./uploadtest.txt'),     
});

var post_options = {
    host: 'ws.o-topcy.com',
    port: '80',
    path: '/httproute/show',
    method: 'post',
    auth: 'username:123456',
    'login-form-type':'pwd',
    headers: {
        'Content-length': post_data.length,
        'Content-Type': 'application/x-www-form-urlencoded'
    }
};

// Set up the request
var post_req = http.request(post_options, function(res) {
    res.setEncoding('utf8');
    console.log('res headers:',JSON.stringify(res.headers));

    res.on('data', function (chunk) {

        console.log('Response: ' + chunk);
    });
});
console.log('post_req',JSON.stringify(post_data));
// post the data
post_req.write(post_data);
post_req.end();
*/

var request = require('request');
var fs = require('fs');

var formData = {
    // Pass a simple key-value pair
    my_field: 'my_value',
    // Pass data via Buffers
    my_buffer: new Buffer([1, 2, 3]),
    // Pass data via Streams
    my_file: fs.createReadStream('./log.js'),
    // Pass multiple values /w an Array
    attachments: [
    fs.createReadStream('./package.json'),
    fs.createReadStream('./protocols.js')
    ],
    // Pass optional meta-data with an 'options' object with style: {value: DATA, options: OPTIONS}
    // Use case: for some types of streams, you'll need to provide "file"-related information manually.
    // See the `form-data` README for more information about options: https://github.com/felixge/node-form-data
    /*
    custom_file: {
        value:  fs.createReadStream('/dev/urandom'),
        options: {
            filename: 'topsecret.jpg',
            contentType: 'image/jpg'
        }
    }
    */
};
request.post({url:'http://ws.o-topcy.com/httproute/show', formData: formData}, function optionalCallback(err, httpResponse, body) {
    if (err) {
        return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
});
