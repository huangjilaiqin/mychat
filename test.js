
var db = require('./DBPool.js');

str = '1;2;3;4;45;6'
arr = str.split(';');
console.log(arr);
arrayRemoveElement(arr, '45');
console.log(arr);


function arrayRemoveElement(elements, e){
    var i = elements.indexOf(e);
    if(i != -1) {
        elements.splice(i, 1);
    }
}
