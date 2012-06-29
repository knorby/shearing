#!/usr/bin/env python
import re
import time
import logging
import signal

try:
    import json
except ImportError:
    import simplejson as json

import zmq

log = logging.getLogger(__name__)

DEF_EXPR = re.compile('(\S+) \{(.*?)\}',re.DOTALL)

def getDefinitions(filename):
    """ Parse the status.dat file and extract matching object definitions """
    statusFd = open(filename)
    content=statusFd.read()
    statusFd.close()
    finds = DEF_EXPR.findall(content)
    return finds

def getDefFields(defContent):
    return dict(kv.split("=", 1) for kv in defContent.split("\n\t") if len(kv)>0)

class IcingaState(object):

    def __init__(self, statusFn):
        self.statusFn = statusFn
        self.statuses = {}
        self.findChanges()

    def findChanges(self):
        changed = {}
        try:
            data = getDefinitions(self.statusFn)
        except IOError:
            log.error("error reading data from file '%s'" % self.statusFn)
            return changed
        for defType, defData in data:
            if defType=="hoststatus":
                service = "ping"
            elif defType=="servicestatus":
                service = None
            else:
                continue
            defFields = getDefFields(defData)
            hostname = defFields["host_name"]
            if service is None:
                service = defFields["service_description"]
            if hostname in self.statuses:
                if service in self.statuses[hostname]:
                    oldDefFields = self.statuses[hostname][service]
                    if (not oldDefFields.get("current_state")
                        ==defFields.get("current_state")):
                        if not hostname in changed:
                            changed[hostname] = {}
                        changed[hostname][service] = defFields
                self.statuses[hostname][service] = defFields
            else:
                self.statuses[hostname] = {}
                self.statuses[hostname][service] = defFields
        return changed
            
def buildUpdateDict(changedDict):
    update = {}
    for host, services in changedDict.iteritems():
        for service, defFields in services.iteritems():
            if (defFields.get("notifications_enabled")=="0" or
                defFields.get("is_flapping")=="1" or
                defFields.get("scheduled_downtime_depth")=="1" or
                defFields.get("problem_has_been_acknowledged")=="1"):
                continue
            state = int(defFields.get("current_state", 3))
            msg = defFields.get("plugin_output")
            ulist = [service, msg, state]
            if host in update:
                update[host].append(ulist)
            else:
                update[host] = [ulist]
    return update

def updateDaemon(pushAddress, statusFn, runPeriod):
    context = zmq.Context()
    socket = context.socket(zmq.PUSH)
    socket.connect(pushAddress)
    icingaState = IcingaState(statusFn)
    while True:
        startTime = time.time()
        changes = icingaState.findChanges()
        update = buildUpdateDict(changes)
        if len(update)>0:
            socket.send(json.dumps(update))
        sleepTime = runPeriod - (time.time() - startTime)
        time.sleep((sleepTime>0)*sleepTime)

def nullSigHandler(*args, **kwargs):
    pass

def main():
    from optparse import OptionParser
    usage = "%prog pushAddress statusFn runPeriod"
    parser = OptionParser(usage=usage)
    opts, args = parser.parse_args()
    pushAddress, statusFn, runPeriod = args
    runPeriod = float(runPeriod)
    logging.basicConfig()
    signal.signal(signal.SIGHUP, nullSigHandler)
    updateDaemon(pushAddress, statusFn, runPeriod)

if __name__ == "__main__":
    main()
