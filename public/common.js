const game_none = "game_none";
const game_in_lobby = "game_in_lobby";
const game_ingame = "game_ingame";
const game_eval = "game_eval";
const game_post = "game_post";

const all_phases = [game_none, game_in_lobby, game_ingame, game_eval, game_post];

const client_host = "client_host";
const client_player = "client_player";
const client_admin = "client_admin";
const client_menu = "client_menu";

// log (logs logs)
function log(msg) {

    let log_p = document.getElementById('log');
    if (typeof log_p !== 'undefined' && log_p !== null) {
        log_p.innerText += msg + "\n";
    }
    else{
        //console.log(msg);
    }
}

// sends a state update request to the server
function request_state(socket){
    socket.emit("e_update");
}

function game_status_text(game_state){
    let reply = "";
    if (game_state === game_none){
        reply += "Žádná hra neprobíhá.";
    }
    else if (game_state === game_in_lobby){
        reply += "Hra: čeká se na hráče.";
    }
    else if (game_state === game_ingame){
        reply += "Hra: hra probíhá.";
    }
    else if (game_state === game_eval){
        reply += "Hra: hra probíhá.";
    }
    else if (game_state === game_post){
        reply += "Hra: hra skončila, brzo se uvolní.";
    }
    else{
        reply += "ERROR?";
    }


    return reply + ` (${game_state})`
}

function player_list_string(state){

    let ulInner = "";

    state.players.forEach((playerID) => {
        ulInner += `<li>${playerID} (${state.player_data[playerID]})</li>`;
    });

    return ulInner;
}

