var express = require('express'),
http = require('http'),
routes = require('./routes'),
path = require('path'),
Page = require('./models/page.js');
bodyParser = require('body-parser'),
favicon = require('serve-favicon'),
logger = require('logger'),
methodOverride = require('method-override');
var app = express();
console.log('df');

var mongo = {
    "hostname":"localhost",
    "port":27017,
    "username":"",
    "password":"",
    "name":"",
    "db":"deathbydegrees"
}

var generate_mongo_url = function(obj){
    obj.hostname = (obj.hostname || 'localhost');
    obj.port = (obj.port || 27017);
    obj.db = (obj.db || 'test');
    if(obj.username && obj.password){
        return "mongodb://" + obj.username + ":" + obj.password + "@" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
    else{
        return "mongodb://" + obj.hostname + ":" + obj.port + "/" + obj.db;
    }
}
var mongourl = generate_mongo_url(mongo);

function myFilter(array, callback) {
	var i, 
		results = [];
	for (i = 0; i < array.length; i++) {
		if (callback(array[i], i)) {
			results.push(array[i]);
		}
	}
	return results;
};
function myFindOne(array, callback) {
	var i, 
		result = null;
	for (i = 0; i < array.length; i++) {
		if (callback(array[i], i)) {
			result = array[i];
			break;
		}
	}
	return result;
}
function myMap(array, callback) {
	var i,
		results = [];
	for (i = 0; i < array.length; i++) {
		results.push(callback(array[i], i));
	}
	return results;
}
// var env = app.settings.env;
// if ('production' == env) {

app.set('port', process.env.VCAP_APP_PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
//app.use(favicon('http://localhost:3000/public/images', function(){}));
//app.use(logger.createLogger);
app.use(bodyParser());
app.use(methodOverride());


app.get('/', function(req, res) {
	console.log('sdf');
	res.render('index', new Page({
			scripts: ["deathByDegrees.js"],
			styles: ["deathByDegrees.css"]
	}));
});
app.get('/setup', function(req, res) {
	res.render('setup', new Page({
		title: 'Setup'
	}));
});
app.get('/about', function(req, res) {
	res.render('about', new Page({
		title: 'About Us'
	}));
});
app.get('/characters', function(req, res){
	var mongodb = require('mongodb').MongoClient;	
	mongodb.connect(mongourl, function (error, client) {
		var characters = client.collection('characters');
		characters.find({}).toArray(function(err, results) {
			var characterNames = [];
			for (var i = 0; i < results.length; i++) characterNames.push({_id: results[i]._id, name: results[i].name});
			characterNames.sort(function(a,b){return  a.name > b.name? 1 : a.name < b.name? -1 : 0});
			client.close();
			res.json(characterNames);
		});
	});
});




app.post('/findPath', function(req, res) {
	var fromChar = Number(req.body.fromCharacter);
	var toChar = Number(req.body.toCharacter);
	var mongodb = require('mongodb').MongoClient;	
	var i, j, k, p;

	// sets of characters n steps away. Each object is set up as {ID: parentID}
	var fromLevels = [{}];
	fromLevels[0][fromChar] = null;
	var toLevels = [{}];
	toLevels[0][toChar] = null;
	var pathChars = [];
	var pathGames = [];
	var fromArray = [fromChar];
	var toArray = [toChar];
	var theClient;

	mongodb.connect(mongourl, function (error, client) {
		theClient = client;
		var characters = client.collection('characters');
		var games = client.collection('games');
		var useSide = function (from, stepNum, callback) {
			var thisArray = (from? fromArray : toArray);
			var thatArray = (from? toArray: fromArray);
			var theseLevels = (from? fromLevels : toLevels);
			var thoseLevels = (from? toLevels: fromLevels);
			characters.find({_id: {"$in": thisArray }}).toArray(function (err, results) {
					var chIDSet = {};
					var found = false;
					for (i = 0; i < results.length; i++) {
						var chtr = results[i];
						for (j =0; j < chtr.rel.length; j++) {
							var rel = chtr.rel[j];
							chIDSet[rel] = chtr._id;
							if (thoseLevels[thoseLevels.length - 1].hasOwnProperty(rel) ){
								found = true;
								var nextChar = (from? chtr._id : rel);
								for (k = fromLevels.length-1; k>=0; k--) {
									pathChars.unshift(nextChar);
									nextChar = fromLevels[k][nextChar];
								}
								nextChar = (from? rel : chtr._id);
								for (k = toLevels.length-1; k>=0; k--) {
									pathChars.push(nextChar);
									nextChar = toLevels[k][nextChar];
								}
								break;
							}
						}
						if (found) break;
					}
					if (found) {
						games.find({}).toArray(function (err, results) {
							//brute-forcing it until I can find a better solution on the internet
							for (i = 0; i < pathChars.length - 1; i++) {
								var char1 = pathChars[i];
								var char2 = pathChars[i+1];
								for (j = 0; j < results.length; j++) {
									var char1Found = false;
									var char2Found = false;
									for(k = 0; k < results[j].characters.length; k++) {
										currentChar = results[j].characters[k];
										if (currentChar === char1) {
											char1Found = true;
										}
										if (currentChar === char2) {
											char2Found = true;
										}
										if (char1Found && char2Found) {
											break;
										}
									}
									if (char1Found && char2Found) {
										pathGames.push(results[j].name);
										break;
									}
								}
							}
							characters.find({_id: {"$in": pathChars}}).toArray(function (err, results) {
								for (i = 0; i < pathChars.length; i++) {
									var charName = myFindOne(results, function (val) {return val._id === pathChars[i]}).name;
									pathChars[i] = charName;
								}
								callback(found, stepNum);
							});
						});
					//11 is an arbitrary cutoff, and it's probably larger than the graph's diameter
					} else if (stepNum < 11) {
						theseLevels.push(chIDSet);
						thisArray.splice(0, thisArray.length);
						for(p in chIDSet) {
							(from? fromArray : toArray).push(Number(p));
						}
						getBaconNumber(stepNum+1, callback);
					} else {
						callback(found, stepNum);
					}
				});
		}
		var getBaconNumber = function(stepNum, callback) {
			var found = false;
			var chIDSet = {};
			if (stepNum % 2 !== 0) {
				useSide(true, stepNum, callback);
			} else {
				useSide(false, stepNum, callback);
			}
		};
		if (fromChar === toChar) {
			characters.findOne({_id: fromChar}, function (err, results) {
				theClient.close();
				res.json({
					baconNumber: 0,
					found: true,
					characters: [results.name],
					games: []
				});
			});
		} else {
			getBaconNumber(1, function (found, baconNumber) {
				theClient.close();
				res.json({
					baconNumber: baconNumber,
					found: found,
					characters: pathChars,
					games: pathGames
				});
			});
		}
	});
});




app.post('/upload', function(req, res){
	var file = req.body.file;
	var truncate = req.body.truncate === true || req.body.truncate === 'true';
	var errors = [];
	var dataStr = "";
	var relations = [];
	var sqlStrings = [];
	var mongodb = require('mongodb').MongoClient;
	var games = [];
	var characters = {};
	var theClient;
	console.log(file);
	if (!file.match(new RegExp(".+\.csv$", ""))) {
		errors.push("The file you supplied must have the .csv extension");
	} else {
		try {
			var fs = require('fs');
			fs.readFile(file, function (err, data) {
				var i, j, k, L;
				console.log(err);
				dataStr = data.toString();
				var textRows = dataStr.replace(/\r?\n/g,'%#%').split("%#%");
				var gameTitles = textRows[0].split("\t");
				mongodb.connect(mongourl, function (error, client) {
					theClient = client;
					if (error) throw error;
					var mongoGames = client.collection('games');
					var mongoCharacters = client.collection('characters');
					var addToDatabase = function (callback) {
						if (truncate)
						{
							callback();
						} else {
							mongoGames.find().toArray(function(err, results) {
								var oldGames = results;
								mongoCharacters.find().toArray(function(err, results) {
									var oldCharacters = results;
									games = oldGames;
									for (i = 0; i < oldCharacters.length; i++) {
										characters[oldCharacters[i]._id] = oldCharacters[i];
									} 
									callback();
								});
							});
						}
						
					};
					addToDatabase (function(){
						for (i = 0; i < gameTitles.length; i++) {
							gameTitles[i] = {	
												title: gameTitles[i].replace(/\n/g, ' ')
													  .trim()
													  .replace(/^\"|\"$/g, "") // leading and trailing quote
													  .replace(/\"\"/g, '"')
													  .replace(/{[^{}]*}/g, '') // parse out family name contained in {}
													  .trim(),
												families: gameTitles[i].match(/{[^{}]*}/g)
											};
							if (gameTitles[i].families != null) {
								for (j = 0; j < gameTitles[i].families.length; j++) {
									gameTitles[i].families[j] = gameTitles[i].families[j].replace(/}|{/g, '');
								}
							}
						}
						var characterRows = [];
						for (i = 1; i < textRows.length; i++ ) {
							var row = textRows[i].split("\t");
							characterRows.push(row);
						}
						var nextCharID = -1;
						for (p in characters) {
							if (!isNaN(p)) {
								nextCharID = Number(p) > nextCharID? Number(p) : nextCharID;
							}
						}
						nextCharID++;
						for (i = 0; i < gameTitles.length; i++) {
							var game = {name: gameTitles[i].title, characters: [], families: gameTitles[i].families, _id: -1};
							for (j = 0; j < characterRows.length; j++) {
								if (characterRows[j][i] !== "" && characterRows[j][i] !== null && characterRows[j][i] !== undefined) {
									var characterName = characterRows[j][i].replace(/\n/g, ' ').trim().replace(/^\"|\"$/g, "").replace(/\"\"/g, '"').trim();
									
									var character = null;
									for (p in characters) {
										if (characters[p].name === characterName) {
											character = characters[p];
											break;
										}										
									}
									if (character === null || typeof character === "undefined") {
										characters[nextCharID] = {_id: nextCharID, rel: [], name: characterName};
										if (characterName === "Nina Williams" ) console.log("Put her in!");
										character = characters[nextCharID];
										nextCharID++;
									}
									if (character.name === "Nina Williams") console.log("Found Her!");
									game.characters.push(character._id);
								}
							}
							if (gameTitles[i].title !== '' && gameTitles[i].title !== null && typeof gameTitles[i].title !== 'undefined') {
								var existingGame = myFindOne(games, function(val){return val.name === game.name});
								if (existingGame === null){
									game._id = games.length;
									games.push(game);
								} else {
									game._id = existingGame._id;
									existingGame = game;
								}
								
							}		
						}
						for (i = 0; i < games.length; i++) {
							var currentGame = games[i];
							for (j = 0; j < currentGame.characters.length; j++) {
								var currentCharacter = characters[currentGame.characters[j]];
								for (k = 0; k < currentGame.characters.length; k++) {
									if (j === k) continue;
									var existingCharacter = myFindOne(currentCharacter.rel, function(val){return val === currentGame.characters[k]});
									if (existingCharacter === null) {
										currentCharacter.rel.push(currentGame.characters[k]);
									}
								}
							}
						}
						var characterArray = [];
						i= 0;
						console.log()
						for (p in characters) {
							characterArray.push(characters[p]);
						}
						mongoGames.remove(null, null, function(error, client) {
							console.log(error);
							mongoGames.insert(games, {safe: true}, function (err, objects) {
								console.log(err);
								mongoCharacters.remove(null, null, function (error, client) {
									console.log(error);
									var insertChunk = function(array, chunkSize, callback) {
										var smallerArr = [];
										var chunk = [];
										chunkSize = (chunkSize < array.length ? chunkSize : array.length);
										chunk = array.slice(0, chunkSize);
										mongoCharacters.insert(chunk, {safe: true}, function(err, objects) {
											console.log(err);
											if (chunkSize < array.length) {
												insertChunk(array.slice(chunkSize, array.length), chunkSize, callback);
											} else {
												callback(err, objects);
											}
										});
									}
									insertChunk(characterArray, 2500, function(err, objects){
										theClient.close();
										res.json({
											errors: errors,
											data: "success",
											characterNum: characterArray.length
										});
									});
								});
							});
						});
					});
				});
			});
		} catch (ex) {
			errors = ex;
			theClient.close();
			res.json({
				errors: errors,
				data: "fail"
			});
		}
	}
});
app.use(express.static(__dirname + '/public'));
http.createServer(app).listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});
