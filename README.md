# dungeonbot
Slack bot that interacts with z-machine api (https://github.com/opendns/zmachine-api)

This project was done over the course of a few days as a break from school projects.
This means that there is very minimal error checking, but the bot has all the functionality I wanted when I started the project.

# Setup
Follow z-machine api documentation to get the game server running. I ran the server on an Ubuntu Server VM.
Create .env file that include the slack app token and the IP address/port for the z-machine server
After environment variables are assigned, run DungeonBot: node index.js

The channel identifiers for 'General' and 'Random' for my slack team is hard coded, update/add to these if you want to restrict where the bot lets game happen 

# Chatting with the bot
Send any message to DungeonBot app as a direct message
Bot will responsd with all the games installed in the z-machine api game folder
Send a message with the zFile filename without the extension e.g. zork1
The bot will respond with the starting text from the game and all messages from this point forward are directed to the game and the bot will respond with the game's response.

# Bot Commands
!newGame - Allows user to start a new game
!loadGame - Displays the pid for all games running on z-machine server that were created from you user name. Enter the pid to return to a running game. This list is deleted once the z-machine server is shut down. Games need to be saved using the default commands in game which create a save file on disk that is accessible to all users if they know the name of the save file.
!resumeGame - Used to exit newGame and loadGame dialogue. Bot goes back to directing messages to the currently running game
