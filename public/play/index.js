// design:
//
// setup to only show the html for the phase currently in
// dont forget to disconnect after game ends!

// design: move through phases
// start with just a "next phase" button.
//


const socket = io();
const client_type = "client_player";
let old_known_phase = null;


// render new player data
function update_player_list(state) {
    document.getElementById("game_in_lobby_p_2").innerText = `Hráčů připojeno: ${count_players(state)}`

    let ul = document.getElementById("lobby_list");
    ul.innerHTML = player_list_string(state);

}

// any time the server sends something directly to this client, this code runs
socket.on('e_connected', async (socket_id) => {
    //  connection happened, server sent an "e_connected" event with no payload
    log('Connected to server, my socket id is ' + socket_id);

    // debug show my name
    document.getElementById("my_name").innerText = `Moje jméno: ${socket_id}`;

    // i should register me to the server
    socket.emit('e_first_update', client_type);
});


socket.on('e_state', async (state) => {
    // server is sending me the new state

    if (state['phase'] !== old_known_phase) {
        update_phase(state['phase']);
        old_known_phase = state['phase'];
    }

    update_player_list(state);
});

// new state recieved that differs from the previous one.
function update_phase(new_phase) {
    if (new_phase === null){
        // undefined
        return;
    }

    all_phases.forEach(phase => {
        // console.log(all_phases, typeof all_phases, new_phase, typeof new_phase)
        // console.log(phase, typeof phase, new_phase);
        document.getElementById(phase).style.display = (new_phase !== phase) ? "none" : "block";
    });
}

function quit(){
    window.location.href = "/";
}


