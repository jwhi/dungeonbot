const { RTMClient } = require('@slack/client');
var env = require('node-env-file');
const http = require("http");
var fs = require('fs');
var Players = require('./User.js')
env(__dirname + '/.env', {raise: false});

var currentPlayers = {};

fs.readFile('playerFile.json', 'utf8', function readFileCallback(err, data){
  if (err){
      console.log(err);
  } else {
  currentPlayers = JSON.parse(data); //now it an object
  }
});

// The client is initialized and then started to get an active connection to the platform
const token = process.env.SLACK_TOKEN;
const rtm = new RTMClient(token);
rtm.start();

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
  if (message.text.length > 0 && message.text[0] == '!') {
    switch(message.text) {
      case '!newGame':
        player.state = '';
        console.log('newGame')
        break;
      case '!loadGame':
        player.state = 'loadGame';
        break;
      case '!resumeGame':
        player.state = 'playingGame';
        message.text = '';
      default:
        break;
    }
  }
  if (message.text.toUpperCase() == 'QUIT') {
    //player.savedGames.filter(saveFile => saveFile != player.currentGameID);
    player.currentGameID = '';
    player.state = '';
  }
  if (player.currentGameID && player.state == "playingGame" && message.text != '') {
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
  }  
  if (player.state == '') {
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
    

  }

  if (player.state == "loadGame") {
    // Get the list of current games
    var options = {
      host: process.env.SERVER_ADDRESS,
      port: process.env.PORT,
      path: '/games',
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
        /*
        [
          {"pid":7947,
          "name":"zork1",
          "zFile":"/home/jeremy/zmachine-api/src/../zcode/zork1.z5",
          "label":"zork game"}
        ]
        */
        var s_message = '';
        
        for (var i = 0; i < player.savedGames.length; i++) {
          var gameFile = gamesList.find(function(element) {return element.pid == player.savedGames[i]});
          console.log(gameFile)
          if(gameFile)
            s_message += gameFile.pid + ": " + gameFile.label + '\n';
        }
        if (s_message.length > 0) {
          rtm.sendMessage("Enter the id of the game you want to play:\n" + s_message, player.channelID)
          .then((s_res) => {
            // `res` contains information about the posted message
            console.log('Message sent: ', s_res.ts);
            player.state = 'loadingGame';
          })
          .catch(console.error);
        }
      });
    });
    req.end();
  }
  if (player.state == 'loadingGame') {
    var foundGame = player.savedGames.find(function(element) {return element == message.text});
    if (foundGame) {
      player.currentGameID = message.text;
      player.state = "playingGame";
    }
  }

  // Log the message
  console.log(`(channel:${message.channel}) ${message.user} says: ${message.text}`);
  fs.writeFileSync('playerFile.json', JSON.stringify(currentPlayers), 'utf8');
});

process.on('SIGINT', function() {
  console.log('Shuting down...');
  console.log('Saving players');0
  fs.writeFileSync('playerFile.json', JSON.stringify(currentPlayers), 'utf8');
  process.exit();
});