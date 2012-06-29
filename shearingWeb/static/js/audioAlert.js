/**
 * @fileoverview Alert system built around soundmanager2.
 */

//a few bits of configuration on soundManager
soundManager.url = "/static/swf/";
soundManager.flashVersion = 9;
soundManager.debugMode = false;


/**
 * Builds the audioAlert object. A few privates are intialized.
 * @constructor
 * @class AudioAlert is an alert system wrapper around soundmanager2. Should only be called once, but not a singleton. 
 */
function AudioAlert(){
  this._enabled = getPref("soundEnabled");
  this._errored = false;
  this._ready = new Deferred();
  this._loaded = new Deferred();
  this._sounds = {};
  this._playQueue = [];
}

AudioAlert.prototype.hasSound = function(soundId){
  var self = this;
  return soundId in self._sounds;
};

AudioAlert.prototype.addSound = function(soundId, url){
  var self = this;
  self._sounds[soundId] = soundManager.createSound(soundId, url);
  self._sounds[soundId].load();
};

AudioAlert.prototype.loadSounds = function(sounds){
    var self = this;
    for(var soundId in sounds){
      self.addSound(soundId, sounds[soundId]);
    }
    fireDeferred(self._ready);
};

AudioAlert.prototype.playQuick = function(soundId){
  var self = this;
  self._sounds[soundId].play({volume: manager.getPreference("volume", 100)});
};

AudioAlert.prototype._playSound = function(soundId){
  var self = this;
  var advanceQueue = function(){
    self._playQueue.shift();
    if(self._playQueue.length>0){
      self._playSound(self._playQueue[0]);
    }
  };
  self._sounds[soundId].play({volume: manager.getPreference("volume", 100),
                                 onfinish: advanceQueue,
                                 ondataerror: advanceQueue,
                                 onstop: advanceQueue
                             });  
};

AudioAlert.prototype.playSound = function(soundId){
  var self = this;
  //could do this with straight soundmanager, but why do that?
  //whatever calls this should call hasSound first to avoid being silly
  if(soundId==null){
    console.log("no sound!");
  }
  if(self._enabled){
    self._playQueue.push(soundId);
    if(self._playQueue.length===1){
      self._playSound(soundId);
    }
  }
};

AudioAlert.prototype.getSoundLength = function(soundId){
  var self = this;
  if(self.hasSound(soundId)){
    return self._sounds[soundId].duration / 1000.0;
  }else{
    return 0.0;
  }
};

/**
 * Toggles the enabled status of the audioAlert system. 
 * @returns {Boolean} The negation of the enabled status.
 * @member AudioAlert
*/
AudioAlert.prototype.toggleAudioAlerts = function(){
  var self = this;
  self._enabled = (!self._enabled && !self.errored && self._alertSound!==null);
  setPref("soundEnabled", this._enabled);
  return !self._enabled; //starts out disabled, but toggleButton is
			 //written for the other toggle functions
			 //which start out enabled.
};


AudioAlert.prototype.addSoundToEditor = function(sound){
  var self = this;
  var soundsList = $("soundsList");
  var playButton = A({class: "linkButton soundList_play", text: "play"}, ">"); 
  //soundmanager2 has fancy buttons, but I don't know how smart soundmanager is at using pre-loaded sounds
  var elem = TR({class: "soundListItem"}, 
                TD({class: "soundList_col soundName"}, sound), 
                TD({class: "soundList_col soundLen"}, self.getSoundLength(sound)),
                TD({class: "soundList_col playButton"}, playButton));
  soundsList.appendChild(elem);
  connect(playButton, "onclick", function(){
            self.playQuick(sound);
          });
};

AudioAlert.prototype.setupUploadButton = function(){
  var self = this;
  //might not be able to handle wav
  self.uploader = new qq.FileUploader({action: "/audio/upload",
                                          element: $("file-uploader"),
                                          allowedExtensions: ["mp3", "ogg", "mp4"],
                                          onSubmit: function(id, filename){
                                          var soundName = prompt("Enter a name for the sound"); //TODO: de-js garbage
                                          if(isNothing(filename)){
                                            return false;
                                          }
                                          self.uploader.setParams({soundName: soundName});
                                          return true;
                                        },
                                          onComplete: function(id, fileName, responseJSON){
                                          self.addSound(responseJSON.soundId, responseJSON.location);
                                          self.addSoundToEditor(responseJSON.soundId);
                                        }
                                      }); 
};


AudioAlert.prototype.setupSoundEditor = function(){
  var self = this;
  var soundsList = $("soundsList");
  soundsList.innerHTML = "";
  for(var sound in self._sounds){
    self.addSoundToEditor(sound)  
  }
};

var audioAlert = new AudioAlert();

/**Successful news ventures have moved in two distinct directions, sensationalist and untrustworthy news as entertainment, and 
 * Initializes audioAlert when soundManager is done loading.
 */
soundManager.onload = function(){
    fireDeferred(audioAlert._loaded);
};

/**
 * Error functuon for soundManager.
 */
soundManager.onerror = function(){
  audioAlert._errored = true;
  audioAlert._enabled = false;
};

audioAlert._loaded.addCallback(function(){
                                 audioAlert.loadSounds(availableAudio);
                               });
