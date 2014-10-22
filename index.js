//resource: http://expressjs.com/4x/api.html#application

var express = require('express');
var app = express();// originally var app = require('express')(); which i think sums up line 3 and 4 but we need the var express if i want to add in my own js. 
var http = require('http').Server(app);
var io= require('socket.io')(http); //after downloading the socket.io we need to state the var we initialize the (socket.io)
//and pass it through the http object
var redis = require("redis");
var client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

client.set("app name", "simple chat", redis.print); // we set a key for app name here which we get on line 30

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/', function (req, res){
	res.send('Welcome');
});

app.use('/styles', express.static(__dirname +'/styles'));

app.use('/scripts', express.static(__dirname +'/scripts'));

io.on('connection', function(socket){ // then listen to the connection event for incoming sockets
	client.get("app name", function(err, reply){ //we get the key value and print it to the console. 
		console.log("app name is: " + reply);
	});
	client.get('last message', function(err, reply){
		console.log("last message: ", reply);
	});

	console.log('a user connected'); // if there is a connection, log it to the console. 
	socket.on('disconnect', function(){ // listen to people disconnection events for outgoing socket
	console.log('user disconnected');// if there is a disconnection, log it to the console. 
	});

	socket.on('chat message', function(msg){
		console.log('the message is: ' + msg);
		socket.broadcast.emit('chat message', msg);
		client.set('last message', msg);// to store the message
	}); // this will print it to the console... but we want to print it to the page! (broadcast it to the users)
	
});

http.listen(3000, function(){
	console.log('listening on *:3000...');
}); 