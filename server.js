// essential server code
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const server = express();
const path = require('path');
const http = require('http');

server.engine('html', require('ejs').renderFile);
server.set('view engine', 'html');
server.set('views', path.join(__dirname, 'views'));
server.use(express.urlencoded({ extended: true }));
server.use(express.json())
server.use(express.static(path.join(__dirname, 'public')));
const app = http.createServer(server);

// important data
let USER_IS_VALID = false;
let INITIALISED_GAME = false;
let CURRENT_ROUND = 0;
let IS_PLAYING = "";
let CURRENT_OPPONENTS = [];

let EVENT_TITLE = new Date().getFullYear().toString(); // "Volleyballturnier " + new Date().getFullYear().toString();
let NUMBER_OF_FIELDS = 0;
let ROUNDS_TOTAL = 0;
let TIME_PER_ROUND = "00:00";
let TEAMS = {};

// important functions
const timeDifference = (startTime, endTime) => { // calculate it server side
  const [startHours, startMinutes, startSeconds] = startTime.split(':').map(Number);
  const [endHours, endMinutes, endSeconds] = endTime.split(':').map(Number);
  const startTotalSeconds = (startHours * 3600) + (startMinutes * 60) + startSeconds;
  const endTotalSeconds = (endHours * 3600) + (endMinutes * 60) + endSeconds;
  let diffInSeconds = endTotalSeconds - startTotalSeconds;
  if (diffInSeconds < 0) diffInSeconds += 24 * 3600;
  const minutes = Math.floor(diffInSeconds / 60);
  const seconds = diffInSeconds % 60;
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  return `${formattedMinutes}:${formattedSeconds}`;
}

const sortTeams = (obj) => {
  let objectKeys = Object.keys(obj);
  let len = objectKeys.length / 2;
  let sorted = [];
  for(let i = 0; i < len; i++) { // Object.keys(obj).map((key) => ({Tname: key, points: obj[key].points, wins: obj[key].wins}))
    let key = objectKeys[i];
    sorted.push({Tname: key, points: obj[key].points, wins: obj[key].wins})
  }
  
  for(let i = 0; i < len; i++) {
    for(let k = 0; k < (len-1-i); k++) {
      if(sorted[k].wins > sorted[k+1].wins) {
        let cache = sorted[k];
        sorted[k] = sorted[k+1];
        sorted[k+1]= cache;
      } else if (sorted[k].wins == sorted[k+1].wins) {
        if(sorted[k].points > sorted[k+1].points) {
          let cache = sorted[k];
          sorted[k] = sorted[k+1];
          sorted[k+1]= cache;
        }
      }
    }
  }
  return sorted
}

const determineWinners = (obj) => {
  let pointsEach = Object.values(obj);
  if(pointsEach[0].points > pointsEach[1].points) {
      return [Object.keys(obj)[0]];
  } else if (pointsEach[0].points < pointsEach[1].points) {
      return [Object.keys(obj)[1]];
  } else if ((pointsEach[0].points == pointsEach[1].points) && pointsEach[0].points != 0 && pointsEach[1].points != 0) {
      return Object.keys(obj);
  } else {
    return [];
  }
}

const validate_user = (req, res, next) => {
  if(USER_IS_VALID) {
    USER_IS_VALID = false;
    return next();
  } 
  res.redirect("/login");
}

server.get('/login', (req, res) => {
  return res.render('login');
});

server.get('/', validate_user, (req, res) => {
    return res.render('scoreboard');
});

server.get('/master', validate_user, (req, res) => {
  if (INITIALISED_GAME) return res.render('master');
  else return res.render('masterSettings');
});

server.get('/referee', validate_user, (req, res) => {
  return res.render('referee');
});

server.post("/validatePassword", (req,res) => {
  try {
    let data = req.body;
    if (process.env.ACCESS_PASSWORD === data.password) { // A2025sGRj
      USER_IS_VALID = true;
      res.json({success: true, destination: data.destination});
    } else {
      res.json({success: false});
    }
  } catch(err) {
    console.error(err);
    res.send(err);
  }
})

// store initialisation settings
server.post('/storeSettings', (req, res) => {
  try {
    let data = req.body;

    INITIALISED_GAME = true;

    EVENT_TITLE = data.event;
    NUMBER_OF_FIELDS = data.fields;
    ROUNDS_TOTAL = data.rounds;
    TIME_PER_ROUND = data.time;

    data.name.forEach((teamN) => {
      TEAMS[teamN] = {points: 0, wins: 0};
    })

    for(let i = 0; i < NUMBER_OF_FIELDS*2; i++) {
      TEAMS[`Kein Team ${i+1}`] = {points: 0, wins: 0}
    }

    res.send("Successfull");
  } catch(err) {
    console.error(err);
    res.send(err);
  }
});

server.post("/getTeamsFields", (req, res) => {
  try {
    console.log(`Master logged in at ${req.body.login}`);
    res.json({
      number_of_fields: NUMBER_OF_FIELDS,
      teams: Object.keys(TEAMS),
      currentGame: IS_PLAYING
    })
  } catch(err) {
    console.error(err);
    res.send(err);
  }
})

server.post("/getGameData", (req, res) => {
  try {
    console.log(`Display/Referee logged in at ${req.body.login}`);
    let = timeRemaining = "00:00";
    if (IS_PLAYING !== "") {
      let td1 = timeDifference(IS_PLAYING, new Date().toLocaleTimeString("it-IT"));
      timeRemaining = timeDifference(`00:${td1}`, `00:${TIME_PER_ROUND}`);
    }
    res.json({
      is_playing: IS_PLAYING,
      opponents: CURRENT_OPPONENTS,
      time: timeRemaining,
      rounds: CURRENT_ROUND,
      event: EVENT_TITLE,
      numberOfFields: NUMBER_OF_FIELDS
    })
  } catch(err) {
    console.error(err);
    res.send(err);
  }
})

// changing points and wins through the master

server.post("/requestGameData", (req,res) => {
  try {
    console.log(`Data requested at ${req.body.reqDate}`);
    res.json(TEAMS);
  } catch(err) {
    console.error(err);
    res.send(err);
  }
})

server.post("/overrideGameData", (req, res) => {
  try {
    console.log(`Override requested at ${req.body.reqDate}`);
    TEAMS = req.body.teams_updated;
    res.json({state: "success"});
  } catch(err) {
    console.log(err);
    res.send(err);
  }
})

// init socket
const io = require('socket.io')(app, {
  cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.id} connected`);

  socket.on('start_end_round', (data) => {

    data = JSON.parse(data);
    if (data.init_start) {

      CURRENT_ROUND += 1;
      CURRENT_OPPONENTS = data.opponents;
      IS_PLAYING = data.startTime;

      io.emit('startEndCRound', JSON.stringify({
        startGame: true,
        opponents: data.opponents,
        time: TIME_PER_ROUND,
        rounds: CURRENT_ROUND
      }));

      io.emit('masterFeedback', JSON.stringify({type: "stateBtn", info: "Beenden"}));
    } else {
      io.emit('startEndCRound', JSON.stringify({startGame: false, teams: CURRENT_OPPONENTS}));
      // CURRENT_OPPONENTS = [], IS_PLAYING = "";
      io.emit('masterFeedback', JSON.stringify({type: "stateBtn", info: "Starten"}));
      // end game
    }
  });

  socket.on("sendPoints", (data) => {
    data = JSON.parse(data);
    TEAMS[data.tName].points += 1;
    CURRENT_OPPONENTS[data.fieldN-1] = data.opponentsF;
    io.emit('pointsDisplay', JSON.stringify({
      fieldN: data.fieldN,
      opponentsF: data.opponentsF,
      ext: data.extensionState
    }));
  })

  socket.on("roundEnded", (data) => {
    data = JSON.parse(data);
    io.emit('startEndCRound', JSON.stringify({startGame: false, teams: CURRENT_OPPONENTS, from: data.device}));
    io.emit('masterFeedback', JSON.stringify({type: "stateBtn", info: "Starten"}));
    if (data.device === "display") {
      CURRENT_OPPONENTS.forEach((opp) => {
        determineWinners(opp).forEach((winner) => {
          TEAMS[winner].wins += 1;
        })
      })
      console.log(TEAMS)
      IS_PLAYING = "";
      CURRENT_OPPONENTS = [];
    }
  })

  socket.on("showResults_Init", (data) => {
    data = JSON.parse(data);
    if(data.state == "results") {
      io.emit('gameResults', JSON.stringify({state: "results", sortedPlayer: sortTeams(TEAMS)}));
      // reset data
      USER_IS_VALID = false, INITIALISED_GAME = false;
      CURRENT_ROUND = 0, IS_PLAYING = "", CURRENT_OPPONENTS = [];
      EVENT_TITLE = new Date().getFullYear().toString(), NUMBER_OF_FIELDS = 0;
      ROUNDS_TOTAL = 0, TIME_PER_ROUND = "00:00", TEAMS = {};
    } else {
      io.emit('gameResults', JSON.stringify({state: "refresh"}));
    }
  })

  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected`);
  });
});

// starting the server – npm run scoreboardStart
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
