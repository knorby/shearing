from selectivehearing.tests import *

class TestFiltersController(TestController):

    def test_index(self):
        response = self.app.get(url(controller='filters', action='index'))
        # Test response...
