
var os = require('os');
function getRandomByRange(min, max){
    return Math.floor(Math.random()*(max-min)+min+0.5)
}
console.log(getRandomByRange(5,6));
