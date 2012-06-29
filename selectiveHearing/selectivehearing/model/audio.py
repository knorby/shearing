import simplejson

from pylons import config

#should make this, you know, work

AUDIO_DB = config["selectivehearing.audio_db"]
#not a real model. Just return the damn json string.
def getAudioFiles():
    return open(AUDIO_DB).read()

def addAudioFile(name, fn):
    #should probably add locking
    db = simplejson.load(open(AUDIO_DB))
    #TODO: validation...
    db[name] = fn
    f = open(AUDIO_DB, "w")
    simplejson.dump(db, f)
    f.close()
    return True

#delete, what?


