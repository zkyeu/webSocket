;(function (root) {
    root.wxChat = root.wxChat || {}

    //封装ajax
    wxChat.getData = function (options) {
        var defaults = {
                timeout: 10000,
                type: "post",
                dataType: "json",
                error: function () {
                    alert("网络错误请重试！");
                }
            },
            settings = $.extend({}, defaults, options);
        $.ajax(settings);
    }

    //主要数据源
    wxChat.dataSource = {
        chatMsg:[],
        memberCount: 0
    }

    //数据渲染
    wxChat.wxInit = new Vue({
        el: '#app',
        data: {
            wxData: wxChat.dataSource,
            test: wxChat.dataSource.memberCount,
            curMsg: [],
            curUser : 2135349210
        },
        methods: {
            sendMsg: function () {

                var that = this;
                if (!that.curMsg) return alert('请输入内容！');
                if( !that.curUser) return alert('请输入对方ID！');
                wxChat.getData({
                    url: '/fdsaleteam/basic/sendmessage',
                    data: {
                        toUid: 2135349210,
                        msgContent: that.curMsg
                    },
                    success: function (data) {
                        if (data.errNo != 0) return alert(data.errstr);
                        that.curMsg = '';
                    },
                    error: function () {
                        console.log('connect failer');
                    }
                })
            }
        },
        events: {
            setMsgData : function () {
                console.log("设置数据")
            }
        },
        created : function () {
            new LiveMsger({
                uid: this.curUser,
                extraArgsForSign: {
                    role: 2,    // 获取长连接 tlssign 的角色，0：老师，1：辅导员，2：学生，3:旁听生
                    courseid: 123,
                    lessonid: 123,
                    classid: 123,
                    scs_version: 1    // 版本标识，此版本起支持信令 33999.
                },
                onConnectFail: function() {
                    //连接失败时的逻辑
                    console.log("连接失败")
                },
                onMsg: function(msgs) {
                    $.each(msgs, function(i, msg) {
                        //连接成功，消息处理逻辑
                        // this.curMsg.push(msg);
                        wxChat.dataSource.chatMsg.push(msg)
                        console.log(msg)
                    });
                }
            }).connect();
        }

    });

    // ;
    // (function () {
    //     //验证是否支持socket
    //     wxChat.ws = (function () {
    //         return root.WebSocket;
    //     })();
    //
    //     if (!wxChat.ws) return console.log('browser not support!');
    //     //else console.log('ok')
    //
    //     //发送消息
    //     wxChat.sendMsg = function () {
    //
    //     }
    //
    //     //处理socket接收消息
    //     wxChat.msgHandler = new function () {
    //         let that = this;
    //         //获取好友列表
    //         that.group_user_list = function (data) {
    //             console.log(data);
    //         }
    //
    //         //获取消息
    //         that.chat = function () {
    //             //是否是老师发出？
    //             let isTeacher;
    //             //塞入消息归类
    //             let pushID;
    //         }
    //
    //     }
    //
    //     //连接websocket
    //     // ;(function () {
    //     //
    //     //     wxChat.args = arguments;
    //     //     // wxChat.wxHost = 'ws://192.168.2.188:8041/yK*mRYRHIGnP11fjX-HH*KmNQvuDXQNA0uH6sY3hoRJEhsz*O--MxsSQjrFGJ-oSURoFxEsHFLm0UodLzVpoMfgo3-OT-OlyGeeAze3csls9W8*bYLcX*drUo06jOkIeIDdJ0BEhWAufs5QT5po66g__';
    //     //     wxChat.wxHost = '';
    //     //     // 获取socket地址
    //     //     wxChat.getData({
    //     //         url: '/fdsaleteam/basic/longconnsign?product=im',
    //     //         async : false,
    //     //         success: function (data) {
    //     //             if(data.errNo != 0) return alert(data.errstr);
    //     //             wxChat.wxHost ='ws://' + data.data.wsHost + ':'+ data.data.wsPort + '/elive?secsign=' +data.data.connSign
    //     //         }
    //     //     });
    //     //     console.log('Socket地址：' + wxChat.wxHost);
    //     //
    //     //     if (!wxChat.wxHost) {
    //     //         console.log('连接失败，请刷新重试！')
    //     //         return;
    //     //     }
    //     //
    //     //     //连接
    //     //     // wxChat.socket = new wxChat.ws(wxChat.wxHost);
    //     //     wxChat.socket  = new WebSocket(wxChat.wxHost,'push');
    //     //
    //     //     //连接成功
    //     //     wxChat.socket.onopen = function (e) {
    //     //         console.log('WebSocket连接成功！');
    //     //
    //     //     }
    //     //
    //     //     //连接关闭
    //     //     wxChat.socket.onclose = function (e) {
    //     //         console.log('WebSocket连接关闭！');
    //     //     }
    //     //
    //     //     //连接出错
    //     //     wxChat.socket.onerror = function (e) {
    //     //         console.log('WebSocket连接出错！');
    //     //     }
    //     //
    //     //     //收发消息
    //     //     wxChat.socket.onmessage = function (e) {
    //     //         console.log(e);
    //     //         let data = JSON.parse(e.data);
    //     //         console.log(data)
    //     //
    //     //     }
    //     //
    //     // })();
    //
    // })();


})(window);

$(function () {
    $('.message-block').niceScroll({
        cursorcolor: "#424242",
        cursoropacitymin: 0,
        cursoropacitymax: .6,
        autohidemode: true,
        railpadding: {top: 10, right: 0, left: 0, bottom: 10},
        hidecursordelay: 330
    });
    var lastMsg = $('.message-block')[0];
    if (!lastMsg) return;
    $('.message-block').scrollTop(lastMsg.scrollHeight);
})