import express from 'express'
import bodyParser from "body-parser";

const app = express();
const jsonParser = bodyParser.json();

const port = process.env.PORT || 5000;

type Answer = {
    guess: string,
    id: number
}

class GameSession {
    username: number;
    state: string;
}

// Players
const players: Array<number> = [];
const ejected_players: Array<number> = [];
let next_player: number = null;
let last_added_user: number = null;

// Game sessions
const sessions: Array<GameSession> = [];

// Start point
let current_index = 0;

/**
 * Join game session -
 * New user gets id
 */
app.get('/join', (_, res) => {

    let user_id = last_added_user++;

    players.push(user_id);
    last_added_user = user_id;

    const session = new GameSession();
    session.username = user_id;
    session.state = "joined";
    sessions.push(session);

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({
        id: user_id,
        sessions
    }))
});

app.get('/sessions', (_, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(sessions))
});


app.post('/play', jsonParser, (req, res) => {
    const answer: Answer = req.body, fizz: boolean = current_index % 3 == 0, buzz: boolean = current_index % 5 == 0;

    res.setHeader('Content-Type', 'application/json');
    // If user was ejected
    if (ejected_players.includes(answer.id)) {
        res.status(400).send(JSON.stringify({
            message: "Already Ejected"
        }));
        return;
    }
    // If less than 2 players
    if (players.length <= 1) {
        res.status(400).send(JSON.stringify({
            message: "Wait for more players to join"
        }));
        return;
    }

    // If it's not your turn to play
    if (next_player != null && next_player !== answer.id) {
        res.status(400).send(JSON.stringify({
            message: "Not your turn"
        }));
        return;
    }

    const session = new GameSession();
    session.username = answer.id;
    if ((fizz && answer.guess === 'fizz') || (buzz && answer.guess === 'buzz') || (fizz && buzz && answer.guess === 'fizzbuzz') || (!fizz && !buzz && answer.guess === 'none')) {
        session.state = "Good";
    }
    // TODO: If user fails to guess, do they continue playing or get ejected
    else {
        session.state = "Ejected";
        players.splice(players.indexOf(answer.id), 1);
        ejected_players.push(answer.id);
    }
    current_index++;
    sessions.push(session);
    res.status(200).send(JSON.stringify(session));

    if (players.length >= 2) {
        // Get next player for 4 second rule
        const user_index = players.indexOf(answer.id);
        if (user_index > -1) {
            // If last user skip to first
            let i = user_index + 1 == players.length ? 0 : user_index + 1;
            next_player = players[i];
        }

        // Start time countdown for next player
        // Increased time limit to 10 seconds to take care of latency
        if (next_player != null) {
            setTimeout(() => {
                players.splice(players.indexOf(next_player), 1);
                ejected_players.push(next_player);
            }, 10000);
        }
    }
});


app.listen(port, () => console.log(`Running on port ${port}`));