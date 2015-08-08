
netstat -n | awk '/^tcp.*123.59.40.113:5002 +/ {++state[$NF]} END {for(key in state) print key,"\t",state[key]}'

