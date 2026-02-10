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
const client_host = "client_host";
const client_player = "client_player";
const client_admin = "client_admin";
const client_menu = "client_menu";

const all_phases = [game_none, game_in_lobby, game_ingame, game_eval, game_post];

const default_game_len_seconds = 10;

let state = {
    "phase": game_none,
    "timer": -1,
    "players": [], // list of player IDs
    "player_data": {} // actual player data
}

let state_old = "";

function previous_phase(phase){
    switch(phase){
        case game_in_lobby:
            return game_none;
        case game_ingame:
            return game_in_lobby;
        case game_eval:
            return game_ingame;
        case game_post:
            return game_eval;
        case game_none:
            return game_post;
        default:
            // TODO
            return game_none;
    }
}

// send state to everyone (including self(?) but whatever)
// call this every time state is changed.
function update_state_for_all(force_update = false){

    if (JSON.stringify(state) === state_old && force_update !== true){
        // do nothing, because nothing changed
        return;
    }

    console.log(`Sending state to everyone... ${JSON.stringify(state)}`);
    io.emit("e_state", state);

    // save a snapshot. DON'T send to all if same.
    state_old = JSON.stringify(state);
}

// send state to the socket
function update_state_for_one(socket){
    console.log(`User ${socket.id} requested state`);
    socket.emit("e_state", state);
}


// connection code

// this code runs for each socket(host user or player user) separately
io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    // send an "e_connected" message to the user that connected
    socket.emit('e_connected', socket.id);

    // log a disconnection of the user
    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);

        // todo: remove from State
    });

    socket.on('e_update', () => {
        // a client requested a state update
        update_state_for_one(socket);
    });

    socket.on('e_first_update', (client_type) => {
        // a new client has appeared (player or host)

        // sanity check
        if (state['player_data'][socket.id] !== undefined) {
            console.error("New client has ID that already exists. Check for duplicate sending?");
            return;
        }

        // add to state if not exists
        state["player_data"][socket.id] = {"client_type": client_type};

        // add to player list if player list
        state['players'].push(socket.id);

        // then update if changed
        update_state_for_all();
    });

    socket.on('e_host_req_next_phase', (new_phase) => {
        // host has requested to move up the phase

        if (state.phase === new_phase){
            console.error("Host requested phase change, but already in this phase.")
            return;
        }

        if (state.phase !== previous_phase(new_phase)){
            console.error("Host requested different phase change than allowed.")
            return;
        }
        // phase change is natural, going to the n+1th phase

        // TODO here: sometimes there will be some associated game logic to evaluate BEFORE moving on

        // update state and let everyone know

        state.phase = new_phase;
        update_state_for_all();

    });


});


app.use(express.static('public'));

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});




