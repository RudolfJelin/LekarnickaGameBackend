// design: move through phases
// start with just a "next phase" button.
//


const socket = io();
const client_type = "client_host";
let old_known_phase = null;


// render new player data
function update_player_list(state) {
    el("lobby_host_p_2").innerText = `Hráčů připojeno: ${count_players(state)}`

    let ul = el("player_list_host");
    ul.innerHTML = player_list_string(state);

}

// any time the server sends something directly to this client, this code runs
socket.on('e_connected', async (socket_id) => {
    //  connection happened, server sent an "e_connected" event with no payload
    log('Connected to server, my socket id is ' + socket_id);

    // just ask for info to show
    socket.emit('e_first_update', client_type, "host");
});

socket.on('e_state', async (state) => {
    // server is sending me the new state

    if (state['phase'] !== old_known_phase) {
        update_phase(state['phase'], old_known_phase);
        old_known_phase = state['phase'];
    }

    // console.log("updateing player list. ", state.players)
    update_player_list(state);

    // dont allow starting game with no players
    el("start_game_b").disabled = count_players(state) === 0;
    el("start_game_b").innerText = count_players(state) === 0 ? "Pro spuštění musí být aspoň 1 hráč" : "Začít hru";

    // double check if need to show post-game/pre-eval stats
    if (state.phase === game_eval && state.game_results_calculated){
        show_player_response_results(state.game_results)
    }
});

function show_player_response_results(game_results_copy) {
    // check if is in right phase
    if (old_known_phase !== game_eval) {
        console.error("Recieved evaluation command, but not in evaluation phase!");
        return;
    }

    // show debug text
    el("mock_eval_p").innerText = `Výsledky: ${JSON.stringify(game_results_copy)}`

    // show debug list
    el("result_eval_ul").innerHTML = host_results_string(game_results_copy);
}

// called when server finishes calculating most selected items
socket.on('e_game_stats_calculated', (game_results_copy)=>{
    show_player_response_results(game_results_copy);
});

socket.on('e_sorry_already_exists_host', async ()=>{
    await swal({
        title: "Nejde to :(",
        text: "Někdo už tu je jako vedoucí hry",
        icon: "error",
        button: "Odejít",
        closeOnClickOutside: true,
        closeOnEsc: true
    });

    // quit to menu just to be sure
    quit();
});

socket.on('e_sorry_game_was_cancelled_by_force', async () => {
    await swal({
        title: "Hra byla zrušena :(",
        text: "Admin nebo error shodili hru",
        icon: "error",
        button: "Odejít",
        closeOnClickOutside: true,
        closeOnEsc: true
    });

    // quit to menu just to be sure
    quit();
})

// new state recieved that differs from the previous one. Do something about it
function update_phase(new_phase, old_phase) {
    if (new_phase === null){
        // undefined
        return;
    }

    all_phases.forEach(phase => {
        // console.log(all_phases, typeof all_phases, new_phase, typeof new_phase)
        // console.log(phase, typeof phase, new_phase);
        el(phase).style.display = (new_phase !== phase) ? "none" : "block";
    });


    // explicitly request evaluation data if in eval phase
    if (new_phase === game_eval){
        socket.emit('e_update');
    }

}

function newGameAsHost(){
    // host wants to create a lobby for the game to be in

    // send request to server
    // hope for the best
    socket.emit('e_host_req_next_phase', game_in_lobby);
}

function startGameAsHost(){
    // host wants to move the lobby into the main game

    socket.emit('e_host_req_next_phase', game_ingame);

}

function moveToEvalAsHost(){
    socket.emit('e_host_req_next_phase', game_eval);
}

function endGameAsHost(){
    socket.emit('e_host_req_next_phase', game_post);
}

function returnToBeginning(){
    socket.emit('e_host_req_next_phase', game_none);
    window.location.href = "/";
}

function cancelGame(){
    socket.emit("e_admin_reset");
    quit();
}


