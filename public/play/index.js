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

let items_data = [];
let search_query = "";
let filter_only_selected = false;



// render new player data
function update_player_list(state) {
    el("game_in_lobby_p_2").innerText = `Hráčů připojeno: ${count_players(state)}`

    let ul = el("lobby_list");
    ul.innerHTML = player_list_string(state, false, socket.id);

}

// after a name has been selected, the player registers to the server
function on_name_selected(socket_id, my_name) {
    // debug show my name
    el("my_name").innerHTML = `Jsi přihlášen jako: <i>${my_name}</i>`;

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
    items_data = [];

    // populate list
    let i = 0;
    items.forEach((item) => {

        // spawn an element
        let article = `<article class="player-article" id="generated-article-${i}">
            <p id="generated-p-${i}">${item}</p>
            <input type="checkbox" class="player-article-toggle" id="generated-toggle-${i}" onchange="toggleCheckbox(this, ${i})" >
        </article>
        `

        article_container.innerHTML += article;

        // keep track
        items_data.push({
            "id": i,
            "item": item,
            "article_id":`generated-article-${i}`,
            "checkbox_id": `generated-toggle-${i}`,
            "p": `generated-p-${i}`,
            "selected": false
        });

        i++;
    });

    // trigger a cleanup (BIG one, just to be EXTRA sure)
    resetSearch();
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

// a checkbox has been toggled
function toggleCheckbox(checkbox, i){
    // handle checkbox checking
    let is_checked = checkbox.checked;
    // console.log(checkbox, i, "clicked, now ", is_checked);

    // style the article
    items_data[i].selected = is_checked;
    el(items_data[i].article_id).style.backgroundColor = is_checked ? "#b0ff8e" : "lightgray";

    // trigger redraw
    filter_shown_items();
}

// the search message has changed
function onSearchEdit(new_query)
{
    console.log("new_query", new_query);

    // remember new status
    search_query = new_query; // ?

    // and retrigger search
    // hide elements that do not correspond, show the rest
    filter_shown_items();
}

// "only selected" toggle
function toggleSelectedOnly(checkbox) {

    // remember new status
    filter_only_selected = checkbox.checked;

    // and retrigger search
    // hide elements that do not correspond, show the rest
    filter_shown_items(); // ???

}

function matches_search_query(item_name, query){
    if (query === "") {
        return true;
    }

    if (item_name.includes(query)) {
        return true;
    }

    // TODO other, fuzzier string matches...

    return false;
}

// trigger this when some input parameter changed
function filter_shown_items(){

    let total = 0;
    let total_visible = 0;
    let total_selected = 0;
    let total_selected_and_visible = 0;

    items_data.forEach(item => {
       // for each item:

        // decide whether to show it
        let show_it = true;

        if (filter_only_selected && item.selected === false){
            show_it = false;
        }

        if (!matches_search_query(item.item, search_query)){
            show_it = false;
        }

        // calculate variables
        if (true) { total++; }
        if (show_it){ total_visible++; }
        if (item.selected){ total_selected++; }
        if (show_it && item.selected){ total_selected_and_visible++; }

        // update visibility
        el(item.article_id).style.display = show_it ? "grid" : "none";
    });

    // update status text
    // noinspection UnnecessaryLocalVariableJS
    let status_text = `Zobrazeno ${total_visible} z ${total} položek celkem,\n`
     + `(${total_selected_and_visible} z ${total_selected} vybraných položek)`;

    el("player-status-bar").innerText = status_text;

}

// trigger this when all search parameters should be reset, and the visibility too.
function resetSearch(){
    filter_only_selected = false;
    search_query = "";

    // and now, match reality
    el("only-selected-toggle").checked = false;
    el("player-input-search").value = "";

    filter_shown_items();
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

        // selection logic: extract all selected
        let result = items_data.filter(item => item.selected === true).map(item => {return item.item});

        console.log(JSON.stringify(result), items_data);

        socket.emit("e_selected_items", result);
    }

    else if (new_phase === game_ingame){
        resetSearch(); // trigger a cleanup possibly
        socket.emit("e_requested_item_list");
    }
}

