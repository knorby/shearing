function buildDefLvlDict(){
  var lvlDefDict = {};
  for(var level in lvls){
    lvlDefDict[lvls[level]] = true;
  }
  return lvlDefDict;
}

//I should add in src
function Filter(host, service, notifyEnabled, showMsg,  sound, levels){
  //host - host pattern. Will be compiled as a regexp
  //service - same as host
  //notifyEnabled - bool. Determines if notifications should be made or not
  //showMsg - bool. Determines if 
  //sound - name of the audio. The audio manager can figure out what that is.
  var self = this;
  self.notifyEnabled = notifyEnabled;
  self.showMsg = showMsg;
  self.setHostServicePatterns(host, service);
  self.setSound(sound);
  self.levels = levels;
}


Filter.prototype.setHostServicePatterns = function(host, service){
  var self = this;
  //perhaps do some validity tests here?
  //could do a check to see if anything has changed. Depends on how fast RegExps compile.
  self.host = host;
  self.service = service;
  if (isNothing(host)){
    self.hostExpr = /.*/;
  }else{
    self.hostExpr = new RegExp(host);
  }
  if (isNothing(service)){
    self.serviceExpr = /.*/;
  }else{
    self.serviceExpr = new RegExp(service);
  }
};

Filter.prototype.setSound = function(sound){
  var self = this;
  if(manager.audioAlert.hasSound(sound)){
    self.sound = sound;
  }else{
    self.sound = null;
  }
};

Filter.prototype.test = function(host, service, lvl){
  var self = this;
  return self.hostExpr.test(host) && self.serviceExpr.test(service) && bool(self.levels[lvl]);
};

Filter.prototype.notify = function(host, service, msg, lvl){
  var self = this;
  if (self.showMsg){
    manager.msgDisplay.addMessage(self, host, service, msg, lvl);
  }
  if (self.notifyEnabled){
    var title = host + " - " + service;
    manager.notifier.notify(title, msg, lvl);
    if(self.sound!==null){
      manager.audioAlert.playSound(self.sound);
    }
    return true;
  }
  return false;
};

Filter.prototype.cmpFilters = function(otherFilter){
  var self = this;
  return (self.host === otherFilter.host 
          && self.service === otherFilter.service 
          && objEqual(self.levels, otherFilter.levels) 
          && self.sound === otherFilter.sound 
          && self.showMsg === otherFilter.showMsg
          && self.notifyEnabled === otherFilter.notifyEnabled);
};

//keeping this pure. There will be a quasi-classmethod somewhere around here.
function FilterSet(username, filters){
  var self = this;
  self.username = username;
  self.filters = filters;
}

FilterSet.prototype.notify = function(host, service, msg, lvl){
  var self = this;
  var len = self.filters.length;
  var filter;
  for(var i=0; i<len; i++){
    filter = self.filters[i];
    if(filter.test(host, service, lvl)){
      return filter.notify(host, service, msg, lvl);
    }
  }
  return null;
};
  
FilterSet.prototype.saveToServer = function(){
  var self = this;
  var filterList = map(function(aFilter){
			 return [aFilter.host, aFilter.service,
				 aFilter.notifyEnabled, 
                                 aFilter.showMsg, aFilter.sound, aFilter.levels];
		       }, self.filters);
  var obj = {"username": self.username, "filters": filterList};
  var objJson = serialJSON(obj);
  var req = doXHR("/filters/" + self.username, {method: "POST", sendContent: objJson});
  req.addCallback(function(res){
                    var resp = parseJSON(res.responseText);
                    if(resp.result===false){
                      manager.showErrorMessage("Failed to save filters to server");
                    }
                  });
};

FilterSet.prototype.makeEditorSortable = function(){
  MochiKit.Sortable.create("filterList", {tag: "tr", only: "filterRule"});
};

FilterSet.prototype.buildFilterEditorElem = function(filter, sounds){
  var self = this;
  if(isNothing(sounds)){
    sounds = manager.getAvailableSounds();
  }
  var deleteLink = A({class: "linkButton filterRule_delete", title: "delete"}, '\u00D7');
  var levelButtons = [];
  var levelElem, levelBox, levelVal;
  for(var level in lvls){
    levelVal = lvls[level];
    levelBox = buildCheckbox({"class": "filterRule_filterLevelBox"}, bool(filter.levels[levelVal]));
    levelElem = LI({"class": "filterRule_filterLevelItem"}, levelBox, level);
    levelBox.level = levelVal;
    levelElem.style.backgroundColor = chooseLvlColor(levelVal);
    levelButtons.push(levelElem);
  }
  var filterElem = TR({"class": "filterRule"}, 
                      TD({"class": "filterRule_col"}, INPUT({"class": "filterRule_host", "value": filter.host, "type": "text"})),
                      TD({"class": "filterRule_col"}, INPUT({"class": "filterRule_service", "value": filter.service, "type": "text"})),
                      TD({"class": "filterRule_col"}, buildSelect({"class": "filterRule_sound"}, sounds, filter.sound)),
                      TD({"class": "filterRule_col"}, buildCheckbox({"class": "filterRule_notify"}, filter.notifyEnabled)),
                      TD({"class": "filterRule_col"}, buildCheckbox({"class": "filterRule_showMsg"}, filter.showMsg)),
                      TD({"class": " filterRule_colLevelSelect filterRule_col"}, UL({"class": "filterRule_levelSelectList"}, levelButtons)),
                      TD({"class": "filterRule_col"}, deleteLink));  
  connect(deleteLink, "onclick", function(){
            removeElement(filterElem);
          });
  filterElem.filterObj = filter;
  return filterElem;
};

FilterSet.prototype.loadFilterEditor = function(){
  var self = this;
  var filtersElem = $("filterList");
  map(removeElement, $$("#filterList .filterRule"));
  var sounds = manager.getAvailableSounds();
  appendChildNodes(filtersElem, 
                   map(function(aFilter){ 
                         return self.buildFilterEditorElem(aFilter, sounds);
                       }, self.filters));
  self.makeEditorSortable();
};

FilterSet.prototype.saveFilterEditor = function(){
  var self = this;
  var filter, filterElem;
  var filterElems = $$("#filterList .filterRule");
  var newFiltersList = [];
  var len = filterElems.length;
  for (var i=0; i<len; i++){
    filterElem = filterElems[i];
    filter = filterElem.filterObj;
    filter.notifyEnabled = filterElem.querySelector(".filterRule_notify").checked;
    filter.showMsg = filterElem.querySelector(".filterRule_showMsg").checked;
    filter.setHostServicePatterns(filterElem.querySelector(".filterRule_host").value, 
				  filterElem.querySelector(".filterRule_service").value);
    filter.setSound(filterElem.querySelector(".filterRule_sound").value);
    var filterButtons = filterElem.querySelectorAll(".filterRule_filterLevelBox");
    map(function(lvlBox){
          filter.levels[lvlBox.level] = lvlBox.checked;
        }, filterButtons);
    newFiltersList.push(filter);
  }
  self.filters = newFiltersList;
  //maybe should do something to find the username
  self.saveToServer();
};


