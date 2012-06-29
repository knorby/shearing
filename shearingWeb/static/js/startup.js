function Manager(){
  var self = this;
  self.messages = [];
  self.filterSet = null;
  self.notifier = null;
  self.audioAlert = audioAlert; 
  self.bodyLoadDeferred = new Deferred();
  self.updaterRunning = false;
  self.updateWorker = null;
}

Manager.prototype.getPreference = function(key, defVal){
  var self = this;
  var retval = getPref(key);
  if(retval!==null){
    return retval;
  }
  return defVal;
};

Manager.prototype.setPreference = function(key, val){
  var self = this;
  setPref(key, val);
};

Manager.prototype.bodyload = function(){
  var self = this;
  $("username").value = self.getPreference("username", "");
  self.msgDisplay = new MessageDisplay($("messages"), self.getPreference("maxMessages", 20));
  self.audioAlert.setupUploadButton();
  fireDeferred(self.bodyLoadDeferred);
};

Manager.prototype.exit = function(){
  var self = this;
  self.clearNotifications();
};

Manager.prototype.startup = function(){
  var self = this;
  self.runUpdater();
  map(displayInline, $$(".sideButtons button"));
  showFakeWindow("body");
};

Manager.prototype.showErrorMessage = function(msg){
  alert(msg); //TODO: isn't the 90's. Fix this.
};

Manager.prototype.handleUpdate = function(msg){
  var self = this;
  var items, len, i, update;
  for(var host in msg){
    items = msg[host];
    len = items.length;
    for(i=0; i<len; i++){
      update = items[i];
      self.filterSet.notify(host, update[0], update[1], update[2]);
    }
  }
};


Manager.prototype.handleRecap = function(msg){
  return;
};

Manager.prototype.handleUpdaterMessage = function(message){
  var self = this;
  if(message.type=="recap"){
      self.handleRecap(message.message);
  }else if(message.type=="update"){
    self.handleUpdate(message.message);
  }


};

Manager.prototype.runUpdater = function(){
  var self = this;
  //self.updaterWorker = new Worker("/js/updater.js");
  //self.updaterWorker.onmessage = function(event){
  //  console.log(event);
  //  var message = event.data;
  //};
  //self.updateWorker.postMessage(true);
  if(self.updaterRunning){
    return;
  }
  if(isNothing(self.updateWorker)){
    self.updateWorker = new Updater();
  }else{
    self.updateWorker.start();
  }
  self.updaterRunning = true;
 };

Manager.prototype.stopUpdater = function(){
  var self = this;
  self.updateWorker.stop();
  self.updaterRunning = false;
};

Manager.prototype.loadFilterSet = function(username, loadDeferred){
  var self = this;
  var req = doXHR("/filters/" + username);
  req.addCallback(function(res){
                    var curFilter;
                    var filters = [];
                    var filtersRec = parseJSON(res.responseText);
                    var lvlDefDict = null;
                    var len = filtersRec.filters.length;
                    for(var i=0; i<len; i++){
                      curFilter = filtersRec.filters[i];
                      if(curFilter.length===5){
                        if(lvlDefDict===null){
                          lvlDefDict = buildDefLvlDict();
                        }
                        curFilter.push(clone(lvlDefDict));
                      }
                      filters.push(new Filter(curFilter[0], curFilter[1], 
                                              curFilter[2], curFilter[3], 
                                              curFilter[4], curFilter[5]));
                    };
                    self.filterSet = new FilterSet(filtersRec.username, filters);
                    fireDeferred(loadDeferred);
                  });
  req.addErrback(console.log);
};

Manager.prototype.load = function(){
  var self = this;
  var username = $("username").value;
  if(isNothing(username)){
    self.showErrorMessage("please specify a username");
    Highlight("username");
    return;
  }
  self.setPreference("username", username);
  var filterSetDeferred = new Deferred();
  var notifierDeferred = new Deferred();

  var loadCompleteDeferred = new DeferredList([filterSetDeferred, 
                                               notifierDeferred,
                                               self.audioAlert._ready,
                                               self.bodyLoadDeferred]);
  self.filterSet = null; //only this should really be cleared here
  self.audioAlert._ready.addCallback(function(){
                                       self.loadFilterSet(username, filterSetDeferred);
                                     });
  self.notifier = new Notifier(self.getPreference("notifyTimeout", 10), 
                               notifierDeferred);
  loadCompleteDeferred.addCallback(function(){ //TODO: there is a way to simplify this
				     self.startup();
				   });
};

Manager.prototype.toggleUpdates = function(){
  var self = this;
  var button = $("updateToggleButton");
  if(self.updaterRunning){
    self.stopUpdater();
    button.textContent = "Start Updates";
  }else{
    self.runUpdater();
    button.textContent = "Stop Updates";
  }
};

Manager.prototype.clearNotifications = function(){
  var self = this;
  self.notifier.clearAllNotifications();
};

Manager.prototype.toggleMute = function(){
  var self = this;
  var button = $("muteButton");
  if(self.audioAlert._enabled){
    button.textContent = "Unmute";
  }else{
    button.textContent = "Mute";
  }
  self.audioAlert._enabled = !self.audioAlert._enabled;
};

Manager.prototype.editFilters = function(){
  var self = this;
  if($("filters").style.display!=="block"){
    self.filterSet.loadFilterEditor();
    showFakeWindow("filters");
  }
};

Manager.prototype.closeFilters = function(){
  var self = this;
  if($("filters").style.display==="block"){
    showFakeWindow("body");
  }
};

Manager.prototype.saveFilters = function(){
  var self = this;
  self.filterSet.saveFilterEditor();
  self.closeFilters();
};

Manager.prototype.getAvailableSounds = function(){
  var self = this;
  return [''].concat(keys(self.audioAlert._sounds));
};

Manager.prototype.addFilterFromMsg = function(msgElem){
  var self = this;
  var newFilter = new Filter(msgElem.host, msgElem.service,
                             msgElem.filterObj.notifyEnabled,
                             msgElem.filterObj.showMsg,
                             msgElem.filterObj.sound,
                             buildDefLvlDict());
  var newFilterElem = self.filterSet.buildFilterEditorElem(newFilter);
  self.editFilters();
  var filterElems = $$("#filterList .filterRule");
  var len = filterElems.length;
  var insertNode = null;
  for(var i=0; i<len; i++){
    if(msgElem.filterObj.cmpFilters(filterElems[i].filterObj)){
      insertNode = filterElems[i];
    }
  }
  if(insertNode===null){
    insertNode = filterElems[0];
  }
  insertSiblingNodesBefore(insertNode, newFilterElem);
  self.filterSet.makeEditorSortable();
  callLater(1, function(){ Highlight(newFilterElem); });
};

Manager.prototype.addFilterToEditor = function(){
  var self = this;
  var defFilter = self.filterSet.filters[self.filterSet.filters.length-1];
  var newFilter = new Filter(defFilter.host, defFilter.service, 
                             defFilter.notifyEnabled, defFilter.showMsg, 
                             defFilter.sound, clone(defFilter.levels));
  var lastElem = $$(".filterRule:last-child")[0];
  var newFilterElem = self.filterSet.buildFilterEditorElem(newFilter);
  appendChildNodes("filterList", newFilterElem); //call this the new default
  self.filterSet.makeEditorSortable();
  Highlight(lastElem);
};

Manager.prototype.editSounds = function(){
  var self = this;
  self.audioAlert.setupSoundEditor();
  showFakeWindow("sounds");
};

Manager.prototype.editSettings = function(){
  var self = this;
  $("enabledSoundsCheckbox").checked = self.getPreference("soundEnabled", true);
  $("maxDisplayedMessagesInput").value = self.getPreference("maxMessages", 20);
  $("notifyTimeoutInput").value = self.getPreference("notifyTimeout", 20);
  showFakeWindow("settings");
};

Manager.prototype.saveSettings = function(){
  var self = this;
  self.setPreference("soundEnabled", $("enabledSoundsCheckbox").checked);
  self.audioAlert._enabled = $("enabledSoundsCheckbox").checked;
  var maxMessages = parseInt($("maxDisplayedMessagesInput").value);
  if(!isNaN(maxMessages)){
    self.setPreference("maxMessages", maxMessages);
    self.msgDisplay.setMaxMessages(maxMessages);
  }
  var timeout = parseInt($("notifyTimeoutInput").value);
  if(!isNaN(timeout)){
    self.notifier.timeout = timeout;
    self.setPreference("notifyTimeout", timeout);
  }
  showFakeWindow("body");
};

  
var manager = new Manager();

document.addEventListener('DOMContentLoaded', function(){
                            manager.bodyload();
                            document.body.onunload = function(){
                              manager.exit();
                            };
                          });

