use test;

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

drop table t_chatrecord;
create table `t_chatrecord`(
    `seq` int not null auto_increment,
    -- 客户端消息id
    `id` int not null,
    -- 私聊id: 小的userid_大的userid
    `chatgroup_id` varchar(19) not null,
    `userid` int not null,
    -- 记录类型
    `type` tinyint not null,
    -- 文本直接存储, 图片、语言、视频则存储路径
    `content` varchar(500) not null,
    `time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    primary key(seq),
    key(chatgroup_id),
    key(time)
)
COLLATE='utf8_unicode_ci';

create table `t_chatgroup`(
    `userid` int not null,
    `chatgroup_id` varchar(19) not null,
    `name` varchar(200) not null,
    primary key(userid,chatgroup_id)
)
COLLATE='utf8_unicode_ci';



/*
 查找聊天记录
 select * from t_chatrecord where userid=? and friendid=? or userid=? and friendid=?
 */

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


create table `roommate`(
    `id` int not null,
    `roomid` int not null,
    `userid` int not null,
    `blacklist` varchar(300) not null default '',
    primary key (id)
)
COLLATE='utf8_unicode_ci';

create table `action_tags`(
    `id` int not null auto_increment,
    `userid` int not null,
    `name` varchar(40) not null,
    primary key (id),
    INDEX `userid` (`userid`) USING BTREE
)
COLLATE='utf8_unicode_ci';

-- to do action和tags创建一个中间表
-- drop table actions;
create table `actions`(
    `id` int not null auto_increment,
    `userid` int not null,
    `name` varchar(40) not null,
    -- tagid1,tagid2....
    `tags` varchar(50) null comment '动作标签',
    `notices` varchar(200) null comment '说明',
    `video_name` varchar(100) not null comment '视频文件名字',
    `action_image` varchar(50) not null comment '第一帧图像',
    primary key (id),
    INDEX `userid` (`userid`) USING BTREE
)
COLLATE='utf8_unicode_ci';

-- select l.id as lessonid,l.name,l.cover,l.bodies,l.address,l.purpose,l.cost_time,l.description,l.recycle_times,l.fat_effect,l.muscle_effect,la.order,la.reset_time,la.times,la.groups,a.name as action_name,a.tags,a.notices,a.video_name,a.action_image from lessons as l join lesson_actions as la on(l.id=la.lessonid) join actions as a on(la.actionid=a.id)
-- drop table lessons;
create table `lessons`(
    `id` int not null auto_increment,
    `userid` int not null,
    `name` varchar(40) not null,
    `cover` varchar(50) null comment '封面图片',
    `bodies` varchar(50) null comment '训练部位',
    `address` varchar(50) not null,
    `purpose` varchar(50) not null comment '增肌,减脂,塑形',
    `cost_time` int not null,
    `description` varchar(200) null,
    `recycle_times` int not null,
    `fat_effect` float not null,
    `muscle_effect` float not null,
    primary key (id),
    INDEX `userid` (`userid`) USING BTREE
)
COLLATE='utf8_unicode_ci';

-- drop table lesson_actions;
create table `lesson_actions`(
    `lessonid` int not null comment '这个id来自lessons,workout',
    `actionid` int not null,
    `order` tinyint not null comment '动作顺序',
    `reset_time` int not null comment '休息时间',
    `times` int not null comment '每组多少次',
    `groups` int not null comment '共多少组',
    primary key (lessonid,actionid)
)
COLLATE='utf8_unicode_ci';

-- 训练日对应的课程
-- select * from workout as w join lessons as l on (w.lessonid=l.id) join lesson_actions as la on (l.id=la.lessonid)
-- 训练下的课程详情
-- select * from workout as w join lessons as l on (w.lessonid=l.id) join lesson_actions as la on (l.id=la.lessonid) join actions as a on (la.actionid=a.id)
-- 添加/指定训练课程
-- select * from lessons as l join lesson_actions as la on (l.id=la.lessonid) join actions as a on (la.actionid=a.id) where l.id=? order by la.order
-- drop table workout;
create table `workout`(
    `id` int not null auto_increment,
    `userid` int not null,
    `lessonid` int not null,
    `week` tinyint not null comment '训练日', 
    primary key (id),
    INDEX `userid` (`userid`) USING BTREE
)
COLLATE='utf8_unicode_ci';


-- drop table showtime;
create table `showtime`(
    `id` int not null auto_increment,
    `userid` int not null,
    `time` datetime not null,
    `address` varchar(60) null,
    `content` varchar(400) null,
    `pictures` varchar(200) null,
    `pics_size` varchar(200) null,
    `pics_color` varchar(200) null,
    `permission` int null,
    `ats` varchar(200) null,
    `like_size` int null comment '喜欢数量',
    `comment_size` int null comment '评论条数',
    primary key (id),
    INDEX `userid` (`userid`) USING BTREE
)
COLLATE='utf8_unicode_ci';

-- drop table `liker`;
create table `liker`(
    `id` int not null auto_increment,
    `showid` int not null,
    `likerid` int not null,
    primary key (id),
    INDEX `showid` (`showid`) USING BTREE
)
COLLATE='utf8_unicode_ci';

-- drop table `comment`;
create table `comment`(
    `id` int not null auto_increment,
    `showid` int not null,
    `commentuid` int not null,
    `becommentuid` int null,
    `comment` varchar(200) not null,
    `time` datetime not null,
    primary key (id),
    INDEX `showid` (`showid`) USING BTREE
)
COLLATE='utf8_unicode_ci';

