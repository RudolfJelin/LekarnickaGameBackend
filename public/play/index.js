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

const min_name_length = -1; // TODO: 3
const max_name_length = 16;

function el(e){
    return document.getElementById(e);
}

function random_name(){
    return `Player${Math.floor(Math.random()*1000).toString().substring(0, 4)}`;
}

// render new player data
function update_player_list(state) {
    el("game_in_lobby_p_2").innerText = `Hráčů připojeno: ${count_players(state)}`

    let ul = el("lobby_list");
    ul.innerHTML = player_list_string(state);

}

// after a name has been selected, the player registers to the server
function on_name_selected(socket_id, my_name) {
    // debug show my name
    el("my_name").innerText = `Moje jméno: ${my_name}`;

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

    while (name.trim().length < min_name_length || name.trim().length > max_name_length) {
        name = await swal(`Zadej jméno (${min_name_length}-${max_name_length} znaků):`, {
            content: "input",
            button: "Přihlásit se",
            closeOnClickOutside: false,
            closeOnEsc: false,
        });
    }

    if (name.length < 1) {
        name = random_name();
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

socket.on("e_list_of_items", (items) => {

    // clear list of items
    let article_container = el("article-container");
    article_container.innerHTML = "";

    // populate list
    let i = 0;
    items.forEach((item) => {
        i++;

        // spawn an element
        let article = `<article class="player-article" id="generated-article-${i}">
            <p id="generated-p-${i}">${item}</p>
            <input type="checkbox" class="player-article-toggle" id="generated-toggle-${i}" onchange="toggleCheckbox(this, ${i})" >
        </article>
        `

        article_container.innerHTML += article;

    });


});

function toggleCheckbox(checkbox, i){
    // handle checkbox checking
    let is_checked = checkbox.checked;
    console.log(checkbox, i, "clicked, now ", is_checked);
}


// new state recieved that differs from the previous one.
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

    // phase-specific behavior

    if (new_phase === game_post){
        // game ended --> disconnect to prevent getting unwanted updates
        socket.disconnect();
    }

    else if (new_phase === game_eval){
        // selection phase ended --> upload all my data to server. Server will then process all the data.

        // TODO actual selection logic
        socket.emit("e_selected_items", ["obvaz"]);
    }

    else if (new_phase === game_ingame){
        socket.emit("e_requested_item_list");
    }
}

function quit(){
    window.location.href = "/";
}


