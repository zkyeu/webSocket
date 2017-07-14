/**
 * Copyright (c) 2014-2017 Zuoyebang, All rights reseved.
 * @fileoverview 即时通讯工具
 * @author WangWenshu | wangwenshu@zybang.com
 * @version 1.0 | 2017-04-11 | WangWenshu    // 初始版本。
 * @version 1.1 | 2017-04-20 | WangWenshu    // 修复 ajax 拉取消息为空时，不再继续轮询消息的问题；
 *                                           // 优化长连接建立失败后的重连机制。
 * @version 1.2 | 2017-05-25 | WangWenshu    // 优化长连接重连逻辑，减少意外发送消息的可能；
 *                                           // 解决 Worker 脚本跨域加载的问题。
 * @version 1.3 | 2017-05-27 | WangWenshu    // 修改短连接接口返回数据形式。
 * @version 1.4 | 2017-06-10 | WangWenshu    // 长连接增加 30s 内 5 次失败则停止重连的逻辑，避免大量重试请求产生。
 *
 * @method constructor(args)        // 构造函数：构造 LiveMsger 对象。
 *   @param args {Object}           // 参数：构造函数参数(可选)。
 *     productType {String}         // 参数：适用的即时通讯产品类型(可选，取值范围：'fudao'、'im'，默认：'fudao')。
 *     uid {String}                 // 参数：用户 uid(可选，默认为空)。
 *     extraArgsForSign {Object}    // 参数：获取连接签名时所需的额外参数(可选，默认无)。
 *     onConnectFail {Function}     // 参数：连接失败回调(可选，默认无；调用时无传参)。
 *     onMsg {Function}             // 参数：消息到达回调(可选，默认无；调用时传入消息列表)。
 *   @return {Object}               // 返回：LiveMsger 对象。
 *
 * @method connect()      // 方法：启动消息连接。
 *   @param No            // 参数：无。
 *   @return {Object}     // 返回：LiveMsger 对象本身(可用于链式调用)。
 *
 * @method disconnect()    // 方法：断开消息连接。
 *   @param No             // 参数：无。
 *   @return {Object}      // 返回：LiveMsger 对象本身(可用于链式调用)。
 *
 * @description    // 附加说明。
 *   1) 本工具通过长连接及补充的 ajax 轮询方式完成即时通讯，目前适用于直播聊天(fudao)及班级群、粉丝群聊天(im)等即时通讯产品。
 *   2) 工作流程：
 *      · 启动建立长连接，每三次尝试，前两次使用 'wss' 协议，第三次使用 'ws' 协议(HTTPS 下不使用)；每次都需要获取连接签名(connSign)。
 *      · 长连接三次建立失败，则启用 ajax 周期性轮询拉取消息(使用此前最后一次获取到的连接签名)；同时间隔指定的时间尝试重新建立长连接，遵循前述流程。
 *      · 如果连接签名(connSign)过期，则遵循前述流程重新开始尝试建立长连接。
 *      · 如果长连接断开在 30s 内达到或超过 5 次，则停止尝试建立长连接并启用 ajax 轮询。
 *   3) onConnectFail() 回调用于通知连接失败的情况，包含获取签名失败或拉取消息失败；
 *      通常提示用户刷新浏览器即可；多次尝试依然失败建议联系技术人员。
 *   4) 程序需要缓存一些配置信息等，通过不同的 productType 及 uid 区分；
 *      所以持相同 productType 和 uid 的 LiveMsger 实例会覆盖彼此的这些配置信息，特别要注意当 uid 为空时的情况。
 *
 * @example    // 典型的调用示例。
 var LiveMsger = require('fudao:widget/liveMsger/liveMsger.js');

 new LiveMsger({
      extraArgsForSign: {
        role: 2,    // 获取长连接 tlssign 的角色，0：老师，1：辅导员，2：学生，3:旁听生
        courseid: courseId,
        lessonid: lessonId,
        classid: classId,
        scs_version: 1
      },
      onConnectFail: function() {
        Dialog.alert({
          icon: 'WARNING',
          mainMsg: '消息通道连接失败',
          subMsg: '你将无法参与聊天、答题等课堂互动，请检查你的网络并刷新页面重试。\n多次重试失败请联系辅导老师。'
        });
      },
      onMsg: function(msgs) {
        $.each(msgs, function(i, msg) {
          ...
        });
      }
    }).connect();
 */

// var safeCall = require('common:widget/util/safeCall.js');

var allLiveMsgers = [],
    URL = window.URL || window.webkitURL;

function pullMsg() {
    if (!LiveMsger.isMsgPushAvailable || this.connConfig.socketFailures) {
        // 长连接不可用，使用 ajax 拉取方案。
        var self = this;
        this.connConfig.scsUrl && $.ajax(this.connConfig.scsUrl, {
            dataType: 'json',
            data: {
                secsign: this.connConfig.connSign,
                cur_ver_id: this.msgVer
            },
            success: function (response) {
                if (response) {    // Note: Distinct from normal ajax API, this response has no 'errNo', 'errStr' or 'data' wrapper.
                    onMsgReturn.call(self, response);
                } else {
                    // safeCall(self.onConnectFail, null, self);
                }
            },
            error: function () {
                //safeCall(self.onConnectFail, null, self);
            }
        });
    } else {
        this.socketWorker.postMessage({
            cmd: 'send',
            msg: {
                sig_no: 50002,
                data: {
                    cur_ver_id: this.msgVer
                }
            }
        });
    }
}

function onMsgReturn(msg) {
    msg = msg || {};
    msg.msg_list = [].concat(msg.msg_list || []);

    if (msg.msg_list.length && this.msgVer == msg.msg_list[0].pre_ver_id) {
        this.msgVer = msg.msg_list.slice(-1)[0].cur_ver_id;
        //接受消息处理
        this.onMsg.apply(this,[msg.msg_list]!==undefined?[].concat([msg.msg_list]):[]);
        //safeCall(this.onMsg, [msg.msg_list], this);
    }

    if (new Date() > this.connConfig.signAvailableTime) {    // 连接签名过期。
        clearTimeout(this.msgPullingTimer);
        clearTimeout(this.reconnectTimer);
        connect.call(this);
    } else if (msg.has_more) {    // 仍有更多消息需要继续拉取。
        pullMsg.call(this);
    } else if (!LiveMsger.isMsgPushAvailable || this.connConfig.socketFailures) {
        clearTimeout(this.msgPullingTimer);
        this.msgPullingTimer = setTimeout(pullMsg.bind(this), this.connConfig.scsInterval, this);
    }
}

function connect() {
    var self = this;
    // $.ajax('http://test48.zuoyebang.cc/im/basic/longconnsign', {
    $.ajax('http://test48.zuoyebang.cc/fdsaleteam/basic/longconnsign', {
    // $.ajax('http://test48.zuoyebang.cc/fdsaleteam/basic/longconnsign?product=im', {
        dataType: 'json',
        data: $.extend({
            // product: this.productType,    // 产品类型。
            product : 'im',
            protoVersion: 1               // 支持的协议类型(1：仅支持 wss/ws；2：支持 nsock)。
        }, this.extraArgsForSign ? {
            extra: JSON.stringify(this.extraArgsForSign)
        } : null),
        success: function (response) {
            //console.log('142:执行ajax请求');
            var responseData = response.data;
            //console.log(responseData);
            if (response && !response.errNo && (responseData.wssHost || responseData.wsHost || responseData.scsUrl)) {//当前IP
                $.extend(self.connConfig, responseData);
                //console.log(147)
                //console.log($.extend(self.connConfig, responseData))
                //console.log(149)
                //console.log(LiveMsger.isMsgPushAvailable)
                if (LiveMsger.isMsgPushAvailable) {
                    // 每三次重连，前两次使用 'wss' 协议，第三次使用 'ws' 协议。
                    //console.log(self)
                    self.connConfig.socketProtocol = (/^https/i.test(location.protocal) || (self.connConfig.socketFailures + 1) % 3) ? 'wss' : 'ws';

                    self.socketWorker && self.socketWorker.postMessage({
                        cmd: 'open',
                         // url: "ws://scsnew.zybang.com/elive?secsign=MoOptEAoxdgp5RcVCi7UAOEYBnw2qLqT9UwLqwF*iabUoarxxaA0ObZbbpZIjzXZJtJbC-MQgdfnNut1soDa2O7ZyiRO9CpglHUy3gCikoqiEzb6rR0laA64*54hZLbSNiDopOToLr9sEnr9ryR7IF3VP69DokuuGytg6zu*9K38mF*jBRxz6KeEeFjoEq*v",


                        // url: " wss://192.168.2.188:8041/elive?secsign=yK*mRYRHIGnP11fjX-HH*I-LdV6zYOOuxEH1DYZkD0GDpl7Nd8ZMBMfUyMCMxPJXqGeDgcYO5w2LP6XY6eIaBET0IGUCSROddowxcqPy3hlQBgEXMvxurbVGb3JfYaTh*5V4MX9AqeajVR0rvBjGoSrYmKX5dhOQitVIgYm1BCFxABv6tBmGRJC*T75TmBWVsjRJAbfAbFP57v58UD-yEtQrhHMGGdn0P1jwtsBRb6M_",
                        // url: "ws://test48.zuoyebang.cc:8040//elive?secsign=yK*mRYRHIGnP11fjX-HH*I-LdV6zYOOuxEH1DYZkD0GDpl7Nd8ZMBMfUyMCMxPJXqGeDgcYO5w2LP6XY6eIaBET0IGUCSROddowxcqPy3hlQBgEXMvxurbVGb3JfYaTh*5V4MX9AqeajVR0rvBjGoSrYmKX5dhOQitVIgYm1BCHMfO5ybG*uAoRHQB5WuAJC86QEZXvcjD8HWuKBIrsEHNZxe-J0hnJgwKBmYGpQ8WI_",
                    url: [
                            self.connConfig.socketProtocol,
                            '://',
                            self.connConfig[self.connConfig.socketProtocol + 'Host'], ':',
                            self.connConfig[self.connConfig.socketProtocol + 'Port'],
                            '/elive?secsign=', self.connConfig.connSign
                        ].join(''),

                        pingInterval: self.connConfig.pingInterval
                    });
                } else {
                    pullMsg.call(self);
                }
            } else {
                //safeCall(self.onConnectFail, null, self);
            }
        },
        error: function () {
            //safeCall(self.onConnectFail, null, self);

        }
    });
}

// connect();
//https://yy-s.zuoyebang.cc/static/common/css/base_e5d1a77.css

function initSocketWorker() {
    var self = this;

    return new Promise(function (resolve, reject) {
        // 跨域加载 Worker 脚本。
        $.ajax('http://test48.zuoyebang.cc/static/fudao/base/socketWorker.js', {
        // $.ajax('js/socketWorker.js', {
            xhrFields: {
                withCredentials: true
            },
            async:false,
            success: function (response) {
                self.socketWorker = new Worker(URL.createObjectURL(new Blob([response])));
                self.socketWorker.onmessage = function (e) {
                    switch (e.data.cmd) {
                        case 'onOpen':
                            self.connConfig.socketFailures = 0;
                            clearTimeout(self.msgPullingTimer);
                            break;

                        case 'onMsg':
                            var msg = e.data.msg;
                            switch (msg.sig_no) {
                                case 50001:    // 通知拉取消息。
                                    pullMsg.call(self);
                                    break;

                                case 50003:    // 拉取的消息到达。
                                    onMsgReturn.call(self, msg.data);
                                    break;

                                default:
                            }
                            break;

                        case 'onClose':
                        case 'onError':
                            clearTimeout(self.reconnectTimer);

                            self.connConfig.socketFailureTicks.push(new Date());
                            self.connConfig.socketFailureTicks.shift();

                            if (self.connConfig.socketFailureTicks[4] - self.connConfig.socketFailureTicks[0] < 30 * 1000) {    // 30s 内失败 5 次及以上。
                                LiveMsger.isMsgPushAvailable = false;
                                pullMsg.call(self);
                            } else if (++self.connConfig.socketFailures % 3 == 0) {    // 每 3 次重连失败，启用一次 ajax 轮询并继续尝试建立长连接。
                                pullMsg.call(self);

                                self.reconnectTimer = setTimeout(function () {
                                    connect.call(self);
                                }, self.connConfig.checkInterval);
                            } else {
                                connect.call(self);
                            }
                            break;

                        default:
                    }
                };

                resolve();
            },
            error: function () {
                reject();
            }
        });
    });
}

// Events.
$(window).on('beforeunload', function () {
    $.each(allLiveMsgers, function (i, liveMsger) {
        liveMsger.disconnect();
    });
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// LiveMsger.
function LiveMsger(args) {
    this.productType = /^fudao|im$/i.test(args.productType) ? RegExp.$_ : 'fudao';
    this.uid = (args.uid || '') + '';
    this.msgVerStorageKey = 'liveMsger_msgVer_' + this.productType + (this.uid ? ('_' + this.uid) : '');

    this.onConnectFail = $.isFunction(args.onConnectFail) ? args.onConnectFail : null;
    this.onMsg = $.isFunction(args.onMsg) ? args.onMsg : null;
    this.extraArgsForSign = args.extraArgsForSign || null;                       // 获取连接签名的额外参数。

    this.msgVer = parseInt(localStorage.getItem(this.msgVerStorageKey)) || 0;    // 消息流水版本号。
    this.connConfig = {                                                          // 长连接配置。
        socketFailures: 0,                      // 长连接失败次数。
        socketFailureTicks: [0, 0, 0, 0, 0],    // 长连接最近5次失败时刻。
        socketProtocol: 'wss',                  // 长连接协议。
        pingInterval: 3000,                     // 长连接 ping 间隔时长。
        checkInterval: 5 * 1000,                // 长连接重连间隔时长。
        scsInterval: 10 * 1000                  // 短连接拉取数据周期。
    }

    allLiveMsgers.push(this);
}

LiveMsger.isMsgPushAvailable = $.isFunction(window.Worker)
    && $.isFunction(window.WebSocket)
    && $.isFunction(URL)
    && $.isFunction(Promise);

LiveMsger.prototype = {
    constructor: LiveMsger,
    connect: function () {
        //console.log('289:执行connect')
        clearTimeout(this.reconnectTimer);

        var self = this;
        if (LiveMsger.isMsgPushAvailable && !this.socketWorker) {
            initSocketWorker.call(this)
                .then(function () {
                    connect.call(self);
                })
                .catch(function () {
                    //safeCall(self.onConnectFail, null, self);
                });
        } else {
            connect.call(this);
        }

        return this;
    },
    disconnect: function () {
        clearTimeout(this.msgPullingTimer);
        clearTimeout(this.reconnectTimer);

        if (LiveMsger.isMsgPushAvailable && this.socketWorker) {
            this.socketWorker.postMessage({
                cmd: 'close'
            });
            this.socketWorker.terminate();
            this.socketWorker = null;
        }

        localStorage.setItem(this.msgVerStorageKey, this.msgVer);

        return this;
    }
};

//exports = module.exports = LiveMsger;