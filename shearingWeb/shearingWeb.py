#!/usr/bin/env python
import os
import json

import shearinglib
shearinglib.tornadoStream._setup_tornado()

import tornado
import tornado.web
import tornadio2
import tornadio2.router
import tornadio2.server
import tornadio2.conn

ROOT = os.path.normpath(os.path.dirname(__file__))

AUDIO_DB = os.path.join(ROOT, "db/audioFiles.json")

AUDIO_FILES_ROOT = os.path.join(ROOT, "db/audioFiles.d")

FILTER_DIR = os.path.join(ROOT, "db/filters")


class WebHandlerBase(tornado.web.RequestHandler):
    def _make_it_json(self):
        self.set_header("Content-Type", 'application/json')
        self.set_header("Pragma", "no-cache")
        self.set_header("Cache-Control", "no-cache, no-store, max-age=1, "
                        "must-revalidate")


class IndexHandler(WebHandlerBase):
    def get(self):
        self.render("static/index.html")

class AudioDBHandler(WebHandlerBase):
    def get(self):
        self.set_header("Content-Type", 'application/javascript')
        self.set_header("Pragma", "no-cache")
        self.set_header("Cache-Control", "no-cache, no-store, max-age=1, "
                        "must-revalidate")
        self.finish("var availableAudio = %s;" % open(AUDIO_DB).read())

    def post(self):
        self._make_it_json()
        sound_name = self.get_argument("soundName", strip=True)
        file_name = self.get_argument("qqfile", strip=True)
        fn = os.path.join(AUDIO_FILES_ROOT, file_name)
        data = self.request.body #XXX: unchecked data is bad data
        if len(data)==0:
            self.finish('{"success": false}') #it is success here, because dumb
        fd = open(fn, "w")
        fd.write(data)
        fd.close()
        db = json.loads(open(AUDIO_DB).read())
        location = "/audioFiles/%s" % file_name
        db[sound_name] = location
        fd = open(AUDIO_DB, "w")
        fd.write(json.dumps(db))
        fd.close()
        self.finish(json.dumps({"success": True, "soundId": sound_name,
                                "location": location}))
        
        
class FilterHandler(WebHandlerBase):        
    def get(self, username):
        fn = os.path.join(FILTER_DIR, username)
        self._make_it_json()
        if not os.path.exists(fn):
            return json.dumps({"username": username,
                               "filters": [[".*", ".*", True, True,
                                            "Default"]]})
        self.finish(open(fn).read())

    def post(self, username):
        self._make_it_json()
        data = self.request.body
        if len(data)>0:
            try:
                data_dict = json.loads(data) #XXX: is this really needed? Maybe, maybe no.
            except:
                #XXX: log the exception
                self.finish('{"result": false}')
            fn = os.path.join(FILTER_DIR, username)
            fd = open(fn, "w")
            fd.write(data)
            fd.close()
            self.finish('{"result": true}')
        else:
            self.finish('{"result": false}')


class UpdaterConnection(tornadio2.conn.SocketConnection):

    clients = set()

    def on_open(self, *args, **kwds):
        self.clients.add(self)

    def on_close(self, *args, **kwds):
        self.clients.remove(self)

    def on_message(self, *args, **kwds):
        #incoming messages
        pass

    @classmethod
    def dispatch_message(cls, *messages):
        update = json.dumps(shearinglib.ShearingMessage
                            .build_update(*messages))
        for client in cls.clients:
            client.send(update)

UpdaterRouter = tornadio2.router.TornadioRouter(UpdaterConnection)


def get_application(**kwds):
    settings =  dict(enabled_protocols = ['websocket', 'flashsocket',
                                      'xhr-multipart', 'xhr-polling'],
                 #flash_policy_port = 843,
                 #flash_policy_file = os.path.join(ROOT, 'flashpolicy.xml'),
                 socket_io_port = 8001,
                 static_path=os.path.join(ROOT, "static"),
                 )
    settings.update(kwds)
    return tornado.web.Application(
        ([(r"/", IndexHandler),
          (r"/audio/(?:getAvailableFilesAsScript|upload)", AudioDBHandler),
          (r"/filters/(\S+)", FilterHandler),
          (r"/audioFiles/(.*)", tornado.web.StaticFileHandler,
           dict(path=AUDIO_FILES_ROOT))]
         + UpdaterRouter.urls),
        **settings)

def main():
    from optparse import OptionParser
    import logging
    parser = OptionParser(usage="%prog [options] [listen_port]")
    parser.add_option("-c", "--shearingConfig", default=None,
                      help=("Path to a Shearing config file. If not provided, "
                            "a recv address is needed."))
    parser.add_option("-r", "--recvAddress", default=None,
                      help=("A zmq recv address for shearing. If not provided, "
                            "a shearing config file is needed"))
    parser.add_option("-v", "--verbose", dest="loglevel", action="store_const",
                      const=logging.INFO, default=logging.INFO,
                      help="Use verbose level logging (default)")
    parser.add_option("-q", "--quiet", dest="loglevel", action="store_const",
                      const=logging.ERROR,
                      help="quiet logging. Only show errors.")
    parser.add_option("-s", "--silent", dest="loglevel", action="store_const",
                      const=logging.CRITICAL,
                      help="No logging. (almost) nothing is displayed.")
    parser.add_option("-d", "--debug", dest="loglevel", action="store_const",
                      const=logging.DEBUG,
                      help=("Use debug level logging. This is the most chatty "
                            "log level."))
    opts, args = parser.parse_args()
    if len(args)<1:
        listen_port = 8000
    else:
        listen_port = args[0]
    logging.getLogger().setLevel(opts.loglevel)
    application = get_application(socket_io_port=int(listen_port))
    listener = shearinglib.ShearingListener(opts.recvAddress, use_tornado=True)
    listener.add_recv_handler(UpdaterConnection.dispatch_message)
    listener.start()
    tornadio2.server.SocketServer(application)

if __name__ == '__main__':
    main()
