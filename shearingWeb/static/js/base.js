var parseJSON = null;
var serialJSON = null;

if(!(isUndefinedOrNull(window.JSON))){
  parseJSON = window.JSON.parse;
  serialJSON = window.JSON.stringify;
 }else{
  parseJSON = evalJSON;
  serialJSON = serializeJSON;
}

if(!(isUndefinedOrNull(document.querySelectorAll))){
  $$ = function(query){ return document.querySelectorAll(query); };
}

function objCompare(a, b){
  var aKeys =  keys(a), bKeys = keys(b);
  var res;
  if(objEqual(aKeys, bKeys)){
    for(var key in a){
      res = compare(a[key], b[key]);
      if(res!==0){
        return res;
      }
    }
    return 0;
  }else{
    res = compare(aKeys.length, bKeys.length);
    if(res!==0){
      return res;
    }else{
      return 1; //why not?
    }
  }
}

registerComparator("simpleObjectCompare", 
                   function(a, b){ return typeof(a)=="object" && typeof(b)=="object" },
                   objCompare, false);
                   

function isNothing(something){
  return isUndefinedOrNull(something) || something=="" || something==0;
}

function insertAtTop(elem, children){
  elem = getElement(elem);
  if(elem.childNodes.length>0){
    insertSiblingNodesBefore(elem.firstChild, children);
  }else{
    appendChildNodes(elem, children);
  }
}
    
function buildCheckbox(argObj, checked){
  if(isUndefinedOrNull(argObj)){
    argObj = {};
  }
  argObj.type = "checkbox";
  if(checked){
    argObj.checked = "checked";
  }
  return INPUT(argObj);
}

function onEnterEvent(func, event){
  var key = event.key();
  if(key.string=="KEY_ENTER"){
    func();
  }
}

/**
 * Changes the text of a button, depending on the return value of a
 * toggle function.
 * @param {DOM Button} button The button to update
 * @param {Boolean} retCond The return value of the toggle function
 * @param {String} falseText The string to use if the value is false
 * @param {String} TrueText The string to use if the value is true
 */
function toggleButton(button, retCond, falseText, trueText){
  button = $(button);
  if(retCond){
    button.textContent = trueText;
  }else{
    button.textContent = falseText;
  }
  return false;
}

function fireDeferred(aDeferred){
  if(!isUndefinedOrNull(aDeferred)){
    aDeferred.fired = 0;
    aDeferred._fire();
  }
}

function showFakeWindow(aFakeWindow){
  var expandingWindow = $(aFakeWindow);
  if(expandingWindow.style.display!=="block"){
    slideDown(expandingWindow);
  }
  var fakeWindows = $$(".fakewindow");
  var len = fakeWindows.length;
  var aFakeWindow;
  for(var i=0; i<len; i++){
    aFakeWindow = fakeWindows[i];
    if(aFakeWindow==expandingWindow){
      continue;
    }
    if(aFakeWindow.id==="body"){
      continue;
    }
    //perhaps check to see if it is displayed? depnds on how heavy this is on hidden stuff
    if(aFakeWindow.style.display!=="block"){
      continue;
    }
    slideUp(aFakeWindow);
  }
}

function insertAtTop(elem, children){
  elem = getElement(elem);
  if(elem.childNodes.length>0){
    insertSiblingNodesBefore(elem.firstChild, children);
  }else{
    appendChildNodes(elem,  children);
  }
}

function moveToTopOfParent(elem){
  insertAtTop(elem.parentNode, elem);
}

displayInline = partial(setDisplayForElement, "inline");

function buildSelect(selectOptions, values, selectedValue){
  //if it is needed, have values have both text and values. selectedValue would go to the value
  var optionFunc;
  if(isNothing(selectedValue)){
    optionFunc = function(item){
      return OPTION({"value": item}, item);
    };
  }else{
    optionFunc = function(item){
      if(item===selectedValue){
        return OPTION({"value": item, "selected": "selected"}, item);
      }else{
        return OPTION({"value": item}, item);
      }
    };
  }
  return SELECT(selectOptions, map(optionFunc, values));
}

function buildFieldTable(fields, tableAttrs){
  var defAttrs = {class: "fieldTable"};
  if(!isNothing(tableAttrs)){
       defAttrs.update(tableAttrs);
  }
  var tbodyElem = TBODY({class: "fieldTableBody"});
  var tableElem = TABLE(defAttrs, tbodyElem);
  for(var fieldKey in fields){
    tbodyElem.appendChild(TR({class: "fieldTableRow"},
                             TD({class: "fieldTableKey"}, fieldKey),
                             TD({class: "fieldTableValue"}, fields[fieldKey])));
  }
  return tableElem;
}
                         
