#!/usr/bin/env python
import zmq

def broker(pullAddress, pubAddresses):
    """
    - pullAddress - zmq-style address to pull updates from
    - pubAddresses - list of zmq-style addresses to publish on
    """
    context = zmq.Context()
    receiver = context.socket(zmq.PULL)
    receiver.bind(pullAddress)
    publisher = context.socket(zmq.PUB)
    for pubAddress in pubAddresses:
        publisher.bind(pubAddress)
    while True:
        message = receiver.recv()
        #do some message storage here
        publisher.send(message)

def main():
    from optparse import OptionParser
    usage = "%prog [OPTIONS] PULL_ADDRESS [[PUB_ADDRESS]..]"
    parser = OptionParser(usage=usage)
    opts, args = parser.parse_args()
    if len(args)<2:
        parser.error("Must give a pull address, and at least one publish "
                     "address in the zmq-style of address")
    pullAddress, pubAddresses = args[0], args[1:]
    broker(pullAddress, pubAddresses)

if __name__=="__main__":
    main()
        
