const { RTMClient } = require('@slack/client');
var env = require('node-env-file');
const http = require("http");
var Players = require('./User.js')
env(__dirname + '/.env', {raise: false});

var currentPlayers = {};

// The client is initialized and then started to get an active connection to the platform
const token = process.env.SLACK_TOKEN;
const rtm = new RTMClient(token);
rtm.start();


// This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
const conversationId = 'DDWM5BAU8';
// The RTM client can send simple string messages
/*
rtm.sendMessage('Hello there', conversationId)
  .then((res) => {
    // `res` contains information about the posted message
    console.log('Message sent: ', res.ts);
  })
  .catch(console.error);
*/

// General: CDXD5S2KU
// Random: CDXD5S3T4
rtm.on('message', (message) => {
  // Skip messages that are from a bot or my own user ID
  // Also skip messages in the channels 'General' and 'Random'
  if ( (message.subtype && message.subtype === 'bot_message') ||
        (!message.subtype && message.user === rtm.activeUserId) ||
        (message.channel == 'CDXD5S2KU' || message.channel == 'CDXD5S3T4') ) {
    return;
  }
  // Find the channel that sent the message. Since games will be played through DM, this should be fine
  // If the game is being played in a channel with multiple people, they will all control it.
  // Could be a fun way of doing co-op play :P
  var player = currentPlayers[message.channel];
  if (!player) {
    player = new Players.User(message.channel);
    currentPlayers[message.channel] = player;
  }

  if (player.currentGameID && player.state == "playingGame") {
    // Player is currently playing a game. Forward the message to the Interactive Fiction server
  
    console.log("message text: " + message.text)
    var actionText = JSON.stringify({
        "action": message.text
    });
    var options = {
      host: process.env.SERVER_ADDRESS,
      port: process.env.PORT,
      path: '/games/' + player.currentGameID + '/action',
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        'Content-Length': actionText.length
      }
    };
    console.log("forming request.")
    var req = http.request(options, function(res) {
      var responseString = "";
      
      res.on("data", function (data) {
        responseString += data;
      });
    
      res.on("end", function() {
        console.log("finished request. parsing response")
        console.log(responseString);
        gameResponse = JSON.parse(responseString);
        console.log(gameResponse);
        rtm.sendMessage(gameResponse.data, player.channelID)
        .then((s_res) => {
          // `res` contains information about the posted message
          console.log('Message sent: ', s_res.ts);
          req.end();
        })
        .catch(console.error);
        
      })
    });
    // refer to comment at the bottom and figure out how i wrote the data to the server. kthx.
    req.write(actionText);
    
  } else if (player.state == '') {
    // Player is not currently playing a game. Ask them which game to play
    var options = {
      host: process.env.SERVER_ADDRESS,
      port: process.env.PORT,
      path: '/titles',
      method: 'GET',
      headers: {
          accept: 'application/json'
      }
    };

    var req = http.request(options, function(res) {
      var responseString = "";
      
      res.on("data", function (data) {
        responseString += data;
      });
    
      res.on("end", function() {
        gamesList = JSON.parse(responseString);
        
        rtm.sendMessage('Please select a game to player: ' + JSON.stringify(gamesList), player.channelID)
        .then((s_res) => {
          // `res` contains information about the posted message
          console.log('Message sent: ', s_res.ts);
          player.state = 'selectingGame';
        })
        .catch(console.error);
      });
    });
    req.end();
  } else if (player.state == 'selectingGame') {
    console.log("message text: " + message.text)
    var gameSelection = JSON.stringify({
        "game": message.text,
        "label": "<@" + message.user + ">'s game of " + message.text
    });
    var options = {
      host: process.env.SERVER_ADDRESS,
      port: process.env.PORT,
      path: '/games',
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        'Content-Length': gameSelection.length
      }
    };
    console.log("forming request.")
    var req = http.request(options, function(res) {
      var responseString = "";
      
      res.on("data", function (data) {
        responseString += data;
      });
    
      res.on("end", function() {
        console.log("finished request. parsing response")
        console.log(responseString);
        gameInfo = JSON.parse(responseString);
        player.currentGameID = gameInfo.pid;
        player.savedGames.push(gameInfo.pid);
        console.log(gameInfo);
        player.state = "playingGame";
        rtm.sendMessage(gameInfo.data, player.channelID)
        .then((s_res) => {
          // `res` contains information about the posted message
          console.log('Message sent: ', s_res.ts);
          req.end();
        })
        .catch(console.error);
        
      })
    });
    // refer to comment at the bottom and figure out how i wrote the data to the server. kthx.
    req.write(gameSelection);
    

  } else {
    console.log("Invalid player state: " + player.state);
  }

  // Log the message
  console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
});

/*
const http = require("http");
const readline = require('readline');
var state = 'Start';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var options = {
  host: '192.168.5.129',
  port: 8080,
  path: '/titles',
  method: 'GET',
  headers: {
      accept: 'application/json'
  }
};

while (state != 'End') {
  if (state == 'Start') {
    state = "Waitings";
    var gamesList = '';
    var req = http.request(options, function(res) {
      var responseString = "";
      
      res.on("data", function (data) {
        responseString += data;
      });
    
      res.on("end", function() {
        gamesList = JSON.parse(data);
      });
    });
    req.end();
    console.log(gamesList);
    rl.question('Which game? ', (answer) => {

    });
        
  }
}




const data = JSON.stringify({
  "game": "zork1",
  "label": "zork game"
});

options.path = '/games'
options.method = 'POST'
options.headers = {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }


req = http.request(options, function(res) {
  var responseString = "";
  
  res.on("data", function (data) {
    responseString += data;
  });

  res.on("end", function() {
    console.log(responseString);
    
    req.end();
  })
});

req.write(data);
*/

process.on('SIGINT', function() {
  console.log('Shuting down...');
  process.exit();
});