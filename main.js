// [模块]
var fs = require('fs');
var JsonServer = require('./lib/json-server.js');
var Engine = require('./lib/engine.js');
var format = require('util').format;
var path = require('path');

// [变量]
var g = {
	jsonServer: undefined,
	engine: undefined
};

// [流程]
main();

// [函数]
function main() {
	// 创建指令引擎，此时什么指令也没有
	g.engine = new Engine();
	g.engine.context = g;
	g.engine.instructionHandler = {};

	// 创建并启动 JSON 服务器
	g.jsonServer = new JsonServer();
	g.jsonServer.options = {
		host: '127.0.0.1',
		port: '50055'
	};
	g.jsonServer.on('jsonRequest', onJsonRequest);
	g.jsonServer.on('started', onStarted);
	g.jsonServer.on('stopped', onStopped);
	g.jsonServer.on('startError', onStartError);
	g.jsonServer.start();

	function onStarted() {
		console.log(format('Json Server started on %s [%s]', g.jsonServer.options.host, g.jsonServer.options.port));
	}

	function onStopped() {
		console.log('Json Server stopped');
	}

	function onJsonRequest(reqObj, resCallback) {
		var instructions = reqObj.instructions;

		if (!Array.isArray(instructions) || instructions.length < 1) {
			resCallback({error: 'instructions is missing'});
			return;
		}

		appendInstructions(instructions);
	}

	function onStartError() {
		console.log('start Json Server error, ' + g.jsonServer.serverError);
	}
}

function reloadModule(modulePath) {
	// 删除模块缓存
	delete require.cache[modulePath];

	// 重新加载
	return require(modulePath);
}

function appendInstructions(instructions, resCallback) {
	// 如果指令列表中有 dump 指令
	// 则需要补足一下
	// 这里是实现数据查询的关键
	for (var i = instructions.length - 1; i >= 0; --i) {
		var ins = instructions[i];
		// 这样做才能够保证查询后能把结果返回给客户端
		ins.callback = resCallback;

		// 加载指令对应的模块
		var modulePath = path.resolve(__dirname, 'instructions', ins.name + '.js');
		var m = reloadModule(modulePath);
		g.engine.instructionHandler[m.name] = m.handler;
	}

	// 把指令加入到引擎中去
	g.engine.append(instructions);

}