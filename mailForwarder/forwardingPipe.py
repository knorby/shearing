#!/usr/bin/env python
import os
import time
import logging

try:
    import json
except ImportError:
    import simplejson as json

import zmq

RS = '\x1e'
FS = '\x1c'

log = logging.getLogger(__name__)

def setupShearingSocket(shearingAddress):
    log.info("Connecting to Selective Hearing broker at '%s'..."
             % shearingAddress)
    context = zmq.Context()
    socket = context.socket(zmq.PUSH)
    socket.connect(shearingAddress)
    return socket
    
def pipeLoop(fifoPath, loopPeriod):
    log.info("Setting up FIFO pipe at '%s'..." % fifoPath)
    os.mkfifo(fifoPath)
    pipe = open(fifoPath, 'r')    
    while True:
        startTime = time.time()
        out = pipe.read()
        if not out=="":
            yield out
        sleepTime = loopPeriod - (time.time() - startTime)
        if sleepTime>0:
            time.sleep(sleepTime)
    log.info("Attempting to destroy FIFO pipe...")
    pipe.close()
    os.unlink(fifoPath)
    if os.path.exists(fifoPath):
        log.error("Failed to  destroy FIFO pipe at '%s'" % fifoPath)
    else:
        log.info("Successfully destroyed FIFO pipe at '%s'" % fifoPath)
        

def forwarder(shearingAddress, fifoPath, loopPeriod):
    shearing = setupShearingSocket(shearingAddress)
    #while True:
    #try:
    pipe = pipeLoop(fifoPath, loopPeriod)
    for updates in pipe:
        updateDict = {}
        for update in updates.split(RS):
            update = update.strip()
            if len(update)==0:
                continue
            res = update.split(FS, 3)
            if len(res)<4:
                log.error("Skipping malformed update found: '%s'" % update)
                continue
            host, service, code, msg = res
            try:
                code = int(code)
            except ValueError:
                log.error(("Malformed update: Given status code '%s' "
                           "is not valid") % code)
            updateDict.setdefault(host, []).append([service, msg, code])
        updateJson = json.dumps(updateDict)
        shearing.send(updateJson)

def main():
    from optparse import OptionParser
    usage = "%prog fifo_pipe selective_hearing"
    parser = OptionParser(usage=usage)
    parser.add_option("-p", "--checkPeriod", type="int", default=10,
                      help=("Sets the period (in seconds) between checks, "
                            "to control check frequency (default: %default)"))
    parser.add_option("-d", "--debug", default=logging.WARNING,
                      dest="loggingLevel",
                      help=("Set logging level to debug"))
    opts, args = parser.parse_args()
    logging.basicConfig(level=opts.loggingLevel,
                        format=('%(asctime)s %(levelname)s '
                                '[%(name)s]: %(message)s'))
    if not len(args)==2:
        parser.error("Must give a path for the FIFO pipe and the zeromq address"
                     " for the selective hearing broker")
    fifoPath, shearingAddress = args
    forwarder(shearingAddress, fifoPath, opts.checkPeriod)

if __name__=="__main__":
    main()

                      
    
