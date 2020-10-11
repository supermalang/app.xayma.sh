# -*- coding: utf-8 -*-

import json
from odoo.http import Controller, request, route
from odoo.addons.bus.controllers.main import BusController


class BusController(BusController):

    def _poll(self, dbname, channels, last, options):
        if request.session.uid:
            channels.append((request.db, 'pos_sync_session', request.uid))
        return super(BusController, self)._poll(dbname, channels, last, options)

    @route('/pos_sync_session', type="json", auth="public")
    def multi_session_update(self, **args):
        session_id = args['session_id'] if 'session_id' in args else 0
        order = args['order'] if 'order' in args else {}
        res = request.env["pos.sync.session"].browse(int(session_id)).order_operations(order)
        return res
