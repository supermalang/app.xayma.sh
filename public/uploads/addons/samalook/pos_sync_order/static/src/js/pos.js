odoo.define('pos_sync_order', function(require){
    var exports = {};
    var chrome = require('point_of_sale.chrome');
    var session = require('web.session');
    var Backbone = window.Backbone;
    var core = require('web.core');
    var session = require('web.session');
    var screens = require('point_of_sale.screens');
    var models = require('point_of_sale.models');
    var bus = require('bus.bus');
    var _t = core._t;

    screens.OrderWidget.include({
        rerender_orderline: function(order_line){
            if (order_line.node) {return this._super(order_line);}
        },
        remove_orderline: function(order_line){
            if(order_line.node){
                if (order_line.node.parentNode) {
                    return this._super(order_line);
                }
            }
            if(this.pos.get('selectedOrder').get('orderLines')) {
                if(this.pos.get('selectedOrder').get('orderLines').length ==0){return this._super(order_line);}
            }
        }
    });
    chrome.Chrome.include({
        build_widgets:function() {
            var self = this;
            this._super();
            $(".sync_order").click(function(){             
                self.pos.sync_session.send({'action':'update_order','order':self.pos.get('selectedOrder').export_as_JSON()});
            });
        },
    });
    var PosModelSuper = models.PosModel;
    models.PosModel = models.PosModel.extend({
        initialize: function(){
            var self = this;
            this.pos_session = null;
            this.pos_kitchen_data = [];
            PosModelSuper.prototype.initialize.apply(this, arguments);
            this.get('orders').bind('remove', function(order, collection, options){
                if(self.sync_session && self.sync_session.allow_remove_sync && self.config.wv_session_id){
                    self.sync_session.send({'action':'remove_order','order':order.uid});
                }
            });
        },
        update_the_order: function(sync_order){
            var self = this;
            if(!self.config.allow_incoming_orders)
                return;
            var order = this.get('orders').find(function(ord){
                return ord.uid == sync_order.uid;
            });
            if (!order){
                var sequence_number = sync_order.sequence_number;
                if (sequence_number == self.pos_session.sequence_number){
                } else if (sequence_number > self.pos_session.sequence_number){
                self.pos_session.sequence_number = sequence_number;
                }
                order = new models.Order({},{pos:this});
                order.uid = sync_order.uid;
                var current_order = self.get_order();
                self.get('orders').add(order);
                self.set('selectedOrder', current_order);
            }
            order.order_priority = sync_order.order_priority;
            order.sequence_number = sync_order.sequence_number;
            order.session_short_name = sync_order.session_short_name;
            order.wait_customer = false;
            if(order.partner_id != false){
                var cust = order.pos.db.get_partner_by_id(sync_order.partner_id);
                if(!cust){
                    order.set_client(null);
                }
                order.set_client(cust);
            }
            else{
                order.set_client(null);
            }
            var not_found = order.orderlines.map(function(r){
                return r.uid;
            });
            var order_lines = sync_order.lines;
            var old_order_line = order.orderlines
            
            while(order.get_last_orderline())
            {
                order.orderlines.remove(order.get_last_orderline());
            }
            if(order_lines){
                for(var i=0;i<order_lines.length;i++){
                    var order_line_data = order_lines[i][2];
                    var product = self.db.get_product_by_id(order_line_data.product_id);
                    // if (!line){
                        var line = new models.Orderline({}, {pos: self, order: order, product: product,token_var:false});
                    // }
                    line.token_var = false;
                    line.created_by_name = order_line_data.created_by_name;
                    line.session_short_name = order_line_data.session_short_name;
                    line.order_line_status = order_line_data.order_line_status;
                    if(order_line_data.qty !== undefined){
                        line.set_quantity(order_line_data.qty);
                    }
                    if(order_line_data.price_unit !== undefined){
                        line.set_unit_price(order_line_data.price_unit);
                    }
                    if(order_line_data.discount !== undefined){
                        line.set_discount(order_line_data.discount);
                    }
                    order.orderlines.add(line);
                    line.token_var = true;
                } 
            }
            return order;
        },
        load_server_data: function () {
            res = PosModelSuper.prototype.load_server_data.apply(this);
            var self = this;
            return res.then(function () {
                if (self.config.wv_session_id) {
                    self.sync_session = new exports.SyncSession(self);
                    self.sync_session.start();
                    self.sync_session.send({'action':'sync_all_orders','order':self.config.id});
                }
            });
        },
    });
    var test_varialbe = true;
    var OrderlineSuper = models.Orderline;
    models.Orderline = models.Orderline.extend({
        initialize: function(){
            var self = this;
            self.token_var = true;
            self.wait_token = true;
            OrderlineSuper.prototype.initialize.apply(this, arguments);
            var user = this.pos.cashier || this.pos.user;
            created_by_name = user.name;
            self.created_by_name = created_by_name;
            self.session_short_name =this.pos.config.session_short_name||'';
            self.order_line_status = 0;
            self.wvnote = this.wvnote || "";
            this.bind('change', function(line){
                if(self.token_var && test_varialbe){
                    if(this.pos.sync_session && this.pos.config.wv_session_id && this.pos.config.allow_auto_sync){
                        test_varialbe =false;
                        var order = self.order
                        self.wait_token =false;
                        if(order){
                            self.pos.sync_session.send({'action':'update_order','order':self.order.export_as_JSON()});
                            setTimeout(function(){ 
                               test_varialbe =true;
                            }, 120);
                        }
                    }
                }     
            });    
        },
         wvset_note: function(wvnote){
                this.wvnote = wvnote;
                this.trigger('change',this);
        },
        wvget_note: function(note){
            return this.wvnote;
        },
        export_as_JSON: function(){
            var data = OrderlineSuper.prototype.export_as_JSON.apply(this, arguments);
            data.wvnote = this.wvnote;
            data.order_line_status = this.order_line_status;
            data.created_by_name = this.created_by_name;
            data.session_short_name = this.session_short_name;
            return data;
        }
    });
    var token_remove = true;
    var OrderSuper = models.Order;
    models.Order = models.Order.extend({
        initialize: function(attributes, options){
            var self = this;
            options = options || {};
            OrderSuper.prototype.initialize.apply(this, arguments);
            this.session_short_name = this.pos.config.session_short_name || '';
            this.wait_customer = true;
            this.wait_temp = true;
            this.order_priority = this.order_priority || 0;
        },
        remove_orderline: function(line){
            OrderSuper.prototype.remove_orderline.apply(this, arguments);
            var self = this;
            if(this.pos.sync_session && this.pos.config.wv_session_id && this.pos.config.allow_auto_sync){
                if(token_remove){
                    token_remove = false;
                    setTimeout(function(){ 
                        self.pos.sync_session.send({'action':'update_order','order':self.export_as_JSON()});
                        token_remove = true;
                    }, 1100);
                }
            }
        },
        set_client: function(client){
            var self = this;
            OrderSuper.prototype.set_client.apply(this,arguments);
            if(this.pos.sync_session && this.pos.config.wv_session_id && this.wait_customer && this.wait_temp && this.pos.config.allow_auto_sync){
                this.wait_temp = false;
                setTimeout(function(){ 
                    self.pos.sync_session.send({'action':'update_order','order':self.export_as_JSON()});
                    this.wait_temp = true;
                }, 1500);
            }
            else{
                self.wait_customer =true;
            }
        },
        add_product: function(){
            var self = this;
            OrderSuper.prototype.add_product.apply(this, arguments);
            // this.get_last_orderline().token_var=false;
            // setTimeout(function(){self.get_last_orderline().token_var=true;}, 1300);
        },
        export_as_JSON: function(){
            var data = OrderSuper.prototype.export_as_JSON.apply(this, arguments);
            var nick_name = ""
            if(this.session_short_name){
                nick_name = this.session_short_name;
            }
            else{
                nick_name = this.pos.config.session_short_name;
            }
            data.session_short_name = nick_name;
            data.order_priority = this.order_priority;
            return data;
        },
    });
    exports.SyncSession = Backbone.Model.extend({
        initialize: function(pos){
            this.pos = pos;
        },
        start: function(){
            var self = this;
            this.allow_remove_sync = false;
            this.bus = bus.bus;
            this.bus.last = this.pos.db.load('bus_last', 0);
            this.bus.on("notification", this, this.bus_notification);
            this.bus.start_polling();
        },
        send: function(order){
            var self = this;
            session.rpc("/pos_sync_session/", {
                    session_id: self.pos.config.wv_session_id[0],
                    order: order,
                    pos_config_id:self.pos.config.id,
                }).done(function(results){
                    if(typeof results === "object"){
                        if(results['action']=='sync_all_orders'){
                            if(results['order'].length >0){
                                _.each(results['order'], function(res){
                                    self.pos.update_the_order(res['order']);
                                });
                                var uid_list = [];
                                for(var i=0;i<results['order'].length;i++){
                                    uid_list.push(results['order'][i]['order'].uid);
                                }
                                if(uid_list.length > 0){
                                    var list_orders = self.pos.get('orders');
                                    _.each(list_orders.models, function(wvorder){
                                        if(wvorder != undefined){
                                            if(uid_list.indexOf(wvorder.uid)<0){
                                               wvorder.destroy({'reason': 'abandon'}); 
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                    self.allow_remove_sync = true;
            }).fail(function (error, e) {
                e.preventDefault();
                console.log("Please Check your Internet Connection.")
            });
        },
        bus_notification: function(bus_messages) {
            if(bus_messages.length > 0){
                var bus_message = bus_messages[0]
                if(bus_message[0][1] === "pos_sync_session"){
                    if(bus_message[1]['action']=="update_order"){
                        this.pos.update_the_order(bus_message[1]['order']);
                    }
                    else if(bus_message[1]['action']=="remove_order"){
                        var order = this.pos.get('orders').find(function (order) {
                            return order.uid == bus_message[1]['order'];
                        });
                        if(order){
                            order.destroy({'reason': 'abandon'});
                             this.pos.chrome.gui.show_screen(this.pos.chrome.gui.get_current_screen(),{},'refresh');
                        }
                    }
                }
            }
        },
    });
    return exports;
});
