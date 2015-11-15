
var db = require('./DBPool.js');

sql = "select * from showtime a left join `like` b on (a.id=b.showid) left join comment c on (a.id=c.showid) where a.userid=? and a.id>? and a.id<?";
//sql = "select * from showtime a left join `like` b on (a.id=b.showid) left join comment c on (b.showid=c.showid)";
//sql = "select * from showtime a left join `like` b on (a.id=b.showid)";
values = [1,0,10];
//values = [];
db.query(sql, values, function(err, rows){
    console.log(err);
    console.log(rows);
});


