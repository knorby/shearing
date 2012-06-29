import os

import simplejson

from pylons import config


FILTER_DIR = config["selectivehearing.filter_dir"]

#just dump the JSON string here
def lookupUserFilters(username):
    fn = os.path.join(FILTER_DIR, username)
    if not os.path.exists(fn):
        return None
    return open(fn).read()

def saveUserFilters(jsonStr):
    #TODO: validate
    filterObj = simplejson.loads(jsonStr)
    username = filterObj["username"]
    fn = os.path.join(FILTER_DIR, username)
    fd = open(fn, "w")
    fd.write(jsonStr)
    fd.close()

    
