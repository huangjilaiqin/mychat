#! /bin/sh

start(){
    echo "start $NAME ..."
    nohup $DAEMON > /dev/null &
    echo $! > $PIDFILE
    echo "start success, pid: $!"
}

stop(){
    echo "stop $NAME ..."
    pid=`cat $PIDFILE`
    kill $pid
    rm $PIDFILE
    echo "stop success" 
}

restart(){
    stop
    start
}

DAEMON="node client.js"
NAME="client"
PIDFILE="client.pid"

if [ -z $1 ]
then
    echo 'Usage:  client.sh start|stop|restart'
fi

case $1 in
    start)
        start
            ;;
    stop)
        stop
            ;;
    restart)
        restart
            ;;
esac
exit 0

