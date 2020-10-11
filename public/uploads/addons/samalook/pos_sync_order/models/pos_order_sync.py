# -*- coding: utf-8 -*-

from odoo import fields, models,tools,api
import json

class pos_config(models.Model):
    _inherit = 'pos.config' 

    wv_session_id = fields.Many2one("pos.sync.session","Sync Session")
    allow_incoming_orders = fields.Boolean('Allow Incoming order', default=True)
    session_short_name = fields.Char("Session Nickname",default="POS")
    allow_auto_sync = fields.Boolean("Allow Auto Sync",default=True, help="If you don't allow auto Sync The Sync button will display to sync the order.")

class pos_sync_session(models.Model):
    _name = "pos.sync.session"

    name = fields.Char("Session Name")
    pos_config_id = fields.One2many("pos.config","wv_session_id")
    order_ids = fields.One2many('pos.sync.order', 'sync_session_id')


    @api.multi
    def order_operations(self, order):
        self.ensure_one()
        if order['action'] == 'update_order':
            order_data = order['order']
            pos_order = self.env['pos.sync.order'].search([('order_ref', '=',order_data['uid'])])
            if pos_order:
                pos_order.write({'pos_order': json.dumps(order)})
            else:
                pos_order.create({'pos_order': json.dumps(order),'sync_session_id': self.id,'order_ref': order_data['uid']})
            self.sync_order(order)
            return True
        elif order['action'] == 'remove_order':
            if order.has_key('order'):
                order_uid = order['order']
                wv_order = self.order_ids.search([('order_ref', '=', order_uid)])
                wv_order.unlink()
                self.sync_order(order)
            return True
        elif order['action'] == 'sync_all_orders':
            pos_config_id = order['order']
            pos = self.env['pos.config'].search([('wv_session_id', '=', self.id), ("id", "=", pos_config_id)])
            messages = []
            for order in self.order_ids:
                orderval = json.loads(order.pos_order)
                orderval['action'] = 'sync_all_orders'
                messages.append(orderval)
            return {'action':'sync_all_orders','order':messages}

    @api.multi
    def sync_order(self, order):
        self.ensure_one()
        notifications = []
        for pos_session in self.env['pos.session'].search([('state', '!=', 'closed'), ('config_id.wv_session_id', '=', self.id)]):
            if pos_session.user_id.id != self.env.user.id:
                notifications.append([(self._cr.dbname, "pos_sync_session", pos_session.user_id.id), order])
        self.env['bus.bus'].sendmany(notifications)
        return 1

class pos_sync_order(models.Model):
    _name = "pos.sync.order"

    pos_order = fields.Text('Order')
    order_ref = fields.Char()
    sync_session_id = fields.Many2one('pos.sync.session', 'Sync session')





