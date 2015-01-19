//resource: http://expressjs.com/4x/api.html#application

var express = require('express');
var app = express();// originally var app = require('express')(); which i think sums up line 3 and 4 but we need the var express if i want to add in my own js. 
var http = require('http').Server(app);
var io= require('socket.io')(http); //after downloading the socket.io we need to state the var we initialize the (socket.io)
//and pass it through the http object\
var pg = require('pg');

var conString = "postgres://carolinelouie@localhost/navigatio";

var client = new pg.Client(conString);
client.connect(function(err) {
	if(err) {
		return console.error('could not connect to postgres', err);
	}
	client.query('SELECT NOW() AS "theTime"', function(err, result) {
		if(err) {
			return console.error('error running query', err);
		}
		console.log(result.rows[0].theTime);
		//output: Tue Jan 15 2013 19:12:47 GMT-600 (CST)
		client.end();


	});
});

var userCount = 0;

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/', function (req, res){
	res.send('Welcome');
});

app.use('/styles', express.static(__dirname +'/styles'));
app.use(express.static(__dirname +'/public'));

io.on('connection', function(socket) { // then listen to the connection event for incoming sockets
	console.log("connnected");
	//var room = '';

	userCount = userCount + 1;
	//var currentUsername = "";
	console.log("Someone connected there are", userCount, "users");
	//socket.emit("users", users);

	socket.on('addPlace', function(cityPlace){
		console.log(cityPlace+" is a new place that has been added");
		// record the visit

	});

	socket.on('addPlaceName', function(placeNameAdded){
		console.log(placeNameAdded+" is a new place that has been added");

	});

	socket.on('addCountry', function(countryAdded){
		console.log(countryAdded+" is a new place that has been added");

	});

	socket.on('addPlaceNow', function(city, name, country){
		var client = new pg.Client(conString);
		client.connect(function(err) {
			if(err) {
				return console.error('could not connect to postgres', err);
			}
			client.query('INSERT INTO places (name, city, country) VALUES ($1, $2, $3)', [name, city, country], function (err, result) {
				if(err) {
					return console.error('error running query', err);
				}
				// return the client to the connection pool for other requests to reuse
				console.log(country + city + name + "is now added to places table");
				client.end();
				//res.writeHead(200, {'content-type': 'text/plain'});
				//res.end('You are visitor number ' + result.rows[0].count);

				//alert('done!!!');
			});
		console.log(country + city + name + "is now added to places table");
		});
	});

	socket.on('addDiveShop', function(diveShopAdded){
		console.log(diveShopAdded+" is a new diveShop that has been added");
	});

	socket.on('addSite', function(siteAdded){
		console.log(siteAdded+" is a new site that has been added");
	});

	socket.on('disconnect', function() {
		userCount = userCount - 1;
		console.log("Someone disconnected there are", userCount, "users");// if there is a disconnection, log it to the console.
	});

});
    //
	//client.lrange('username', 0, -1, function(err, usernames){ //then we retrieve the list and print it out
	//	io.to(room).emit('username', usernames); //io.emit so it gets sent to all the users (including the person that joined
	//	//socket.broadcast.emit('username', username);
	//	console.log("the current users are: ", usernames);
	//	//socket.emit('username', username);
	//	socket.emit("users",usernames);
	//});


http.listen(3000, function(){
	console.log('listening on *:3000...');
});

