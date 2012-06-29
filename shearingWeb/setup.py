try:
    from setuptools import setup, find_packages
except ImportError:
    from ez_setup import use_setuptools
    use_setuptools()
    from setuptools import setup, find_packages

setup(
    name='selectiveHearing',
    version='0.1',
    description='A simple, nagios-centric notification system using zeromq with client-side filtering',
    author='Kali Norby',
    author_email='kali.norby@gmail.com',
    url='',
    install_requires=[
        "Pylons>=0.9.7",
        "pyzmq>=2.0.10"
    ],
    setup_requires=["PasteScript>=1.6.3"],
    packages=find_packages(exclude=['ez_setup']),
    include_package_data=True,
    test_suite='nose.collector',
    package_data={'selectivehearing': ['i18n/*/LC_MESSAGES/*.mo']},
    #message_extractors={'selectivehearing': [
    #        ('**.py', 'python', None),
    #        ('templates/**.mako', 'mako', {'input_encoding': 'utf-8'}),
    #        ('public/**', 'ignore', None)]},
    zip_safe=False,
    paster_plugins=['PasteScript', 'Pylons'],
    entry_points="""
    [paste.app_factory]
    main = selectivehearing.config.middleware:make_app

    [paste.app_install]
    main = pylons.util:PylonsInstaller
    """,
)
