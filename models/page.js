module.exports = function (model) {
	this.title = "Death By Degrees";
	this.scripts = [];
	this.styles = [];
	for (prop in model) {
		this[prop] = model[prop];
	}
};