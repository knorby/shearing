import logging

import simplejson

from pylons import request, response, session, tmpl_context as c
from pylons.controllers.util import abort, redirect_to

from selectivehearing.lib.base import BaseController, render

from selectivehearing.model import filters as filtersDB

log = logging.getLogger(__name__)

class FiltersController(BaseController):

    def getUserFilters(self):
        #do some sweet session stuff
        username = request.params.get("username")
        filters = filtersDB.lookupUserFilters(username)
        response.headers['Content-Type'] = 'application/json'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Cache-Control'] = 'no-cache, no-store, max-age=1, must-revalidate'
        if filters is None:
            #the default for no filters is to alert on everything
            return simplejson.dumps({"username": username,
                                     "filters": [[".*", ".*", True, True, "Default"]]})
        return filters

    def saveUserFilters(self):
        response.headers['Content-Type'] = 'application/json'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Cache-Control'] = 'no-cache, no-store, max-age=1, must-revalidate'
        filters = request.environ['wsgi.input'].read(int(request.environ['CONTENT_LENGTH']))
        if filters:
            filtersDB.saveUserFilters(filters)
        else:
            return '{"result": false}'
        return '{"result": true}'
