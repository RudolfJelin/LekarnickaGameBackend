// init

const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const fs = require('fs')

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

const item_right = "item_right";
const item_conditional = "item_conditional";
const item_optional = "item_optional";
const item_wrong = "item_wrong";
const item_undeclared = "item_undeclared";

const all_phases = [game_none, game_in_lobby, game_ingame, game_eval, game_post];

const default_game_len_seconds = 10;

// each item has one main name and can have several "/"-delimited variations in the name
// const items = ["obvaz", "ibuprofen", "nůžky", "aktivní uhlí/živočišné uhlí"]
const items = load_first_aid_items(); // TODO verify

const default_state = {
    "phase": game_none,
    "timer": -1,
    "players": [], // list of player IDs
    "player_data": {}, // actual player data
    "game_results_calculated": false,
    "game_results": [], // for each item: name, %, right/conditional/optional/wrong/undeclared
    "stats": {}
}

let state = copy(default_state);

let state_old = "";

// somehow, it has come to this
function copy(object) {
    return JSON.parse(JSON.stringify(object));
}

function load_first_aid_items(){

    // load and split into lines
    const string = fs.readFileSync('./lekarnicka_test.txt', 'utf8').split(/\r?\n/)

    // console.log("string", string);

    // filter out comments and empty lines
    let result = string.filter(line => {
        // console.log(line, line[0])
        if (line === undefined || line.length === 0){
            return false;
        }

        line = line.trim();

        if (line[0] === '#') {
            return false;
        }

        if (line.trim().length <= 1){
            return false;
        }

        return true;
    });

    // trim results
    result = result.map(s => s.trim());

    return result;
}

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

function is_player(id){
    if (!state.players.includes(id)){
        console.error("Testing for nonexistent player??");
        return false;
    }

    // console.log("testing if is player:", id, JSON.stringify(state.players), state.players[id]);
    return state.player_data[id].client_type === client_player;
}

// this function resets the server as if it was just restarted (fr fr)
// todo in future: reset loaded list of items as well, as host may be able to modify it
function reset_all(dont_update = false){
    state = copy(default_state);

    if (!dont_update){
        update_state_for_all(true);
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
    let player_ids = state.players.filter(id => is_player(id));
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
            "declared": item_undeclared
        });
    })

    // TODO sort array
    state.game_results.sort((a, b) => parseFloat(b.percent) - parseFloat(a.percent));

    state.game_results_calculated = true;

    // data changed --> update all at the end.
    update_state_for_all();

    // notify all
    io.emit("e_game_stats_calculated", state.game_results);
}


// post game statistics

function count_players(client_type = client_player){
    return state.players.filter(id => state.player_data[id].client_type === client_type).length
}

function calculate_post_game_statistics(){
    // save statistics into State
    // we can work with:
    // list of things players chose: state.players --> state.player_data[id].selected_items is a list of selected items
    // list of evaluations: state.game_results is a list of {item, percent, declared (as what)}

    // global accuracy as proof of concept

    let stats = {};
    let item_count = state.game_results.length;

    // count how many items of each category
    let right_count = state.game_results.filter(item => (item.declared === item_right)).length;
    let conditional_count = state.game_results.filter(item => (item.declared === item_conditional)).length;
    let optional_count = state.game_results.filter(item => (item.declared === item_optional)).length;
    let wrong_undeclared_count = state.game_results.filter(item => (item.declared === item_undeclared || item.declared === item_wrong)).length;


    // how many % on average across these items
    stats.correct_score = 0;
    stats.conditional_score = 0;
    stats.optional_score = 0;
    stats.wrong_score = 0;

    state.game_results.forEach(item => {
        switch (item.declared) {
            case item_right:
                stats.correct_score += item.percent / right_count;
                break;
            case item_conditional:
                stats.conditional_score += item.percent / conditional_count;
                break;
            case item_optional:
                stats.optional_score += item.percent / optional_count;
                break;
            case item_wrong:
            case item_undeclared:
                stats.wrong_score += item.percent / wrong_undeclared_count;
                break;
        }
    });

    // tackle zero division
    if (isNaN(stats.correct_score)){stats.correct_score = 100;}
    if (isNaN(stats.conditional_score)){stats.conditional_score = 100;}
    if (isNaN(stats.optional_score)){stats.optional_score = 100;}
    if (isNaN(stats.wrong_score)){stats.wrong_score = 100;}

    // overall score (optional has zero weight, cond has half weight)
    stats.final_score = (stats.correct_score + stats.conditional_score / 2 + (100 - stats.wrong_score)) / 2.5;

    state.stats = stats;

    // total.items_x_players = count_players(state, client_player) * items.length;
    //
    // total.selected_right = 0;
    // total.unselected_right = 0;
    // total.selected_conditional = 0;
    // total.unselected_conditional = 0;
    // total.selected_optional = 0;
    // total.unselected_optional = 0;
    // total.selected_wrong = 0;
    // total.unselected_wrong = 0;
    //
    // // iterate over all items
    // state.player_data.game_results
    //
    //
    //
    // total.selected = total.selected_right + total.selected_conditional + total.selected_optional + total.unselected_wrong;
    // total.unselected = total.unselected_right + total.unselected_conditional + total.unselected_optional + total.unselected_wrong;
    // total.right = total.selected_right + total.unselected_right;
    // total.conditional = total.selected_conditional + total.unselected_conditional;
    // total.optional = total.selected_optional + total.unselected_optional;
    // total.wrong = total.selected_wrong + total.unselected_wrong;

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

        // disallow multiple hosts IF HOST
        if (client_type === client_host && state.players.some((id) => {return state.player_data[id].client_type === client_host})){
            socket.emit('e_sorry_already_exists_host');
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
        // at phase of MAIN GAME: send information about options to choose from
        // if (new_phase === game_ingame){
        // MOVED to separate request
        // }
        if (new_phase === game_none){
            // game ended completely. Game over. Reset self.
            reset_all(true);
        }

        // update state and let everyone know
        state.phase = new_phase;
        update_state_for_all();

    });

    socket.on("e_requested_item_list", ()=>{
        io.emit("e_list_of_items", items); // raw items
    });

    socket.on("e_selected_items", (selected_items) => {

        // console.log("selected items", JSON.stringify(selected_items));

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

    socket.on("e_admin_reset", ()=>{
        // reset and update
        reset_all();
        io.emit("e_sorry_game_was_cancelled_by_force");
    });

    socket.on("e_host_finished_evaluation", (results)=>{
       // save results, change phase, send to all.
       //  console.log("results", JSON.stringify(results));

        state.game_results = results;


        // WAIT! I NOW HAVE ALL THE INFORMATION ABOUT EVERYONE WHATSOEVER
        calculate_post_game_statistics();

        state.phase = game_post;
        update_state_for_all();


    });
});


app.use(express.static('public'));

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});








