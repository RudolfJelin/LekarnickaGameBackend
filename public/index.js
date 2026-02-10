
// default page:
// show if a game is underway or not.
// state: NO GAME --> show HOST button
// state: GAME WAITING FOR PLAYERS --> show CONNECT button
// state: GAME UNDERWAY --> show ':('


const socket = io();
const client_type = "client_menu";

let state_p = document.getElementById('state');
let player_button = document.getElementById('asPlayer');
let host_button = document.getElementById('asHost');
let status_p = document.getElementById('status_sentence');

// any time the server sends something directly to this client, this code runs
socket.on('e_connected', async (socket_id) => {
    //  connection happened, server sent an "e_connected" event with no payload
    log('Connected to server, my socket id is ' + socket_id);

    // just ask for info to show
    socket.emit('e_update', client_type);
});

socket.on('e_state', async (state) => {
    // server is sending me the new state
    state_p.innerText = JSON.stringify(state, null, 2);

    // update status
    status_p.innerText = game_status_text(state.phase);

    player_button.disabled  = !(state["phase"] === game_in_lobby);
    host_button.disabled  = !(state["phase"] === game_none);
});

function playAsPlayer(){
    window.location.href = "/play";
}

function playAsHost(){
    window.location.href = "/host";
}

