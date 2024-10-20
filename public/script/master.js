const fieldTemp = document.querySelector(".fieldTemp");
const container = document.querySelector(".container");
const start_end = document.querySelector(".start_end");
const resultsBtn = document.querySelector(".results");

let ROUND_HAPPENING = false;

const createFieldSetting = (fieldNumber, teams) => {
    let field = fieldTemp.content.cloneNode(true);
    field.querySelector(".field_title").textContent = `Spielfeld ${fieldNumber}`;
    let selection = field.querySelectorAll(".selectTeam");
    let num_teams = teams.length;
    selection.forEach((select) => {
        teams.forEach((team, idx) => {
            if (num_teams / 2 >= idx) {
                let option = document.createElement("option");
                option.value = team.includes("Kein Team") ? "Kein Team" : team;
                option.textContent = team.includes("Kein Team") ? "Kein Team" : team;
                select.appendChild(option);
            } 
        })
    })
    container.appendChild(field);
}

fetch("/getTeamsFields", {
    method: 'POST',
    body: JSON.stringify({login: new Date().toLocaleTimeString()}),
    headers: {'Content-Type' : 'application/json'}
})
.then(res => res.json())
.then(data => {
    for(let i = 0; i < data.number_of_fields; i++) {
        createFieldSetting(i+1, data.teams);
    }
    if (data.currentGame !== "") {
        start_end.textContent = `Runde Beenden`;
        ROUND_HAPPENING = true;
    }
})

// init socket
const socket = io();

const start_end_round = () => {
    let prompt = ROUND_HAPPENING ? "beenden" : "starten";
    if(!confirm("Möchten Sie die Runde " + prompt + "?")) return 0;

    if (!ROUND_HAPPENING) {
        let constellations = [];
        let timeStarted = new Date().toLocaleTimeString();
        let noTeamIdx = 1;

        document.querySelectorAll(".gameField").forEach((field) => {
            let selection = field.querySelectorAll(".selectTeam");
            let n1 = selection[0].value; n2 = selection[1].value;
            if(n1 == "Kein Team") {n1 = `Kein Team ${noTeamIdx}`, noTeamIdx += 1}
            if(n2 == "Kein Team") {n2 = `Kein Team ${noTeamIdx}`, noTeamIdx += 1}
            constellations.push({
                [n1]: {
                    points: 0
                },
                [n2]: {
                    points: 0
                }
            });
            console.log(constellations);
        })

        socket.emit("start_end_round", JSON.stringify({init_start: !ROUND_HAPPENING, opponents: constellations, startTime: timeStarted}));
    } else {
        socket.emit("start_end_round", JSON.stringify({init_start: !ROUND_HAPPENING}));
    }
}

socket.on("masterFeedback", (data) => {
    data = JSON.parse(data);
    if(data.type === "stateBtn") {
        start_end.textContent = "Runde " + data.info;
        ROUND_HAPPENING = data.info === "Beenden" ? true : false;
        resultsBtn.style.opacity = data.info === "Beenden" ? 0.5 : 1;
    }
})

const show_Results = () => {
    if(confirm("Möchten Sie das Spiel beenden und die Ergebnisse anzeigen?") && !ROUND_HAPPENING) {
        socket.emit("showResults_Init", JSON.stringify({state: "results"}));
    }
}
// when logged in
socket.emit("showResults_Init", JSON.stringify({state: "init"}));