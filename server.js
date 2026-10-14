const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const ALLOWED_TIMES = [60, 120, 180, 300];
const SUBMIT_WAIT_MS = 5000;   // time for both drawings to arrive after time is up
const VOTE_TIME_MS = 30000;    // time for both players to vote

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

function makeCode() {
  let code;
  do {
    code = String(1000 + Math.floor(Math.random() * 9000));
  } while (rooms[code]);
  return code;
}

function cleanName(raw) {
  return String(raw || "").replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 16);
}

function sendRoom(room) {
  io.to(room.code).emit("room-update", {
    code: room.code,
    adminId: room.adminId,
    players: room.players,
    timeLimit: room.timeLimit,
  });
}

function closeRoom(room, message) {
  clearTimeout(room.timer);
  io.to(room.code).emit("room-closed", message);
  delete rooms[room.code];
}

function finish(room, payload) {
  clearTimeout(room.timer);
  room.state = "done";
  room.submissions = {};
  room.votes = {};
  io.to(room.code).emit("results", payload);
}

// Start the vote: both drawings are shown and each player picks one
function startVote(room) {
  if (room.state !== "playing") return;
  clearTimeout(room.timer);
  room.state = "voting";
  room.votes = {};
  room.cards = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    png: room.submissions[p.id] || "",
  }));

  io.to(room.code).emit("vote-start", {
    cards: room.cards.map(({ id, name, png }) => ({ id, name, png })),
  });

  room.timer = setTimeout(() => finishVote(room), VOTE_TIME_MS);
}

// Decide the winner from the votes
// Both pick the same drawing: that player wins
// Both pick different drawings: tie
// Only one vote (other player ran out of time): that pick wins
// No votes: tie
function finishVote(room) {
  if (room.state !== "voting") return;
  clearTimeout(room.timer);

  const drawings = room.cards.map((c) => ({ name: c.name, png: c.png }));
  const votes = Object.values(room.votes);
  let winnerId = null;
  let reason;

  if (votes.length === 2 && votes[0] === votes[1]) {
    winnerId = votes[0];
    reason = "Both players picked the same drawing.";
  } else if (votes.length === 2) {
    reason = "The players picked different drawings, so it's a tie.";
  } else if (votes.length === 1) {
    winnerId = votes[0];
    reason = "Only one player voted, so their pick wins.";
  } else {
    reason = "Nobody voted, so it's a tie.";
  }

  const winner = room.cards.find((c) => c.id === winnerId);
  finish(room, { drawings, winnerName: winner ? winner.name : null, reason });
}

io.on("connection", (socket) => {
  let myCode = null;

  socket.on("create-room", ({ name } = {}, cb) => {
    const n = cleanName(name);
    if (!n) return cb({ ok: false, error: "Please enter your name." });
    if (myCode) return cb({ ok: false, error: "You are already in a room." });

    const code = makeCode();
    rooms[code] = {
      code,
      adminId: socket.id,
      players: [{ id: socket.id, name: n }],
      timeLimit: 120,
      state: "waiting",
      submissions: {},
      votes: {},
      cards: [],
      timer: null,
    };
    myCode = code;
    socket.join(code);
    cb({ ok: true, code });
    sendRoom(rooms[code]);
  });

  socket.on("join-room", ({ name, code } = {}, cb) => {
    const n = cleanName(name);
    const room = rooms[String(code || "").trim()];
    if (!n) return cb({ ok: false, error: "Please enter your name." });
    if (myCode) return cb({ ok: false, error: "You are already in a room." });
    if (!room) return cb({ ok: false, error: "Room not found." });
    if (room.state !== "waiting") return cb({ ok: false, error: "That game has already started." });
    if (room.players.length >= 2) return cb({ ok: false, error: "This room is full." });

    room.players.push({ id: socket.id, name: n });
    myCode = room.code;
    socket.join(room.code);
    cb({ ok: true, code: room.code });
    sendRoom(room);
  });

  socket.on("set-time", ({ seconds } = {}) => {
    const room = rooms[myCode];
    if (!room || room.adminId !== socket.id || room.state !== "waiting") return;
    if (!ALLOWED_TIMES.includes(seconds)) return;
    room.timeLimit = seconds;
    sendRoom(room);
  });

  socket.on("start-game", () => {
    const room = rooms[myCode];
    if (!room || room.adminId !== socket.id || room.state !== "waiting") return;
    if (room.players.length !== 2) return;

    room.state = "playing";
    room.submissions = {};
    const endAt = Date.now() + room.timeLimit * 1000;
    io.to(room.code).emit("game-start", { endAt });

    room.timer = setTimeout(() => {
      io.to(room.code).emit("time-up");
      // Give both players a few seconds to send their drawings, then start voting
      room.timer = setTimeout(() => startVote(room), SUBMIT_WAIT_MS);
    }, room.timeLimit * 1000);
  });

  socket.on("submit", ({ png } = {}) => {
    const room = rooms[myCode];
    if (!room || room.state !== "playing") return;
    if (typeof png !== "string" || !png.startsWith("data:image/png;base64,") || png.length > 300000) return;

    room.submissions[socket.id] = png;
    if (Object.keys(room.submissions).length === 2) startVote(room);
  });

  socket.on("vote", ({ choice } = {}) => {
    const room = rooms[myCode];
    if (!room || room.state !== "voting") return;
    if (room.votes[socket.id]) return; // one vote per player

    const card = room.cards.find((c) => c.id === choice);
    if (!card || !card.png) return; // can't vote for a missing drawing

    room.votes[socket.id] = choice;
    if (Object.keys(room.votes).length === 2) finishVote(room);
  });

  socket.on("disconnect", () => {
    const room = rooms[myCode];
    if (!room) return;

    if (room.state === "playing" || room.state === "voting") {
      return closeRoom(room, "Your opponent left the game.");
    }

    room.players = room.players.filter((p) => p.id !== socket.id);
    if (room.players.length === 0) {
      delete rooms[room.code];
      return;
    }
    if (room.adminId === socket.id) room.adminId = room.players[0].id;
    if (room.state === "waiting") sendRoom(room);
  });
});

server.listen(PORT, () => {
  console.log(`Pixel Battle running at http://localhost:${PORT}`);
});
