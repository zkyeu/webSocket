/**
 * Created by liliang on 2017/7/11.
 */
;(function () {
        //var ws = new WebSocket("ws://scsnew.zybang.com//elive?secsign=MoOptEAoxdgp5RcVCi7UAOEYBnw2qLqT9UwLqwF*iabUoarxxaA0ObZbbpZIjzXZJtJbC-MQgdfnNut1soDa2O7ZyiRO9CpglHUy3gCikoqiEzb6rR0laA64*54hZLbSNiDopOToLr9sEnr9ryR7IF3VP69DokuuGytg6zu*9K38mF*jBRxz6KeEeFjoEq*v","push");
        var ws = new WebSocket("'ws://192.168.2.188:8040/yK*mRYRHIGnP11fjX-HH*KmNQvuDXQNA0uH6sY3hoRJEhsz*O--MxsSQjrFGJ-oSURoFxEsHFLm0UodLzVpoMfo1jI4gFAwExtsic8iCpSih0OkiJToaOAxB7tPZ*ZWpiNcqeB*aZRhfgP2qdzK9rQ__", "push");

    ws.onopen = function () {
        ws.send("发送数据");
        alert("数据发送中...");
    }
    ws.onmessage = function (evt)
    {
        var received_msg = evt.data;
        alert("数据已接收...");
    };

    ws.onclose = function()
    {
        // 关闭 websocket
        alert("连接已关闭...");
    };
})();