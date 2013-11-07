exports.name = 'print';
exports.handler = print;

function print(args) {
	var text = args.text;
	console.log(text)
	return {success: true};
}