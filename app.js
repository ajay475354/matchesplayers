const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbpath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();
app.use(express.json());

let database = null;

const intializeDbServer = async () => {
  try {
    database = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`error at :${error.message}`);
    process.exit(1);
  }
};

intializeDbServer();

//player_details request to response object

const player_detailsConvertToResponseObject = (object) => {
  return {
    playerId: object.player_id,
    playerName: object.player_name,
  };
};

//match_details request to response object

const match_detailsConvertToResponseObject = (object) => {
  return {
    matchId: object.match_id,
    match: object.match,
    year: object.year,
  };
};

//player_match_score request to response object

const player_match_scoreConvertToResponseObject = (object) => {
  return {
    playerMatchId: object.player_match_id,
    playerId: object.player_id,
    matchId: object.match_id,
    score: object.score,
    fours: object.fours,
    sixes: object.sixes,
  };
};

//get players Api

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
    select
    *
    from 
    player_details;`;
  const players = await database.all(getPlayersQuery);
  response.send(
    players.map((eachPlayer) =>
      player_detailsConvertToResponseObject(eachPlayer)
    )
  );
});

//get a player Api
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getAplayer = `
    select
    *
    from
    player_details
    where 
    player_id=${playerId};`;
  const player = await database.get(getAplayer);
  response.send(player_detailsConvertToResponseObject(player));
});

//put player API
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
  UPDATE
    player_details
  SET
    player_name ='${playerName}'
  WHERE
    player_id = ${playerId};`;

  await database.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//get matches API
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchesQuery = `
    select
    *
    from
    match_details
    where
    match_id=${matchId};`;
  const match = await database.get(getMatchesQuery);
  response.send(match_detailsConvertToResponseObject(match));
});

//get matches using player id API
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getplayerMatchQuery = `
    select
    match_details.match_id,
    match_details.match,
    match_details.year
    from
    (player_details
      inner join 
    player_match_score
    on player_details.player_id=player_match_score.player_id) as T
    inner join match_details
    on player_match_score.match_id=match_details.match_id
    where 
    player_details.player_id=${playerId}
    group by match_details.match_id;`;
  const matches = await database.all(getplayerMatchQuery);
  response.send(
    matches.map((eachone) => match_detailsConvertToResponseObject(eachone))
  );
});

//get players based on matches

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `
    SELECT
      *
    FROM player_match_score
      NATURAL JOIN player_details
    WHERE
      match_id = ${matchId};`;
  const playersArray = await database.all(getMatchPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) =>
      player_detailsConvertToResponseObject(eachPlayer)
    )
  );
});

//get players scores
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScoreQuery = `
    select
    player_details.player_id,
    player_details.player_name,
    sum(score),
    sum(fours),
    sum(sixes)
    from
    player_details
    inner join
    player_match_score
    on player_details.player_id=player_match_score.player_id
    where
    player_details.player_id=${playerId}
    group by player_details.player_id;`;
  const score = await database.get(getPlayerScoreQuery);
  response.send({
    playerId: score["player_id"],
    playerName: score["player_name"],
    totalScore: score["sum(score)"],
    totalFours: score["sum(fours)"],
    totalSixes: score["sum(sixes)"],
  });
});

module.exports = app;
