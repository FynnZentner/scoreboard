const selectField = document.querySelector(".selectField");
const waitScreen = document.querySelector(".waitScreen");
const digits = document.querySelectorAll(".digit");
const teamN = document.querySelectorAll(".teamN");
const tPoints = document.querySelectorAll(".points");
let GAME_IS_HAPPENING = false;
let FIELD = undefined;
let END_ROUND = false;
let OPPONENTS_ALL = [];
let FIELD_OPPONENTS = {};
let EXTENSION_TIME = true;

fetch("/getGameData", {
    method: 'POST',
    body: JSON.stringify({login: new Date().toLocaleTimeString()}),
    headers: {'Content-Type' : 'application/json'}
})
.then(res => res.json())
.then(data => {
    console.log(data)
    document.querySelector(".eventTitle").textContent = data.event;
    if (data.is_playing !== "") {
        GAME_IS_HAPPENING = true;
        setCountDown(data.time);
        OPPONENTS_ALL = data.opponents;
    }
    for (let i = 0; i < data.numberOfFields; i++) {
        let option = document.createElement("option");
        option.value = i+1;
        option.textContent = `Spielfeld ${i+1}`;
        selectField.appendChild(option);
    }
})

const removeSelection = (e) => {
    document.querySelector(".fieldSelectScreen").style.display = "none";
    document.querySelector(".eventTitle").style.display = "block";
    document.querySelector(".field").textContent = `Spielfeld ${e.value}`;
    FIELD = e.value;
    if (GAME_IS_HAPPENING) {
        waitScreen.style.display = "none";
        FIELD_OPPONENTS = OPPONENTS_ALL[FIELD-1];
        let opponentsName = Object.keys(FIELD_OPPONENTS);
        teamN[0].textContent = opponentsName[0];
        teamN[1].textContent = opponentsName[1];
        tPoints[0].textContent = `${FIELD_OPPONENTS[opponentsName[0]].points} Pkt.`;
        tPoints[1].textContent = `${FIELD_OPPONENTS[opponentsName[1]].points} Pkt.`;
    }
}

const determineWinners = (obj) => {
    let pointsEach = Object.values(obj);
    if(pointsEach[0].points > pointsEach[1].points) {
        return [Object.keys(obj)[0]];
    } else if (pointsEach[0].points < pointsEach[1].points) {
        return [Object.keys(obj)[1]];
    } else {
        return Object.keys(obj);
    }
}

const setCountDown = (time) => {

    if (FIELD) waitScreen.style.display = "none";

    digits.forEach((digit,idx) => {
        digit.textContent = time[idx + (idx > 1 ? 1 : 0)];
    })

    let cacheTime = {"minutes": parseInt(time.split(":")[0]), "seconds": parseInt(time.split(":")[1])};

    const timer = setInterval(() => {

        if (cacheTime["seconds"] == 0) {
            cacheTime["minutes"] -= 1;
            cacheTime["seconds"] = 60;
        }
        
        cacheTime["seconds"] -= 1;
    
        if ((cacheTime["minutes"] == 0 && cacheTime["seconds"] == 0) || END_ROUND) {
            END_ROUND = false;
            waitScreen.style.display = "flex";
            document.querySelector(".field").textContent = `Spielfeld ${FIELD}`;
            socket.emit("roundEnded", JSON.stringify({
                device: "referee",
                winners: determineWinners(FIELD_OPPONENTS)
            }))
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
    
    }, 1000)
}

const socket = io();

socket.on("startEndCRound", (data) => {
    data = JSON.parse(data);
    if (!data.startGame) {
        if (waitScreen.style.display === "none") END_ROUND = true;
        return;
    }
    GAME_IS_HAPPENING = true;
    OPPONENTS_ALL = data.opponents;
    if (FIELD) {
        FIELD_OPPONENTS = OPPONENTS_ALL[FIELD-1];
        let opponentsName = Object.keys(FIELD_OPPONENTS);
        teamN[0].textContent = opponentsName[0];
        teamN[1].textContent = opponentsName[1];
        tPoints[0].textContent = `${FIELD_OPPONENTS[opponentsName[0]].points} Pkt.`;
        tPoints[1].textContent = `${FIELD_OPPONENTS[opponentsName[1]].points} Pkt.`;
    }
    setCountDown(data.time)
})

const add_sub_points = (e) => {
    let teamName = e.parentNode.querySelector(".teamN").textContent;
    let type = e.textContent === "+" ? 1 : -1;
    FIELD_OPPONENTS[teamName].points += type;
    e.parentNode.querySelector(".points").textContent = `${FIELD_OPPONENTS[teamName].points} Pkt.`;
    socket.emit("sendPoints", JSON.stringify({
        tName: teamName,
        add_sub: type,
        fieldN: parseInt(FIELD),
        opponentsF: FIELD_OPPONENTS,
        extensionState: !EXTENSION_TIME
    }));
}

socket.on("gameResults", (data) => {
    data = JSON.parse(data);
    if(data.state == "refresh" && FIELD == undefined) {
        window.location.reload();
    } else if(data.state == "results") {
        document.querySelector(".eventTitle").textContent = "Spiel vorbei!";
    }
})
