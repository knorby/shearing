#!/bin/bash
#intended for nagios on us239

cd /var/opt/selectiveHearing

if [ -e bin/activate ]; then
    . bin/activate
fi

BROKER_IN=`cat /opt/tradelink/share/lib/selectiveHearing/etc/broker.in`
STATUS_FN=/opt/local/nagios/var/status.dat
CHECK_PERIOD=10

./bin/selectiveIcingaWatcher.py --host="ds-services" $BROKER_IN $STATUS_FN $CHECK_PERIOD &

exit 0
