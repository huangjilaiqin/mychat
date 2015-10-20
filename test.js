
var util = require('./util.js');
var t = new Date();
console.log(util.DateFormat('yyyy-MM-dd hh:mm:ss', t.getTime()));
console.log(t.getTime());
console.log(t.getTime()/1000);
