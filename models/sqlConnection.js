if (process.env.VCAP_SERVICES) {
	var env = JSON.parse(process.env.VCAP_SERVICES);
	var credentials = env['mysql-5.1'][0]['credentials'];
} else {
	credentials = {
		user: "root",
		password: "",
		host: "127.0.0.1",
		port: 3306,
		name: "deathbydegrees"
	};
}

var mysql = require("mysql");

module.exports = {
	connection: {},
	dbName: credentials.name,
	connect: function () {
		this.connection = mysql.createConnection({
			user: credentials.user,
			password: credentials.password,
			host: credentials.host,
			port: credentials.port,
			database: credentials.name
		});
	},
	query: function(query, callback) {
		this.connection.query(query, callback);
	},
	end: function() {
		this.connection.end();
	}
};