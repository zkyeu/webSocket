/**
 * Copyright (c) 2014-2017 Zuoyebang, All rights reseved.
 * @fileoverview 直播页长连接通讯工具
 * @author WangWenshu | wangwenshu@zybang.com
 * @version 1.0 | 2015-12-24 | WangWenshu    // 初始版本。
 * @version 2.0 | 2017-03-23 | WangWenshu    // 后端长连接服务升级 3.0，前端适应性升级。
 * @version 2.1 | 2017-04-20 | WangWenshu    // 添加连接挂起判断逻辑。
 * @version 2.2 | 2017-05-25 | WangWenshu    // 修复网络状况不好时可能出现的建立多个活动长连接发送大量 ping 消息的问题。
 *
 * @description    // 附加说明。
 *   1) 本脚本通过建立长连接与服务器进行通讯，设计为被 WebWorker 加载在独立的线程中运行，以避免对页面主线程的阻塞影响。
 *   2) 脚本响应 'open'、'send' 以及 'close' 三种消息命令，分别执行长连接的打开、消息发送以及关闭。
 *   3) 脚本发出 'onOpen'、'onMsg'、'onClose' 和 'onError' 四种消息以通知主线程长连接的状态。
 *      onMsg 消息结构如下：
 *      {
 *        cmd: 'onMsg',            // 消息类型
 *        msg: {Object|String},    // 消息内容(JSON 或 字符串)
 *      }
 *      onError 消息结构如下：
 *      {
 *        cmd: 'onError',     // 消息类型
 *        errNo: {Number},    // 错误代码
 *        errMsg: {String}    // 错误描述
 *      }
 *      其他类型的消息结构类似，消息体仅包含 'cmd'，无其他内容。
 */

var webSocket,
  heartBeatsTimer,
  connectionPendingTimer;

function openSocket(url, pingInterval) {
  webSocket && webSocket.readyState < 2 && webSocket.close();

  clearTimeout(connectionPendingTimer);
  webSocket = new WebSocket(url, 'push');

  webSocket.onopen = function() {
    clearInterval(heartBeatsTimer);
    heartBeatsTimer = setInterval(function() {
      if (webSocket.readyState > 1) {
        openSocket(url, pingInterval);
      } else if (webSocket.readyState == 1) {
        webSocket.send('#9#');    // Send ping message.
      }
    }, pingInterval || 3000);

    postMessage({
      cmd: 'onOpen'
    });
  };

  webSocket.onmessage = function(msg) {
    var msgData;
    try {
      msgData = JSON.parse(msg.data);
    } catch (ex) {
      msgData = msg.data;
    }

    clearTimeout(connectionPendingTimer);
    connectionPendingTimer = setTimeout(function() {
      clearInterval(heartBeatsTimer);
      if (webSocket && webSocket.readyState < 2) {
        webSocket.close();
      } else {
        postMessage({
          cmd: 'onError',
          errNo: 2,
          errMsg: '长连接中断'
        });
      }
    }, 30 * 1000);

    // '#10#' is pong message.
    msgData == '#10#' || postMessage({
      cmd: 'onMsg',
      msg: msgData
    });
  };

  webSocket.onclose = function() {
    clearInterval(heartBeatsTimer);
    postMessage({
      cmd: 'onClose'
    });
  };
}

onmessage = function(e) {
  switch (e.data.cmd) {
    case 'open':
      try {
        openSocket(e.data.url, e.data.pingInterval);
      } catch (ex) {
        postMessage({
          cmd: 'onError',
          errNo: 1,
          errMsg: '建立长连接失败(' + ex.message + ')'
        });
      }
      break;

    case 'send':
      var msg = JSON.stringify(e.data.msg);
      msg && webSocket && webSocket.readyState == 1 && webSocket.send(msg);
      break;

    case 'close':
      webSocket && webSocket.readyState < 2 && webSocket.close();
      clearInterval(heartBeatsTimer);
      clearTimeout(connectionPendingTimer);
      break;

    default:
  }
};