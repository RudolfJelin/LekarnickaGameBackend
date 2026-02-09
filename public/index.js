const socket = io();

let log_p = document.getElementById('log');

// default page: show if a game is underway or not.
// state: NO GAME --> show HOST button
// state: GAME WAITING FOR PLAYERS --> show CONNECT button
// state: GAME UNDERWAY --> show ':('

// todo: move to common
function log(msg) {
    log_p.innerText += msg + "\n";
}

// any time the server sends something directly to this client, this code runs
socket.on('e_connected', async (socket_id) => {
    //  connection happened, server sent an "e_connected" event with no payload
    log('Connected to server, my socket id is ' + socket_id);
});


