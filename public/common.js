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

function el(e){
    return document.getElementById(e);
}

function random_name(){
    return `Player${Math.floor(Math.random()*1000).toString().substring(0, 4)}`;
}

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


function quit(){
    window.location.href = "/";
}


// sends a state update request to the server
function request_state(socket){
    socket.emit("e_update");
}

function game_status_text(state){
    let game_phase = state.phase;
    let total_players = count_players(state);
    let total_hosts = count_players(state, client_host);

    let reply = "Stav hry: ";
    if (game_phase === game_none){
        reply += "Žádná hra neprobíhá.";
    }
    else if (game_phase === game_in_lobby){
        reply += "Čeká se na hráče. Můžeš se připojit.";
    }
    else if (game_phase === game_ingame){
        reply += "Hra probíhá, ale můžeš se ještě připojit.";
    }
    else if (game_phase === game_eval){
        reply += "Hra probíhá, vedoucí vyhodnocuje výsledky.";
    }
    else if (game_phase === game_post){
        reply += "Hra skončila, brzo se uvolní.";
    }
    else{
        reply += "ERROR?";
    }


    return reply + ` ${total_players} hráč(ů) / ${total_hosts} vedoucí(ch).`
}

function player_list_string(state){

    let ulInner = "";

    state.players.forEach((playerID) => {

        let user = state.player_data[playerID];

        if (user.client_type !== "client_player"){
            return; // skip
        }

        ulInner += `<li>${user.client_name} (${JSON.stringify(user)})</li>`;
    });

    return ulInner;
}

function host_results_string(results){

    let ulInner = "";

    results.forEach((item) => {
        ulInner += `<li><b>${item.item}</b> (${item.percent}%)</li>`;
    });

    return ulInner;
}

function count_players(state, client_type = client_player){
    return state.players.filter(id => state.player_data[id].client_type === client_type).length
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