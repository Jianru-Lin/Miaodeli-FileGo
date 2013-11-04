exports = module.exports = Engine;

function Engine() {
	this.instructionHandler = undefined;
	this.context = undefined;
	this.isRunning = undefined;
	this.instructionList = [];
	this.nextIndex = 0;
}

Engine.prototype.append = function(instructions) {
	var self = this;

	if (!Array.isArray(instructions)) {
		return;
	}

	if (instructions.length < 1) {
		return;
	}

	while(instructions.length > 0) {
		self.instructionList.push(instructions.shift());
	}
	
	self.run();
}

Engine.prototype.run = function() {
	var self = this;

	// 已经在执行了，无需重复调用
	if (self.isRunning) {
		return;
	}

	self.isRunning = true;
	execNextInstruction();

	function execNextInstruction() {
		// 队列中没有需要执行的指令
		if (self.nextIndex >= self.instructionList.length) {
			self.isRunning = false;
			return;
		}

		// 取出一条指令
		var ins = self.instructionList[self.nextIndex++];

		// 根据指令名找到对应的处理过程
		var handler = self.instructionHandler[ins.name];

		// 哦哦，没有找到对应名字的处理过程
		// 忽略它
		if (!handler) {
			console.log('unknown instruction: ' + ins.name);
			return;
		}

		// 调用处理过程
		try {
			handler.apply(self.context, ins.args);
		} catch(err) {
			console.log(err.toString());
		}

		// 继续执行下一条指令
		process.nextTick(execNextInstruction);
	}
}