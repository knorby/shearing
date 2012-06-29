#!/usr/bin/env python
import zmq
try:
    import json
except ImportError:
    import simplejson as json

def broker(address):
    context = zmq.Context()
    socket = context.socket(zmq.PULL)
    socket.bind(address)
    while True:
        msg = socket.recv()
        res = json.loads(msg)
        print "---got message--"
        for host in res:
            print "%s:" % host
            services = res[host]
            for service in services:
                print "    service: %s code: %s message: %s" % (service[0], service[2], service[1])

def main():
    import sys
    broker(sys.argv[1])

if __name__=="__main__":
    main()
