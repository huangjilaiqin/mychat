
open(IN, '<', @ARGV[0]) or die "can't open @ARGV[0]";

my $listenPort = @ARGV[1];
my %sourceIps = {};
while(<IN>){
    my $line = $_;
    $line =~ /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d+).*?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d+)/;
    my $sourceIp, $sourcePort;
    if($listenPort == $2){
       $sourceIp = $3;
       $sourcePort = $4;
    }
    else{
        $sourceIp = $1;
        $sourcePort = $2;
    }
    if(!$sourceIps->{$sourceIp}){
        if(!-e $sourceIp){
            `mkdir $sourceIp`;
            $sourceIps->{$sourceIp} = {};
        }
    }
    my $fd = $sourceIps->{$sourceIp}->{$sourcePort};
    if(!$fd){
        open($fd, '>', "$sourceIp\/$sourcePort") or die "can't open $sourcePort";
        $sourceIps->{$sourceIp}->{$sourcePort} = $fd;
    }
    #my $fd = $sourceIps->{$sourceIp}->{$sourcePort};
    die "ip:$sourceIp, port:$sourcePort" if(!$fd);
    print $fd $line;
}

foreach my $fd (values %sourceIps){
    close($fd);
}
