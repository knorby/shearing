# -*- coding: utf-8 -*-
import ConfigParser
import itertools

try:
    import json
except ImportError:
    import simplejson as json

import zmq

_tornado_event_loop_setup = False

class _TornadoStream(object):
    _instance = None

    def __new__(cls, *args, **kwds):
        if not cls._instance:
            cls._instance = super(_TornadoStream, cls).__new__(cls, *args,
                                                               **kwds)
        return cls._instance

    def __init__(self):
        self._socket = None
        self._stream = None
        self._recv_handlers = []
        self._is_setup = False

    def _setup_tornado(self):
        if self._is_setup:
            return
        from zmq.eventloop import ioloop, zmqstream
        ioloop.install()
        from tornado.ioloop import IOLoop
        self._zmqioloop = ioloop
        self._zmqstream = zmqstream
        self._tornadoioloop = IOLoop
        self._is_setup = True

    def add_recv_handler(self, recv_handler):
        self._recv_handlers.append(recv_handler)

    def _handle_recv(self, updates):
        update = json.loads("".join(updates))
        for handler in self._recv_handlers:
            handler(update)

    def _setup_stream(self):
        if self._socket is None:
            raise RuntimeError("Socket not set")
        self.stream = self._zmqstream.ZMQStream(self._socket,
                                                self._tornadoioloop.instance())
        self.stream.on_recv(self._handle_recv)

    def attach_socket(self, socket, *recv_handlers):
        self._setup_tornado()
        self._socket = socket
        for recv_handler in recv_handlers:
            self.add_recv_handler(recv_handler)
        self._setup_stream()
        
tornadoStream = _TornadoStream()

class ShearingMessage(object):

    _status_names = {0: "OK",   1: "Warning", 2: "Critical", 3: "Unknown"}

    def __init__(self, host, service, status, message):
        self.host = host
        self.service = service
        self.status = status
        self.message = message

    @property
    def status_name(self):
        return self._status_names.get(self.status, "Undefined")

    @staticmethod
    def build_update(*messages):
        update = {}
        for message in messages:
            host = message.host
            if not host in update:
                update[host] = []
            update[host].append([message.service, message.message,
                                 message.status])
        return update

    @classmethod
    def from_update(cls, update):
        return itertools.chain.from_iterable((cls(hostname, msg[0],
                                                  msg[2], msg[1])
                                              for msg in msgs)
                                             for hostname, msgs
                                             in update.iteritems())

    def __repr__(self):
        return (u"<ShearingMessage Host: %s Service: %s Status: %s>"
                % (self.host, self.service, self.status_name))
        
class ShearingSocketBase(object):

    def __init__(self, socket_address, socket_type):
        self.socket_address = socket_address
        self.socket_type = socket_type
        self._ctx = None
        self._socket = None
        self.setup_socket()

    def setup_socket(self):
        self._ctx = zmq.Context() #XXX: move this around
        self._socket = self._ctx.socket(self.socket_type)
        self._socket.connect(self.socket_address)
        if self.socket_type==zmq.SUB:
            self._socket.setsockopt(zmq.SUBSCRIBE, "")

    def __repr__(self):
        return (u'<%s socket_address="%s" socket_type=%s>'
                % (self.socket_address, self.socket_type))

class ShearingSender(ShearingSocketBase):

    def __init__(self, socket_address, socket_type=zmq.PUSH):
        super(ShearingSender, self.__class__).__init__(self, socket_address,
                                                       socket_type)

    def send(self, *messages):
        update = ShearingMessage.build_update(*messages)
        self._socket.send_json(update)

class ShearingListener(ShearingSocketBase):

    def __init__(self, socket_address, socket_type=zmq.SUB, use_tornado=False): #XXX: right socket type?
        super(ShearingListener, self.__class__).__init__(self, socket_address,
                                                         socket_type)
        self.use_tornado = use_tornado
        self._recv_handlers = []
        
    def add_recv_handler(self, recv_handler):
        self._recv_handlers.append(recv_handler)

    def _handle_recv(self, update):
        messages = ShearingMessage.from_update(update)
        for recv_handler in self._recv_handlers:
            recv_handler(*messages)

    def start(self, use_tornado=None):
        if (use_tornado is None and self.use_tornado) or use_tornado:
            tornadoStream.attach_socket(self._socket, self._handle_recv)
        else:
            while True: #something to stop this too?
                update = self._socket.recv_json()
                self._handle_recv(update)


class ShearingBroker(object):

    def __init__(self, recv_addresses, pub_addresses,
                 recv_socket_type=zmq.PULL, pub_socket_type=zmq.PUB,
                 use_tornado=False):
        self.recv_addresses = recv_addresses
        self.pub_addresses = pub_addresses
        self.recv_socket_type = recv_socket_type
        self.pub_socket_type = pub_socket_type
        self._ctx = None
        self._recv_socket = None
        self._pub_socket = None
        self._filters = []
        self.use_tornado = use_tornado
        self.setup_sockets()

    def setup_sockets(self):
        self._ctx = zmq.Context()
        self._recv_socket = self._ctx.socket(self.recv_socket_type)
        for recv_address in self.recv_addresses:
            self._recv_socket.bind(recv_address)
        if self.recv_socket_type==zmq.SUB:
            self._recv_socket.setsockopt(zmq.SUBSCRIBE, "")
        self._pub_socket = self._ctx.socket(self.pub_socket_type)
        for pub_address in self.pub_addresses:
            self._pub_socket.bind(pub_address)

    def add_filter(self, line_filter):
        self._filters.append(line_filter)

    def _handle_filters(self, update):
        messages = ShearingMessage.from_update(update)
        for line_filter in self._filters:
            try:
                tempMessages = line_filter(*messages)
            except:
                continue #XXX: log an exception and such, maybe remove the filter
            messages = tempMessages
        return ShearingMessage.build_update(*messages)

    def send(self, update):
        self._pub_socket.send_json(update)

    def send_messages(self, *messages):
        update = ShearingMessage.build_update(*messages)
        self.send(update)

    def _handle_update(self, update):
        if len(self._filters)>0:
            update = self._handle_filters(update)
        self.send(update)        

    def start(self, use_tornado=False):
        if (use_tornado is None and self.use_tornado) or use_tornado:
            tornadoStream.attach_socket(self._recv_socket,
                                        self._handle_update)
        else:
            while True:
                update = self._recv_socket.recv_json()
                self._handle_update(update)

            
