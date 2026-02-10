// design: move through phases
// start with just a "next phase" button.
//


const socket = io();
const client_type = "client_host";
let old_known_phase = null;

// any time the server sends something directly to this client, this code runs
socket.on('e_connected', async (socket_id) => {
    //  connection happened, server sent an "e_connected" event with no payload
    log('Connected to server, my socket id is ' + socket_id);

    // just ask for info to show
    socket.emit('e_update', client_type);
});

socket.on('e_state', async (state) => {
    // server is sending me the new state

    if (state['phase'] !== old_known_phase) {
        update_phase(state['phase']);
        old_known_phase = state['phase'];
    }
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

function newGameAsHost(){
    // host wants to create a lobby for the game to be in

    // send request to server
    // hope for the best
    socket.emit('e_host_wants_new_game');
}
