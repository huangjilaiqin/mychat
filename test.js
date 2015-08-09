
var mailReg = /^\w+@\w+\.\w+$/;
["1577594730@qq.com", "1-577594730@qq.com", "huangji_gd@163.com"].forEach(function(str){
    if(! mailReg.test(str)){
        console.log(str);    
    }
})

if(0 || 1)
    console.log('or');

var s = JSON.stringify({});
console.log(s);
var p = JSON.parse(s);
console.log(p['error']);

console.log(new Date().getTime());
