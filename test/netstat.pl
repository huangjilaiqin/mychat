
open(OUT, '>', 'status.txt');
sub handler{
    local $sig = @_;
    print "Caught SIG $sig -- shutting down now\n";
    close(OUT);
    exit(0);
}
$SIG{'INT'} = 'handler';


while(1){
    $str = `netstat -n |grep 123.59.40.113:5002`;
    print OUT $str;
    print OUT "-------------------------------------------------\n";
}


