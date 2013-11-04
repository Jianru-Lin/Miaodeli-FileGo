// [导出]
exports = module.exports = JsonServer;

// [模块]
var http = require('http');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var Listener = require('./listener');

// [流程]
inherits(JsonServer, EventEmitter);

// [函数]
function JsonServer() {
	this.options = undefined;
	this.server = undefined;
	this.serverListener = undefined;
	this.serverError = undefined;
	this.status = {
		isStarting: undefined,
		isRunning: undefined,
		isStopping: undefined
	};
	this.requestCount = {
		total: 0,
		success: 0,
		failure: 0
	};
}

JsonServer.prototype.start = function() {
	var g = this;
	var self = this;

	// 如果当前状态是正在启动或者已经开始运行
	// 则不做任何事
	if (g.status.isStarting || g.status.isRunning) {
		return false;
	}

	// 设置当前处于启动中状态
	g.status.isStarting = true;
	g.status.isRunning = false;
	g.status.isStopping = false;

	// 执行简单的初始化
	construct();

	// 创建 http server
	g.server = http.createServer();

	// 创建 serverListener 用于代理事件订阅
	g.serverListener = new Listener();
	g.serverListener.eventSource = g.server;
	g.serverListener.enable = true;
	
	g.serverListener.on('listening', onListening);
	g.serverListener.on('request', onRequest);
	g.serverListener.on('close', onClose);
	g.serverListener.on('error', onError);

	// 启动 http server
	g.server.listen(g.options.port, g.options.host);

	return true;

	// [函数]

	function construct() {
		// 初始化 options
		g.options = g.options || {};

		if (g.options.port === undefined) {
			g.options.port = 80;
		}

		if (g.options.host === undefined) {
			g.options.host = '127.0.0.1';
		}

		// 初始化 server 和 serverError
		g.server = undefined;
		g.serverError = undefined;

		// 初始化 serverListener
		g.serverListener = undefined;

		// 初始化 requestCount
		g.requestCount.total = 0;
		g.requestCount.success = 0;
		g.requestCount.failure = 0;
	}

	function onListening() {
		// 进入监听状态了，服务程序创建已经成功
		g.status.isStarting = false;
		g.status.isRunning = true;
		g.status.isStopping = false;

		// 通知订阅者
		emitStartedEvent();
	}

	function onRequest(req, res) {
		++g.requestCount.total;

		// 必须是 POST

		if (req.method !== 'POST') {
			++g.requestCount.failure;
			return;
		}

		// Content-Type 必须为 JSON 类型

		var contentType = req.headers['content-type'];
		if (!/^application\/json;charset=UTF-8$/i.test(contentType)) {
			++g.requestCount.failure;
			return;
		}

		// 开始接收数据

		receiveBody(function(buffer) {
			try {
				// 转换为字符串
				var text = buffer.toString('utf8');

				// 以 JSON 格式解析
				var jsonObj = JSON.parse(text);

				// 发出事件通知订阅者
				emitJsonRequestEvent(jsonObj);

			} catch(err) {
				++g.requestCount.failure;
			}
		});

		// # successCallback(buffer)

		function receiveBody(successCallback) {
			var chunks = [];
			var totalLength = 0;

			req.on('data', function(chunk) {
				chunks.push(chunk);
				totalLength += chunk.length;
			});

			req.on('end', function(chunk) {
				var buffer = Buffer.concat(chunks, totalLength);
				successCallback(buffer);
			});

			req.on('error', function(err) {
				++g.requestCount.failure;
			});
		}
	}

	function onClose() {
		// 已经完全停止
		g.status.isStarting = false;
		g.status.isRunning = false;
		g.status.isStopping = false;

		// 通知订阅者
		emitStoppedEvent();
	}

	function onError(err) {
		// 记录下错误
		g.serverError = err;

		// 已经完全停止
		g.status.isStarting = false;
		g.status.isRunning = false;
		g.status.isStopping = false;

		// 通知订阅者
		emitStartErrorEvent();
	}

	function emitStartedEvent() {
		self.emit('started');
	}

	function emitStoppedEvent() {
		self.emit('stopped');
	}

	function emitStartErrorEvent() {
		// 启动时出错
		self.emit('startError', g.serverError);
	}

	function emitJsonRequestEvent(reqObj) {
		self.emit('jsonRequest', reqObj, resCallback);

		function resCallback(resObj) {
			// 转换为 JSON 文本

			var text = JSON.stringify(resObj);
			var length = Buffer.byteLength(text, 'utf8');

			// 发送响应

			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json;charset=UTF-8');
			res.setHeader('Content-Length', length);

			res.end(text);
		}
	}
}

JsonServer.prototype.stop = function() {
	var g = this;
	var self = this;

	// 不允许重复停止
	if (g.status.isStopping) {
		return false;
	}

	// 进入停止中状态
	g.status.isStopping = true;

	// 关闭 serverListener 禁止事件继续传播
	g.serverListener.enable = false;

	// 析构
	destruct(function() {
		// 取消停止中状态
		g.status.isStopping = false;

		// 通知事件订阅者
		emitStoppedEvent();
	});

	function destruct(cb) {
		// 把 server 释放掉即可
		g.server.close(cb);
	}

	function emitStoppedEvent() {
		self.emit('stopped');
	}
}