// design: move through phases
// start with just a "next phase" button.
//


const socket = io();
const client_type = "client_host";
let old_known_phase = null;

let items_data = [];

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

    // update stats
    if (state.phase === game_post){

        let stats = state.stats;
        // let stats_ul = el("postgame_host_ul");



        el("correct_score").innerText = `Správné předměty označny: ${stats.correct_score}%`;
        el("conditional_score").innerText = `Situační předměty označny: ${stats.conditional_score}%`;
        el("optional_score").innerText = `Volitelné předměty označny: ${stats.optional_score}%`;
        el("wrong_score").innerText = `Nesprávné předměty označny: ${stats.wrong_score}%`;

        el("postgame_host_p_2").innerText = `Vaše skóre: ${stats.final_score}`

    }
});

// called when server finishes calculating most selected items
socket.on('e_game_stats_calculated', (game_results_copy)=> {
    show_player_response_results(game_results_copy);
});

socket.on('e_sorry_already_exists_host', async ()=> {
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

// host ends selection phase, moves to evaluation
function moveToEvalAsHost(){
    socket.emit('e_host_req_next_phase', game_eval);
}

// host ends evaluation phase
function endGameAsHost(){
    // socket.emit('e_host_req_next_phase', game_post);

    let result = items_data.map(item => {return item.item});

    // send result back
    socket.emit("e_host_finished_evaluation", result);
}

function returnToBeginning(){
    socket.emit('e_host_req_next_phase', game_none);
    window.location.href = "/";
}

function cancelGame(){
    socket.emit("e_admin_reset");
    quit();
}


// evaluation logic



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

    // now, for the real shit
    // generate elements

    let article_container = el("article-container");
    article_container.innerHTML = "";
    items_data = [];

    // populate list
    let i = 0;
    game_results_copy.forEach((item) => {

        // spawn an element
        let article = `
            <article class="host-article" id="generated-article-${i}">
                <p>${item.percent}%</p>
                <label for="generated-toggle-${i}" class="generated-toggle-label"><p>${item.item}</p></label>
                
                <div>
                    <div id="generated-options-${i}" class="div-options-buttons">
                        <button id="generated-button-correct-${i}" onclick="onEvaluationButton(this, ${i}, item_right)">Nutný obsah ✅️️</button>
                        <button id="generated-button-situational-${i}" onclick="onEvaluationButton(this, ${i}, item_conditional)">Podle situace 🧐</button>
                        <button id="generated-button-optional-${i}" onclick="onEvaluationButton(this, ${i}, item_optional)">Zvažte nebrat ⚖️</button>
                        <button id="generated-button-wrong-${i}" onclick="onEvaluationButton(this, ${i}, item_wrong)">Ne ❌️</button>
                    </div>
                    
                    <div id="generated-deselect-div-${i}" class="div-deselect-button">
                        <button id="generated-button-deselect-${i}" onclick="onEvaluationButton(this, ${i}, item_undeclared)">Zrušit označení</button>
                    </div>
                </div>
            </article>
        `

        article_container.innerHTML += article;

        // keep track
        items_data.push({
            "id": i,
            "item": item,

            "article-id": `generated-article-${i}`,

            "correct-id": `generated-button-correct-${i}`,
            "situational-id": `generated-button-situational-${i}`,
            "optional-id": `generated-button-optional-${i}`,
            "wrong-id": `generated-button-wrong-${i}`,
            "deselect-id": `generated-button-deselect-${i}`,

            "options-div-id": `generated-options-${i}`,
            "deselect-div-id": `generated-deselect-div-${i}`,
        });

        i++;
    });


    // trigger a cleanup (BIG one, just to be EXTRA sure)
    resetSearch();
}

// resets all buttons, including the ones in articles, to default state
function resetSearch(){
    // TODO: reset all buttons and checkbox panel

    // reset checkbox panel (todo)
    // options visible and reset option invisible

    // effectively, shows all items
    filter_shown_items();
}

// filters all shown items
function filter_shown_items(){
    items_data.forEach(item => {
        // for each item:

        // decide whether to show it
        let show_it = true;

        // TODO: filter
        // if (filter_only_selected && item.selected === false){
        //     show_it = false;
        // }

        // // calculate variables
        // if (true) { total++; }
        // if (show_it){ total_visible++; }
        // if (item.selected){ total_selected++; }
        // if (show_it && item.selected){ total_selected_and_visible++; }

        // update visibility
        el(item["article-id"]).style.display = show_it ? "grid" : "none";
    });

    // update status text
    // // noinspection UnnecessaryLocalVariableJS
    // let status_text = `Zobrazeno ${total_visible} z ${total} položek celkem,\n`
    //     + `(${total_selected_and_visible} z ${total_selected} vybraných položek)`;
    //
    // el("player-status-bar").innerText = status_text;

}

// a checkbox has been toggled
function onEvaluationButton(button, i, option){

    // save the new information
    items_data[i].item.declared = option;


    // style

    let item_data = items_data[i];
    let item_article = el(items_data[i]['article-id']);

    // style the article

    switch(option){
        case item_undeclared:
            item_article.style.backgroundColor = "lightgray";
            item_article.style.borderColor = "#000000";
            item_article.style.borderStyle = "solid";
            item_article.style.borderWidth = "0";
            break;
        case item_right:
            item_article.style.backgroundColor = "#b0ff8e";
            item_article.style.borderColor = "#127700";
            item_article.style.borderStyle = "solid";
            item_article.style.borderWidth = "2px";
            break;
        case item_conditional:
            item_article.style.backgroundColor = "#c8eab8";
            item_article.style.borderColor = "#3d7700";
            item_article.style.borderStyle = "dashed";
            item_article.style.borderWidth = "2px";
            break;
        case item_optional:
            item_article.style.backgroundColor = "#ffbd8e";
            item_article.style.borderColor = "#773f00";
            item_article.style.borderStyle = "solid";
            item_article.style.borderWidth = "2px";
            break;
        case item_wrong:
            item_article.style.backgroundColor = "#ff8e8e";
            item_article.style.borderColor = "#770000";
            item_article.style.borderStyle = "solid";
            item_article.style.borderWidth = "2px";
            break;
    }


    // trigger redraw: TODO this is not needed right?
    filter_shown_items();
}





