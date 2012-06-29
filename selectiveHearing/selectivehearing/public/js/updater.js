//written to run inside a Worker thread
//see http://weblog.bocoup.com/javascript-creating-an-eventsource-within-a-worker
//and http://blog.abourget.net/2010/6/16/html5-eventsource-in-pylons-read-comet-ajax-polling


function Updater(){
  var self = this;
  self.eventSrc = null;
  self.running = false;
  self.start();
}

Updater.prototype.start = function(){
  var self = this;
  self.eventSrc = new EventSource("/updater/updateStream");

  //perhaps update stream should just handle this
  /*doXHR("/updater/recap", function(res){
   *				var update = JSON.parse(res.responseText);
   *				postMessage({"type": "recap",
   *						      "message": update});
   *     });
   */

  self.eventSrc.addEventListener('open', function(event){
                                   console.log("updateStream: connection established");
                                   self.running = true;
                                   callLater(3600, function(){
                                               self.restart();
                                             });
                                 });

  self.eventSrc.addEventListener('message', function(event) {
                                   var message = JSON.parse(event.data);
                                   manager.handleUpdaterMessage({"type": "update",
                                                                    "message": message});
                                 });

  self.eventSrc.addEventListener('error', function(event){
                                   if(self.running){
                                     console.log("updateStream: error detected, restarting connection");
                                     self.restart();
                                   }
                                 });
};

Updater.prototype.stop = function(){
  var self = this;
  self.eventSrc.close();
  self.running = false;
};

Updater.prototype.restart = function(){
  var self = this;
  self.stop();
  self.start();
  callLater(10, function(){
              if(self.eventSrc.readyState===self.eventSrc.CLOSED){
                console.log("updateStream: failed to reconnect. Trying again in 10 seconds.");
                self.restart();
              }
            });
};
