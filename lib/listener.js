exports = module.exports = Listener;

function Listener() {
	this.eventSource = undefined;
	this.enable = undefined;
}

Listener.prototype.on = function(eventName, handler) {
	var g = this;

	if (!g.eventSource) {
		return false;
	}

	g.eventSource.on(eventName, function() {
		if (g.enable) {
			handler.apply(undefined, arguments);	
		}
	});
}