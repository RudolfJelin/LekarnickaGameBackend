// admin
// has all the controls and info

const socket = io();
const client_type = "client_menu";

let state_p = document.getElementById('state');

// any time the server sends something directly to this client, this code runs
socket.on('e_connected', async (socket_id) => {
    //  connection happened, server sent an "e_connected" event with no payload
    log('Connected to server, my socket id is ' + socket_id);

    // i should register me to the server
    socket.emit('e_first_update', client_type);
});

socket.on('e_state', async (state) => {
    // server is sending me the new state
    state_p.innerText = JSON.stringify(state, null, 2);
})


