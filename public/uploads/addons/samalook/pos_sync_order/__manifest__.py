# -*- coding: utf-8 -*-

{
    'name': 'POS Order Sync',
    'version': '1.0',
    'category': 'Point of Sale',
    'sequence': 6,
    'author': 'Webveer',
    'summary': 'We can easily sync orders to different sessions.',
    'description': """

=======================

""",
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
        'views/templates.xml'
    ],
    'qweb': [
        'static/src/xml/pos.xml',
    ],
    'images': [
        'static/description/auto.jpg',
    ],
    'installable': True,
    'website': '',
    'auto_install': False,
    'price': 100,
    'currency': 'EUR',
}
