// init

const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

// state
const game_none = "game_none";
const game_in_lobby = "game_in_lobby";
const game_ingame = "game_ingame";
const game_eval = "game_eval";
const game_post = "game_post";
const default_game_len_seconds = "10";

let state = {
    "phase": game_none,
    "timer": -1
}


// connection code

// this code runs for each socket(host user or player user) separately
io.on('connection', (socket) => {
    console.log('a user connected');

    // send an "e_connected" message to the user that connected
    socket.emit('e_connected', socket.id);

    // log a disconnection of the user
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('e_update', () => {
       // a client requested a state update
    });
});


app.use(express.static('public'));

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});




