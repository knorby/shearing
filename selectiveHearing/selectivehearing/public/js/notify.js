function Notifier(timeout, loadDeferred){
  var self = this;
  self._loadDeferred = loadDeferred;
  if (isUndefinedOrNull(window.webkitNotifications)){
    alert("your browser can't support popup notifications. Please use the latest Chrome if possible");
  }
  if (!self.hasPermission()){
    //this needs to be called from something requiring a button click...seriously
    window.webkitNotifications.requestPermission(partial(fireDeferred, loadDeferred));
  }else{
    fireDeferred(loadDeferred);
  }
  self.timeout = timeout;
  self.notifications = [];
}

Notifier.prototype.hasPermission = function(){
  return window.webkitNotifications.checkPermission()===0;
};

Notifier.prototype.confirmPermission = function(){
  var self = this;
  if(self.hasPermission()){
    fireDeferred(self._loadDeferred);
  }
};

Notifier.prototype.notify = function(title, msg, lvl){
  var self = this;
  var image = chooseLvlImage(lvl);
  var notification = window.webkitNotifications.createNotification(image, title, msg);
  self.notifications.push(notification);
  notification.ondisplay = function(){
    if(self.timeout>0){
      callLater(self.timeout, function(){
                  notification.cancel();
                });
    }
  };
  notification.onclose = function(){
    var i = self.notifications.indexOf(notification); //could store this too
    delete self.notifications[i];
  };
  notification.show();
};

Notifier.prototype.clearAllNotifications = function(){
  var self = this;
  var len = self.notifications.length;
  var notification;
  for(var i=0; i<len; i++){
    item = self.notifications[i];
    if(!isNothing(item)){
      item.cancel();
    }
  }
  self.notifications = [];
};
