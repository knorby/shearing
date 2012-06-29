//these should be based on nagios levels
lvls = {
  "OK": 0,
  "WARNING": 1,
  "CRITICAL": 2,
  "UNKNOWN": 3,
};

function chooseLvlImage(lvl){
  switch(lvl){
  case lvls.OK:
    return "/static/imgs/green.png";
  case lvls.CRITICAL:
    return "/static/imgs/red.png";
  case lvls.WARNING:
    return "/static/imgs/yellow.png";
  case lvls.UNKNOWN:
    return "/static/imgs/purple.png";
  default:
    return "/static/imgs/white.png";
  }
}

function chooseLvlColor(lvl){
  switch(lvl){
  case lvls.OK:
    //return "#00FF00";
    return "#00A800";
  case lvls.CRITICAL:
    //return "#FF0000";
    return "#A80000";
  case lvls.WARNING:
    return "#A8A800";
  case lvls.UNKNOWN:
    return "#A800A8";
  default:
    return "#A8A8A8";
  }
}
