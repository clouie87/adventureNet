//resource: http://expressjs.com/4x/api.html#application

var express = require('express');
var app = express();// originally var app = require('express')(); which i think sums up line 3 and 4 but we need the var express if i want to add in my own js. 
var http = require('http').Server(app);
var io= require('socket.io')(http); //after downloading the socket.io we need to state the var we initialize the (socket.io)
//and pass it through the http object\
//var redis = require('redis');
//
//var client = redis.createClient();
//
//client.on("error", function (err) {
//	console.log("Error " + err);
//});

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/', function (req, res){
	res.send('Welcome');
});

app.use('/styles', express.static(__dirname +'/styles'));
app.use(express.static(__dirname +'/public'));


http.listen(3000, function(){
	console.log('listening on *:3000...');
});

