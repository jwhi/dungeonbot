class User {
    constructor(dmChannelID) {
        this.channelID = dmChannelID;
        this.savedGames = [];
        this.currentGameID;
        this.state = '';
    }
}

class Games {
    constructor(gameID) {
        this.pid = gameID;
    }
}

module.exports = {User, Games};