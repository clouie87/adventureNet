//resource: http://expressjs.com/4x/api.html#application


var express = require('express'),
	exphbs = require('express-handlebars'),
	logger = require('morgan'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	passport = require('passport'),
	LocalStrategy = require('passport-local'),
	TwitterStrategy = require('passport-twitter'),
	GoogleStrategy = require('passport-google'),
	FacebookStrategy = require('passport-facebook').Strategy;


var app = express();// originally var app = require('express')(); which i think sums up line 3 and 4 but we need the var express if i want to add in my own js.
var http = require('http').Server(app);
var io= require('socket.io')(http); //after downloading the socket.io we need to state the var we initialize the (socket.io)
//and pass it through the http object\
var request = require('request');

app.use('/styles', express.static(__dirname +'/styles'));
app.use(express.static(__dirname +'/public'));


var pg = require('pg');

var userCount = 0;

var FACEBOOK_APP_ID ='295897893929835';
var FACEBOOK_APP_SECRET = '016c48478907f77a428e2dfb5724edf7';


//============== POSTGRES  STUFF ====================//

var conString = "postgres://carolinelouie@localhost/navigatio";

//postgres client set up
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

//============== END OF POSTGRES  STUFF (EXCEPT FOR WHATS IN SOCKET STUFF)====================//

var config = require('./config.js'), //config file contains all tokens and other private info
	funct = require('./functions.js');

//============== EXPRESS STUFF ====================//

// Configure Express
app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next){
	var err = req.session.error,
		msg = req.session.notice,
		success = req.session.success;

	delete req.session.error;
	delete req.session.success;
	delete req.session.notice;

	if (err) res.locals.error = err;
	if (msg) res.locals.notice = msg;
	if (success) res.locals.success = success;

	next();
});

// Configure express to use handlebars templates
var hbs = exphbs.create({
	defaultLayout: 'main', //we will be creating this layout shortly
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');


//===============PASSPORT  STUFF ===================//
// Passport session setup.
passport.serializeUser(function(user, done) {
	console.log("serializing " + user.username);
	done(null, user);
});

passport.deserializeUser(function(obj, done) {
	console.log("deserializing " + obj);
	done(null, obj);
});

// Use the LocalStrategy within Passport to login/”signin” users.
passport.use('local-signin', new LocalStrategy(
	{passReqToCallback : true}, //allows us to pass back the request to the callback
	function(req, username, password, done) {
		funct.localAuth(username, password)
			.then(function (user) {
				if (user) {
					console.log("LOGGED IN AS: " + user.username);
					req.session.success = 'You are successfully logged in ' + user.username + '!';
					done(null, user);
				}
				if (!user) {
					console.log("COULD NOT LOG IN");
					req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
					done(null, user);
				}
			})
			.fail(function (err){
				console.log(err.body);
			});
	}
));
// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('local-signup', new LocalStrategy(
	{passReqToCallback : true}, //allows us to pass back the request to the callback
	function(req, username, password, done) {
		funct.localReg(username, password)
			.then(function (user) {
				if (user) {
					console.log("REGISTERED: " + user.username);
					req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
					done(null, user);
				}
				if (!user) {
					console.log("COULD NOT REGISTER");
					req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
					done(null, user);
				}
			})
			.fail(function (err){
				console.log(err.body);
			});
	}
));

//==================FACEBOOK HTTP STUFF ==================//


passport.use(new FacebookStrategy({
		clientID: FACEBOOK_APP_ID,
		clientSecret: FACEBOOK_APP_SECRET,
		callbackURL: 'http://localhost:3000/auth/facebook/callback'

	},

	function(accessToken, refreshToken, profile, done) {
		var user = profile;
		user.username = user.displayName;
		user.avatar = "http://graph.facebook.com/" + profile.id + "/picture?width=400&height=400",
		console.log(profile);
		console.log(user + " this is the user for Facebook Login!!");

		//req.session.success = 'You are successfully registered and logged in ' + user.name + '!';

		done(null, user);
        process.nextTick(function(){
			return done(null, profile);
		});
		//User.findOrCreate(profile, function(err, user) {
		//if (err) { return done(err); }
		//done(null, user);
	//});
	}
));

//================= ROUTES STUFF ====================//

//displays our homepage
app.get('/', function(req, res){
	res.render('home', {user: req.user});
});

//displays our signup page
app.get('/signin', function(req, res){
	res.render('signin');
});

app.get('/auth/facebook',
	passport.authenticate('facebook'),
	function(req, res){
		//request will be redirected to facebook for auth
	});

app.get('/auth/facebook/callback',
	passport.authenticate('facebook', {failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/')

	});

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
		successRedirect: '/',
		failureRedirect: '/signin'
	})
);

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
		successRedirect: '/',
		failureRedirect: '/signin'
	})
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
	var name = req.user.username;
	console.log("LOGGIN OUT " + req.user.username);
	req.logout();
	res.redirect('/');
	req.session.notice = "You have successfully been logged out " + name + "!";
});




//============== SOCKET STUFF ====================//

io.on('connection', function(socket) { // then listen to the connection event for incoming sockets
	console.log("connnected");
	//var room = '';

	userCount = userCount + 1;
	//var currentUsername = "";
	console.log("Someone connected there are", userCount, "users");
	//socket.emit("users", users);

	//====================== USERS TABLE ================//S


	socket.on('userName', function(name){
		console.log("Name: "+ name )
	});

	socket.on('last_name', function(last_name){
		console.log("Last Name: " + last_name)
	});

	socket.on('email', function(email){
		console.log("Email: "+ email)
	});

	socket.on('gender', function(gender){
		console.log("Gender: "+ gender)
	});

	socket.on('photo', function(photo){
		console.log("photo: "+ photo)
	});

	socket.on('newUser', function(name, photo, last_name, email, gender) {
		var client = new pg.Client(conString);
		client.connect(function(err) {
			if(err) {
				return console.error('could not connect to postgres', err);
			}
			client.query('INSERT INTO users (name, photo, last_name, email, gender) VALUES ($1, $2, $3, $4, $5)', [name, photo, last_name, email, gender], function (err, result) {
				if(err) {
					return console.error('error running query', err);
				}
				// return the client to the connection pool for other requests to reuse
				console.log(name + " " + photo + " " + last_name + " " + email + " " + gender + " " + "is now added to useres table");
				client.end();
				//res.writeHead(200, {'content-type': 'text/plain'});
				//res.end('You are visitor number ' + result.rows[0].count);

				//alert('done!!!');
			});
			console.log(name + " " + last_name + " " + email + " " + gender + " " + "is now added to users table");
		});
	});

	//=======================END USER TABLE =============================//

	//=========================NEW PLACE TABLE ==========================//


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

//========================= END OF SOCKET STUFF ==============================//


http.listen(3000, function(){
	console.log('listening on *:3000...');
});

