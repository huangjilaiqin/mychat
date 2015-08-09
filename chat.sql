use test;

drop table if exists `t_user`;
create table `t_user`(
    userid int not null auto_increment,
    mail varchar(50),
    phone varchar(11),
    nickname varchar(20),
    headimg varchar(150),
    passwd varchar(50),
    status tinyint,
    primary key (userid)
)
COLLATE='utf8_unicode_ci';


drop table if exists `t_friends`;
create table `t_friends`(
    userid int not null,
    friendid int not null,
    primary key(userid, friendid)
)
COLLATE='utf8_unicode_ci';

/*
 查找好友的信息
 select u.* from (select friendid from t_friends where userid = ?) as f inner join t_user as u on(f.friendid=u.userid);
 */

drop table if exists `t_chatrecord`;
create table `t_chatrecord`(
    `id` int not null auto_increment,
    `userid` int not null,
    `friendid` int not null,
    `time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 记录类型
    `type` tinyint not null,
    -- 文本直接存储, 图片、语言、视频则存储路径
    `content` varchar(500) not null,
    primary key(id)
)
COLLATE='utf8_unicode_ci';


/*
 查找聊天记录
 select * from t_chatrecord where userid=? and friendid=? or userid=? and friendid=?
 */

drop table if exists `rooms`;
create table `rooms`(
    `id` int not null auto_increment,
    `name` varchar(200) not null,
    `type` varchar(20) not null,
    `discribe` varchar(500) not null default '',
    `members` int not null default 0,
    `boss` int not null,
    `limit` int not null default 200,
    primary key (id)
)
COLLATE='utf8_unicode_ci';


drop table if exists `roomchatrecord`;
create table `roomchatrecord`(
    `roomid` int not null,
    `time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `userid` int not null,
    -- 记录类型
    `type` tinyint not null,
    -- 文本直接存储, 图片、语言、视频则存储路径
    `content` varchar(500) not null,
    primary key (roomid, time)
)
COLLATE='utf8_unicode_ci';


drop table if exists `roommate`;
create table `roommate`(
    `id` int not null,
    `roomid` int not null,
    `userid` int not null,
    `blacklist` varchar(300) not null default '',
    primary key (id)
)
COLLATE='utf8_unicode_ci';

