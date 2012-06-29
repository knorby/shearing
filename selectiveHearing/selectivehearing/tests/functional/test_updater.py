from selectivehearing.tests import *

class TestUpdaterController(TestController):

    def test_index(self):
        response = self.app.get(url(controller='updater', action='index'))
        # Test response...
