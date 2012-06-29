from pylons import config
from paste.fileapp import DirectoryApp

class AudiofilesController(object):
    
    def audioFiles(self, environ, start_response):
        app = DirectoryApp(config["selectivehearing.audio_upload_dir"])
        return app(environ, start_response)

    __call__ = audioFiles
