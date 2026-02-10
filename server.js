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

const items = ["obvaz", "ibuprofen", "nůžky"]

let state = {
    "phase": game_none,
    "timer": -1,
    "players": [], // list of player IDs
    "player_data": {}, // actual player data
    "game_results": [] // for each item: name, %, right/conditional/optional/wrong/undeclared
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

    console.log(`Sending state to everyone... `);
    io.emit("e_state", state);

    // save a snapshot. DON'T send to all if same.
    state_old = JSON.stringify(state);
}

// send state to the socket
function update_state_for_one(socket){
    console.log(`User ${socket.id} requested state`);
    socket.emit("e_state", state);
}


function delete_player(socket) {
    //remove from State
    delete state.player_data[socket.id];
    state.players = state.players.filter(e => e !== socket.id);

    // update all
    update_state_for_all();
}

// this is called when host triggers end of main game phase and start of evaluation phase and all players have submitted their shit
function onAllPlayersSubmittedSelections() {
    // double-check if everyone submitted, if not, fill in blanks
    state.players.forEach((id) => {
       if (!("selected_items" in state.player_data[id])){
           state.player_data[id].selected_items = [];
       }
    });

    // number of players
    let player_ids = state.players.filter(id => state.player_data[id].client_type === client_player);
    let num_players = player_ids.length;

    state.game_results = [];

    // do the calculations
    items.forEach((item) => {
        // for each item, calculate its %
        let count = player_ids.filter(id => {
            return state.player_data[id].selected_items.includes(item);
        }).length;


        // ...[for each item: name, %, right/conditional/optional/wrong/undeclared]
        state.game_results.push({
            "item": item,
            "percent": (count * 100.0 / num_players),
            "declared": "undeclared"
        });
    })

    // TODO sort array
    state.game_results.sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));


    // data changed --> update all at the end.
    update_state_for_all();

    io.emit("e_game_stats_calculated", state.game_results);
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

        delete_player(socket);
    });

    socket.on('e_update', () => {
        // a client requested a state update
        update_state_for_one(socket);
    });

    socket.on('e_first_update', (client_type, client_name) => {
        // a new client has appeared (player or host)

        // sanity check
        if (state['player_data'][socket.id] !== undefined) {
            console.error("New client has ID that already exists. Check for duplicate sending?");
            return;
        }

        // add to state if not exists
        state["player_data"][socket.id] = {"client_type": client_type, "client_name": client_name};

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

    socket.on("e_selected_items", (selected_items) => {

        // check if player exists
        if (!(socket.id in state.player_data)){
            // player doesn't exist??
            console.error(`Nonexistent player sent their data? ${socket.id} ${selected_items}`);
        }

        // register selected items
        state.player_data[socket.id]['selected_items'] = selected_items;


        // if all players have registered, go to evaluation phase
        // TODO
        if (state.players.every((player) =>{
            return state.player_data[player].client_type === client_host || ('selected_items' in state.player_data[player]);
        })){
            // go to eval
            onAllPlayersSubmittedSelections();
        }

    });

    socket.on("e_host_forces_evaluation", ()=>{
        // prevents weird states where one client didnt sent anything and blocks evaluation
        // TODO implement on the client side
        onAllPlayersSubmittedSelections();
    });
});


app.use(express.static('public'));

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});




