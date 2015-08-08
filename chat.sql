
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
COLLATE='gbk_chinese_ci'
;

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
COLLATE='gbk_chinese_ci'
;

drop table if exists `roommate`;
create table `roommate`(
    `id` int not null,
    `roomid` int not null,
    `userid` int not null,
    `blacklist` varchar(300) not null default '',
    primary key (id)
)
COLLATE='gbk_chinese_ci'
;

drop table if exists `t_user`;
create table `t_user`(
    userid int not null,
    nickname varchar(20) not null,
    heading varchar(150),
    primary key (userid)
)
COLLATE='gbk_chinese_ci'
;
