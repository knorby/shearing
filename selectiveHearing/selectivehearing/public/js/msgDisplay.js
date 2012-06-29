function MessageDisplay(elem, maxMessages){
  var self = this;
  self.displayElem = elem;
  self.maxMessages = maxMessages;
  self.curCount = 0;
}

MessageDisplay.prototype.purgeMessages = function(makeRoom){
  var self = this;
  self.curCount = self.displayElem.childNodes.length;
  for(var i=self.curCount-1; i>=(self.maxMessages-makeRoom); i--){
    removeElement(self.displayElem.childNodes[i]);
  }
};

MessageDisplay.prototype.addMessage = function(filterObj, host, service, 
                                               msg, level){
  var self = this;  
  if(self.maxMessages>0 && ++self.curCount>self.maxMessages){
    self.purgeMessages(1);
    self.curCount = self.displayElem.childNodes.length + 1;
  }
  var lvlColor = chooseLvlColor(level);
  var extraElem = DIV({class: "message-extra"});
  var msgElem = LI({class: "message"}, 
                   SPAN({class: "message-title"}, 
                       SPAN({class: "message-host"}, host),
                       SPAN({class: "message-service"}, service)),
                   SPAN({class: "message-text"}, msg),
                   extraElem);
  msgElem.filterObj = filterObj;
  msgElem.timestamp = new Date();
  msgElem.extraAreaBuilt = false;
  msgElem.extraAreaDisplayed = false;
  msgElem.extraElem = extraElem;
  msgElem.host = host;
  msgElem.service = service;
  msgElem.style.background = "-webkit-gradient(linear, left bottom, right bottom, color-stop(0.01, " + lvlColor + "), color-stop(0.90, #333333))";
  connect(msgElem, "onclick", function(){
            if(msgElem.msgAreaDisplayed){
              slideUp(extraElem);
              msgElem.msgAreaDisplayed = false;
            }else{
              if(!msgElem.extraAreaBuilt){
                var buildFilterButton = BUTTON({class: "message-buildFilterButton"}, "Add Filter");
                var removeMessageButton = BUTTON({class: "message-removeButton"}, "Dismiss");
                appendChildNodes(extraElem,  buildFieldTable({"Date": msgElem.timestamp.toLocaleString()}),
                                 buildFilterButton, removeMessageButton);
                connect(buildFilterButton, "onclick", function(){
                          manager.addFilterFromMsg(msgElem);
                        });
                connect(removeMessageButton, "onclick", function(){
                          removeElement(msgElem);
                          self.curCount--;
                        });
                msgElem.extraAreaBuilt = true;
              }
              slideDown(extraElem);
              msgElem.msgAreaDisplayed = true;
            }
          });
  //need two options here:
  // 1 - view and current filter/notification options
  // 2 - create a new filter. The new filter should be inserted 1 above
  //     the current filter
  insertAtTop(self.displayElem, msgElem); //TODO: insert at top
};


MessageDisplay.prototype.setMaxMessages = function(maxMessages){
  var self = this;
  self.maxMessages = maxMessages;
  self.curCount = self.displayElem.childNodes.length;
  if(self.maxMessages>self.curCount){
    self.purgeMessages();
    self.curCount = self.displayElem.childNodes.length;
  }
};
