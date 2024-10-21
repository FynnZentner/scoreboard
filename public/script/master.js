const fieldTemp = document.querySelector(".fieldTemp");
const container = document.querySelector(".container");
const start_end = document.querySelector(".start_end");
const resultsBtn = document.querySelector(".results");
const manageDataBtn = document.querySelector(".manageDataBtn");
const wrapEntriesSt = document.querySelector(".wrapEntriesSt");
const tempTeamSt = document.querySelector(".tempTeamSt");

let CURRENT_TEAM_STATES = {};

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

const getData = () => {
    if(document.querySelector(".start_end").textContent == "Runde Beenden") return alert("Kein Zugriff: Aktive Runde");
    if(!confirm("Möchten Sie die Spieldaten aufrufen?")) return;
    fetch("/requestGameData", {
        method: 'POST',
        body: JSON.stringify({reqDate: new Date().toLocaleTimeString()}),
        headers: {'Content-Type' : 'application/json'}
    })
    .then(res => res.json())
    .then(data => {
        CURRENT_TEAM_STATES = data;
        document.querySelector(".containerManage").style.display = "flex";
        let list_of_team_names = Object.keys(data);
        for(let i = 0; i < list_of_team_names.length / 2; i++) {
            let team_name = list_of_team_names[i];
            let teamEl = tempTeamSt.content.cloneNode(true);
            teamEl.querySelector(".teamNameSt").textContent = team_name;
            teamEl.querySelector(".teamPointsSt").value = data[team_name].points;
            teamEl.querySelector(".teamWinsSt").value = data[team_name].wins;
            wrapEntriesSt.appendChild(teamEl);
        }
    })
}

const saveData = () => {
    if(!confirm("Möchten Sie die Spieldaten überschreiben?")) return;
    fetch("/overrideGameData", {
        method: 'POST',
        body: JSON.stringify({reqDate: new Date().toLocaleTimeString(), teams_updated: CURRENT_TEAM_STATES}),
        headers: {'Content-Type' : 'application/json'}
    })
    .then(res => res.json())
    .then(data => {
        if(data.state == "success") closeManage();
    });
}

const closeManage = () => {
    CURRENT_TEAM_STATES = {};
    document.querySelectorAll(".TeamSt").forEach((entry) => entry.remove());
    document.querySelector(".containerManage").style.display = "none";
}

const changePointsWins = (e) => {
    let teamName = e.parentNode.parentNode.parentNode.querySelector(".teamNameSt").textContent;
    let type_win_point = e.parentNode.id;
    let type_add_sub = e.id;
    let inpField = e.parentNode.querySelector(".inpPW");
    if(type_add_sub == "addP") {
        inpField.value = parseInt(inpField.value) + 1;
    } else if (type_add_sub == "subP") {
        inpField.value = parseInt(inpField.value) - 1;
    }
    if(type_win_point == "pointWrap") {
        CURRENT_TEAM_STATES[teamName].points = Number(inpField.value);
    } else {
        CURRENT_TEAM_STATES[teamName].wins = Number(inpField.value);
    }
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

const validInpFields = () => {
    for(const sField of document.querySelectorAll(".selectTeam")) {
        if(sField.value === "N/A") return false;
    }
    return true;
}

// init socket
const socket = io();

const start_end_round = () => {
    let prompt = ROUND_HAPPENING ? "beenden" : "starten";
    if(!confirm("Möchten Sie die Runde " + prompt + "?")) return 0;
    if(!validInpFields()) return alert("Jedem Feld muss ein Team zugewiesen werden.");

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
        manageDataBtn.style.opacity = data.info === "Beenden" ? 0.5 : 1;
    }
})

const show_Results = () => {
    if(document.querySelector(".start_end").textContent == "Runde Beenden") return alert("Kein Zugriff: Aktive Runde");
    if(confirm("Möchten Sie das Spiel beenden und die Ergebnisse anzeigen?") && !ROUND_HAPPENING) {
        socket.emit("showResults_Init", JSON.stringify({state: "results"}));
    }
}
// when logged in
socket.emit("showResults_Init", JSON.stringify({state: "init"}));
