var chatText = document.getElementById("chat-text");
var chatInput = document.getElementById("chat-input");
var chatForm = document.getElementById("chat-form");
var userForm = document.getElementById("user-form");
var bulletForm = document.getElementById("bullet-form");
var formContainer = document.getElementById("form");
var uname = document.getElementById("uname");
var bname = document.getElementById("bname");
var gameDiv = document.getElementById("game");
var canvas = document.getElementById("ctx");
var gameLabel = document.getElementById("gameLabel");
var connServerDiv = document.getElementById("connectServer");
var ctx = canvas.getContext("2d");

// dark mode checker
var isDark = () => {
	return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// random code generator, for client id
var randNum = () => {
	var letters = "0123456789ABCDEF";
	var code = "";
	for (var i = 0; i < 10; i++) {
		code += letters[Math.floor(Math.random() * 16)];
	};
	return code;
};
var clientId = randNum();

// socket connection
var config = require('../config.json');
var server = `${config.url}:${config.port}`;
var socket = io(`${server}/?clientId=${clientId}`);

connServerDiv.innerHTML = `<p>Connecting to ${server}, please wait...</p>`;

var loadingTime = 3500;
var attempt = 0;
var connectUp = setInterval(loadup, loadingTime);

function loadup() {
	if (socket.connected) {
		connServerDiv.innerHTML = "<p id=\"good\">Connected!</p>"
		setTimeout(function () {
			formContainer.style.display = 'inline-block';
			connServerDiv.style.display = 'none';
		}, 1000);
		clearInterval(connectUp);
	} else {
		attempt++;
		if (attempt > 3) {
			connServerDiv.innerHTML = `
			<p id="bad">Failed to make a connection with the socket. Either:</p>
			<ul id="bad">
			<li>Socket server's URL/IP or port, set in the configurations, is invalid.</li>
			<li>Server is down.</li>
			<li>Firewall is blocking to make connection.</li>
			<li>No internet connection.</li>
			</ul>
			`;
			return clearInterval(connectUp);
		};
		connServerDiv.innerHTML = `<p id="bad">Failed to connect to the socket.</p>`;
		setTimeout(function() {
			connServerDiv.innerHTML = `<p>Trying again... [attempt #${attempt}]</p>`;
		}, 1500);
	};
}

// name sing-in and its validation

userForm.onsubmit = bulletForm.onsubmit = (e) => {
	e.preventDefault();
	user = uname.value;
	bullet = bname.value;
	
	socket.emit('userName', {
		username:user,
		bulletname:bullet,
	});
	uname.value = '';
	bname.value = '';
};
	
socket.on('userValidation', function(data) {
	if (data.success) {
		formContainer.style.display = 'none';
		gameLabel.style.display = 'none';
		gameDiv.style.display = 'inline-block';
	} else {
		return new Notification('Error occured', {
			body: data.reason,
			icon: '../icon.png'
		});
	};
});

// name sing-in and its validation
// chat

socket.on('addToChat', function(data) {
	if (data.victim) {
		chatText.innerHTML += '<div><b>' + data.name + '</b> ' + data.message + ' <b>' + data.victim + '</b></div>'
	} else if (!data.name)
		chatText.innerHTML += '<div><i>' + data.message + '</i></div>'
	else
		chatText.innerHTML += '<div><b>' + data.name + '</b>: ' + data.message + '</div>'
	chatText.scrollTop = chatText.scrollHeight;
});

	// debugging (if enabled)

socket.on('evalAnswer', function(data) {
	console.log(data);
});

chatForm.onsubmit = function(e) {
	e.preventDefault();
	if (chatInput.value[0] === '/')
		socket.emit('evalServer', chatInput.value.slice(1));
	else
		socket.emit('sendMsgToServer', chatInput.value);
	chatInput.value = '';
};

// chat
// game data

var Player = function(initPack){
	var self = {};
	self.id = initPack.id;
	self.number = initPack.number;
	self.x = initPack.x;
	self.y = initPack.y;
	self.hp = initPack.hp;
	self.hpMax = initPack.hpMax;
	self.score = initPack.score;
	
	self.draw = function() {
		ctx.font = 'italic bold 36px Arial';

		// DARK MODE
		if (isDark) {
			ctx.fillStyle = '#fff';
		};

		var hpWidth = 30 * self.hp / self.hpMax;
		ctx.fillRect(self.x - hpWidth / 2, self.y - 40, hpWidth, 4);
		ctx.fillText(self.number, self.x, self.y);
		
		ctx.fillText(self.score, self.x, self.y - 60);
	};
	
	Player.list[self.id] = self;
	return self;
};
Player.list = {};

var Bullet = function(initPack) {
	var self = {};
	self.id = initPack.id;
	self.x = initPack.x;
	self.y = initPack.y;
	self.bullet = initPack.name;
	
	self.draw = function() {
		ctx.font = 'bold 14px Comic Sans MS';
		ctx.fillText(self.bullet, self.x-5, self.y-5);
	};
	
	Bullet.list[self.id] = self;
	return self;
};
Bullet.list = {};

	// init - loads in huge package once (to save bandwidth)

socket.on('init', function(data) {
	for (var i = 0; i < data.player.length; i++) {
		new Player(data.player[i]);
	};
	for (var i = 0; i < data.bullet.length; i++) {
		new Bullet(data.bullet[i]);
	};
});

	// update - updates player and bullet position
	
socket.on('update', function(data) {
	for (var i = 0; i < data.player.length; i++) {
		var pack = data.player[i];
		var p = Player.list[pack.id];
		if (p) {
			if (pack.x !== undefined)
				p.x = pack.x;
			if (pack.y !== undefined)
				p.y = pack.y;
			if (pack.hp !== undefined)
				p.hp = pack.hp;
			if (pack.score !== undefined)
				p.score = pack.score;
		};
	};
	for (var i = 0; i < data.bullet.length; i++) {
		var pack = data.bullet[i];
		var b = Bullet.list[data.bullet[i].id];
		if (b) {
			if (pack.x !== undefined)
				b.x = pack.x;
			if (pack.y !== undefined)
				b.y = pack.y;
		};
	};
});
	
	// remove - removes player from the list when disconnects
	
socket.on('remove', function(data) {
	for (var i = 0; i < data.player.length; i++) {
		delete Player.list[data.player[i]];
	};
	for (var i = 0; i < data.bullet.length; i++) {
		delete Bullet.list[data.bullet[i]];
	};
});

	// loop

setInterval(function() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	for (var i in Player.list) {
		Player.list[i].draw();
	};
	
	for (var i in Bullet.list) {
		Bullet.list[i].draw();
	};
}, 20);

// game data
// game controls

document.onkeydown = function(event) {
	if ((event.keyCode === 68) || (event.keyCode === 39))
		socket.emit('keyPress', {inputId:'right', state:true});
	else if ((event.keyCode === 83) || (event.keyCode === 40))
		socket.emit('keyPress', {inputId:'down', state:true});
	else if ((event.keyCode === 65) || (event.keyCode === 37))
		socket.emit('keyPress', {inputId:'left', state:true});
	else if ((event.keyCode === 87) || (event.keyCode === 38))
		socket.emit('keyPress', {inputId:'up', state:true});
};
document.onkeyup = function(event) {
	if ((event.keyCode === 68) || (event.keyCode === 39))
		socket.emit('keyPress', {inputId:'right', state:false});
	else if ((event.keyCode === 83) || (event.keyCode === 40))
		socket.emit('keyPress', {inputId:'down', state:false});
	else if ((event.keyCode === 65) || (event.keyCode === 37))
		socket.emit('keyPress', {inputId:'left', state:false});
	else if ((event.keyCode === 87) || (event.keyCode === 38))
		socket.emit('keyPress', {inputId:'up', state:false});
};

document.onmousedown = function() {
	socket.emit('keyPress', {inputId:'attack', state:true});
};
document.onmouseup = function() {
	socket.emit('keyPress', {inputId:'attack', state:false});
};
document.onmousemove = function(event) {
	var x = -250 + event.clientX - 8;
	var y = -250 + event.clientY - 8;
	var angle = Math.atan2(y, x) / Math.PI * 180;
	socket.emit('keyPress', {inputId:'mouseAngle', state:angle});
};

// game controls