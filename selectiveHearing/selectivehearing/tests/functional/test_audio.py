from selectivehearing.tests import *

class TestAudioController(TestController):

    def test_index(self):
        response = self.app.get(url(controller='audio', action='index'))
        # Test response...
