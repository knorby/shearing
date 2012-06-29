import logging
import shutil
import os

import simplejson

from pylons import request, response, session, tmpl_context as c
from pylons.controllers.util import abort, redirect_to
from pylons import config

from selectivehearing.lib.base import BaseController, render
from selectivehearing.model import audio as audioDB

log = logging.getLogger(__name__)

#change this!
perm_store = config["selectivehearing.audio_upload_dir"]

class AudioController(BaseController):

    def upload(self):
        response.headers['Content-Type'] = 'application/json'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Cache-Control'] = 'no-cache, no-store, max-age=1, must-revalidate'
        try:
            name = request.params.get("soundName")
            audioFile = request.params.get('qqfile')
            #should check to see if the filename already exists, and something special if it is,
            # or make a dir of the soundName or something
            fn = os.path.join(perm_store, audioFile)
            permFile = open(fn, "w")
            permFile.write(request.environ['wsgi.input'].read(int(request.environ['CONTENT_LENGTH'])))
            permFile.close()
            location = "/audioFiles/%s" % audioFile
            audioDB.addAudioFile(name, location)
            return simplejson.dumps({"success": True, "soundId": name, "location": location})
        except:
            return simplejson.dumps({"success": False})

    def getAvailableFiles(self):
        response.headers['Content-Type'] = 'application/json'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Cache-Control'] = 'no-cache, no-store, max-age=1, must-revalidate'
        return audioDB.getAudioFiles()

    def getAvailableFilesAsScript(self):
        response.headers['Content-Type'] = 'application/javascript'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Cache-Control'] = 'no-cache, no-store, max-age=1, must-revalidate'
        return "var availableAudio = %s;" % audioDB.getAudioFiles()
        
