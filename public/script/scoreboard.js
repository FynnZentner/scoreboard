const digits = document.querySelectorAll(".digit");
const gameTemplate = document.querySelector(".template_gameInfo");
const sumTemplate = document.querySelector(".template_roundSum");
const sumCont = document.querySelector(".roundSum")
const gameContainer = document.querySelector(".container");
const roundCount = document.querySelector(".round");
const eventTitle = document.querySelector(".eventTitle");
const waitScreen = document.querySelector(".waitScreen");
let gameFields = [];
let END_ROUND = false;

const createGameField = (team_1, team_2, p1, p2, x_disp) => {
    let gameField = gameTemplate.content.cloneNode(true);
    let gameInfo = gameField.querySelector(".gameInfo");
    gameInfo.style.left = `calc(50vw - 21.25vw + (${x_disp} * 47.5vw))`; 
    gameInfo.querySelector(".name_team_1").textContent = team_1;
    gameInfo.querySelector(".name_team_2").textContent = team_2;
    gameInfo.querySelector(".points_team_1").textContent = p1;
    gameInfo.querySelector(".points_team_2").textContent = p2;
    gameInfo.querySelectorAll(".field").forEach((field, idx) => {
        field.textContent = `Spielfeld ${x_disp+1}.${idx == 0 ? 1 : 2}`;
    });
    gameContainer.appendChild(gameField);
}

const createSumEl = (team_1, team_2, p1, p2) => {
    let elem = sumTemplate.content.cloneNode(true);
    let teamE = elem.querySelectorAll(".team");
    let pointsE = elem.querySelectorAll(".points");
    teamE[0].textContent = team_1;
    teamE[1].textContent = team_2;
    pointsE[0].textContent = p1;
    pointsE[1].textContent = p2;
    sumCont.appendChild(elem);
}

const setCountDown = (time, roundC) => {

    waitScreen.style.transition = "1s ease-in-out all";

    waitScreen.style.opacity = 0;

    digits.forEach((digit,idx) => {
        digit.textContent = time[idx + (idx > 1 ? 1 : 0)];
    })

    let cacheTime = {"minutes": parseInt(time.split(":")[0]), "seconds": parseInt(time.split(":")[1])};

    roundCount.textContent = `Runde ${roundC}`;

    const timer = setInterval(() => {

        if (cacheTime["seconds"] == 0) {
            cacheTime["minutes"] -= 1;
            cacheTime["seconds"] = 60;
        }
        
        cacheTime["seconds"] -= 1;
    
        if ((cacheTime["minutes"] == 0 && cacheTime["seconds"] == 0) || END_ROUND) {
            END_ROUND = false;
            waitScreen.style.opacity = 1;
            socket.emit("roundEnded", JSON.stringify({
                device: "display"
            }))
            setTimeout(() => {
                gameFields = [];
                document.querySelectorAll(".gameInfo").forEach((field) => field.remove());
            },1000)
            clearInterval(timer);
        }
    
        let seconds = cacheTime["seconds"];
        let minutes = cacheTime["minutes"];

        seconds = seconds < 10 ? `0${seconds}` : seconds;
        minutes = minutes < 10 ? `0${minutes}` : minutes;
    
        digits.forEach((digit,idx) => {
            if (idx > 1) digit.textContent = seconds.toString()[idx-2];
            else digit.textContent = minutes.toString()[idx];
        })

        // move game elements

        let numFields = gameFields.length;

        gameFields.forEach((field) => {
            if (field.style.left == "calc(-42.5vw)") {
                field.style.transition = "none";
                field.style.left = `${(numFields - 1) * 50}vw`;
                //field.style.left = "100vw"; // issue with more than three elements / game fields
            }
            setTimeout(() => { 
                field.style.transition = "1s linear all";
                field.style.left = `calc(${field.style.left} - 4.75vw)`;
            },1)
        })
    
    }, 1000)
}

fetch("/getGameData", {
    method: 'POST',
    body: JSON.stringify({login: new Date().toLocaleTimeString()}),
    headers: {'Content-Type' : 'application/json'}
})
.then(res => res.json())
.then(data => {
    eventTitle.textContent = data.event;
    document.querySelector(".title").textContent = data.event;
    if (data.is_playing !== "") {
        data.opponents.forEach((field, idx) => {
            let oppTeamNames = Object.keys(field);
            createGameField(
                oppTeamNames[0].includes("Kein Team") ? "Kein Team" : oppTeamNames[0], 
                oppTeamNames[1].includes("Kein Team") ? "Kein Team" : oppTeamNames[1],
                field[oppTeamNames[0]].points, 
                field[oppTeamNames[1]].points, idx
            )
        })
        gameFields = document.querySelectorAll(".gameInfo");
        setCountDown(data.time, data.rounds)
    }
})

const socket = io();

socket.on("startEndCRound", (data) => {
    data = JSON.parse(data);
    console.log(data)
    //document.querySelectorAll(".element").forEach((el) => el.remove());
    if (!data.startGame) {
        if (waitScreen.style.opacity == 0) {
            //document.querySelectorAll(".element").forEach((el) => el.remove());
            END_ROUND = true;
        } 
        if (data.from !== "referee") {
            document.querySelectorAll(".element").forEach((el) => el.remove());
            data.teams.forEach((team) => {
                let team_names = Object.keys(team);
                createSumEl(
                    team_names[0].includes("Kein Team") ? "Kein Team" : team_names[0], 
                    team_names[1].includes("Kein Team") ? "Kein Team" : team_names[1], 
                    team[team_names[0]].points, 
                    team[team_names[1]].points
                )
            })
        }
        return;
    }
    document.querySelectorAll(".element").forEach((el) => el.remove());
    data.opponents.forEach((field, idx) => {
        let oppTeamNames = Object.keys(field);
        createGameField(
            oppTeamNames[0].includes("Kein Team") ? "Kein Team" : oppTeamNames[0], 
            oppTeamNames[1].includes("Kein Team") ? "Kein Team" : oppTeamNames[1],
            field[oppTeamNames[0]].points, 
            field[oppTeamNames[1]].points, idx
        )
    })
    gameFields = document.querySelectorAll(".gameInfo");
    setCountDown(data.time, data.rounds)
})

socket.on("pointsDisplay", (data) => {
    data = JSON.parse(data);
    let teamNamesFields = Object.keys(data.opponentsF);
    if(data.ext) {
        console.log(data)
    } else {
        gameFields[data.fieldN-1].querySelectorAll(".points_team").forEach((tm, idx) => {
            tm.textContent = data.opponentsF[teamNamesFields[idx]].points;
        })
    }
})

socket.on("gameResults", (data) => {
    data = JSON.parse(data);
    if(data.state == "refresh" && document.querySelector(".eventTitle").textContent == new Date().getFullYear().toString()) {
        window.location.reload();
    } else if (data.state == "results") {
        sumCont.style.display = "none";
        let parentTable = document.querySelector(".winnerTable");
        parentTable.style.display = "flex";
        let winnerEntries = parentTable.querySelectorAll(".name_info");
        let bestThree = data.sortedPlayer.slice(-3);
        winnerEntries.forEach((entry,idx) => {
            let cTeam = bestThree[2-idx];
            entry.textContent = cTeam.Tname; // `${cTeam.Tname} | ${cTeam.wins} Gew. & ${cTeam.points} Pkt.`;
        })
    }
})
