try{
  if(isUndefinedOrNull(window.localStorage)){
    window.storageEngine = {};
  }else{
    window.storageEngine = window.localStorage;
  }
 }catch(e){
  window.storageEngine = {};
 }


prefDefs = {
  soundEnabled: true,
  initialized: true,
};


prefTypes = {
  username: "str",
  soundEnabled: "bool",
  initialized: "bool",
  maxMessages: "int",
  volume: "int"
}


function setPref(field, val){
  localStorage[field] = val;
}


function initializePrefSaver(){
  for(prefKey in prefDefs){
    setPref(prefKey, prefDefs[prefKey]);
  }
}

function typePref(field, value){
  if(value===undefined){
    return null;
  }
  var fType = prefTypes[field];
  switch(fType){
  case "bool":
    return bool(value);
  case "str":
    return value;
  case "int":
    return parseInt(value);
  default:
    return value;
  }
}


function getPref(field){
  if(localStorage.initialized!=="true")
    initializePrefSaver();
  return typePref(field, localStorage[field]);
}

function delPref(field){
  delete localStorage[field];
}

