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

// after a name has been selected, the player registers to the server
function on_name_selected(socket_id, my_name) {
    // debug show my name
    document.getElementById("my_name").innerText = `Moje jméno: ${my_name}`;

    // i should register me to the server
    socket.emit('e_first_update', client_type, my_name);
}

// successfully connected
socket.on('e_connected', async (socket_id) => {
    //  connection happened, server sent an "e_connected" event with no payload
    log('Connected to server, my socket id is ' + socket_id);

    // select a name
    let name = "";

    name = await swal("Zadej jméno:", {
        content: "input",
        button: "Přihlásit se",
        closeOnClickOutside: false,
        closeOnEsc: false,
    });

    while (name.trim().length < 3 || name.trim().length > 15) {
        name = await swal("Zadej jméno (3-15 znaků):", {
            content: "input",
            button: "Přihlásit se",
            closeOnClickOutside: false,
            closeOnEsc: false,
        });
    }

    on_name_selected(socket_id, name.trim());
});


socket.on('e_state', async (state) => {
    // server is sending me the new state

    if (state['phase'] !== old_known_phase) {
        update_phase(state['phase'], old_known_phase);
        old_known_phase = state['phase'];
    }

    update_player_list(state);
});

// new state recieved that differs from the previous one.
function update_phase(new_phase, old_phase) {
    if (new_phase === null){
        // undefined
        return;
    }

    all_phases.forEach(phase => {
        // console.log(all_phases, typeof all_phases, new_phase, typeof new_phase)
        // console.log(phase, typeof phase, new_phase);
        document.getElementById(phase).style.display = (new_phase !== phase) ? "none" : "block";
    });

    // phase-specific behavior

    if (new_phase === game_post){
        // game ended --> disconnect to prevent getting unwanted updates
        socket.disconnect();
    }

    if (new_phase === game_eval){
        // selection phase ended
    }
}

function quit(){
    window.location.href = "/";
}


