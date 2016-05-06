
var md5 = require('md5');
var async = require("async");

var dd = [23,45,6];
console.log(typeof(dd));
for(var d in dd){
    console.log(d);
}

async.map([1,3,5], function(item, callback){

    var transformed = item + 1;
    console.log(item);// [2, 4, 6]
    var b = item;
    var m = {b:transformed};
    m[b]=transformed;
    console.log(m);
    callback(null, m);

    }, function(err, results){
        if(err){
            console.error("error: " + err);
            return;
        }
        console.log(results);// [2, 4, 6]
});


