//written to run inside a Worker thread
//see http://weblog.bocoup.com/javascript-creating-an-eventsource-within-a-worker
//and http://blog.abourget.net/2010/6/16/html5-eventsource-in-pylons-read-comet-ajax-polling


function Updater(){
  var self = this;
  self.socket = null;
  self.running = false;
  self.start();
}

Updater.prototype.start = function(){
  var self = this;
  if(self.socket!==null){
    self.running = true;
    return;
  }
  self.socket = io.connect(); //you can specify an address here, but socket.io uses the same server by default

  self.socket.on('connect', function(){
                                   console.log("updateStream: connection established");
                                   self.running = true;
                                 });

  self.socket.on('message', function(event) {
                   if(self.running){
                     var message = JSON.parse(event);
                     manager.handleUpdaterMessage({"type": "update",
                                                      "message": message});
                   }
                 });

  self.socket.on('error', function(){
                                   if(self.running){
                                     console.log("updateStream: error detected");
                                   }
                                 });
};

Updater.prototype.stop = function(){
  var self = this;
  //self.socket.disconnect(); //this causes problems
  self.running = false;
};

Updater.prototype.restart = function(){
  var self = this;
  console.log("Updater restart was called");
};
