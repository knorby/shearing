import logging
import time
#import random

from pylons import request, response, session, tmpl_context as c
from pylons.controllers.util import abort, redirect_to
from pylons import config

import zmq

from selectivehearing.lib.base import BaseController, render

log = logging.getLogger(__name__)

class UpdaterController(BaseController):

    def updateStream(self):
        """for use with EventSource in Chrome 6+"""
        response.headers['content-type'] = 'text/event-stream'
        response.status_int = 200
        #updater logic needs to go here...
        context = zmq.Context()
        receiver = context.socket(zmq.SUB)
        receiver.connect(config["selectivehearing.updater_url"])
        receiver.setsockopt(zmq.SUBSCRIBE, "")
        def go():
            while True:
                update = receiver.recv()
                #update = '{"foo": [["bar", "broken! %s", %s]]}' % (time.time(), random.randint(0,4)) #this should actually be an update...
                msg = "data: %s\n\n" % (update)
                yield msg
        return go()

    def sendNotication(self):
        host = request.params.get("host")
        service = request.params.get("service")
            
