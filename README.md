# Pixel Battle 🎨

Pixel Battle is a 1v1 pixel art game. Two players join a room, each gets a private 32x32 canvas with a timer, and when time runs out they vote for the better drawing. The game runs in the browser and uses real-time connections so both players stay in sync.

## How It Works

### 1. Create or join a room

- **Create Room:** Enter your name and press **Create Room**. The game gives you a 4-digit room code.
- **Join Room:** Enter your name and the room code from your friend, then press **Join Room**.

Each room holds exactly two players. If a room is full or the game has already started, the game tells you.

### 2. Waiting room

Both players see the room code and the list of players. The **admin** (the player who created the room) is marked with a crown 👑.

- Only the admin can choose the **time limit** (1, 2, 3, or 5 minutes).
- When both players are in the room, only the admin sees the **Start Game** button.

### 3. Drawing

When the admin starts the game, both players get their own blank 32x32 canvas. Nobody can see the other player's drawing until the vote.

- Pick a color from the 12-color palette.
- Choose a brush size (1px or 2px) or use the eraser.
- Click or drag on the board to paint.
- The timer counts down at the top. When it reaches zero, drawing stops.

### 4. Voting

Once time is up, both drawings appear side by side. Each player picks the drawing they think is better:

| Players' choices | Result |
|---|---|
| Both pick the same drawing | That player wins |
| They pick different drawings | It's a tie |
| Only one player votes (the other runs out of time) | That player's choice wins |
| Nobody votes | It's a tie |

Players can vote for their own drawing.

### 5. Results

The results screen shows both drawings with the artists' names, the winner, and the reason for the result. Click **Back to Lobby** to play again.

## Features

- Private 32x32 pixel canvas with a visible pixel grid
- 12 colors, two brush sizes, and an eraser
- Admin-controlled time limit
- Real-time sync between players using Socket.IO
- Player voting to decide the winner
- Animated, responsive card-style interface

## Tech Stack

- **Node.js** and **Express** for the server
- **Socket.IO** for real-time communication
- **HTML, CSS, and JavaScript** for the frontend (no framework)

## Project Structure

```
pixel-battle/
├── public/
│   ├── index.html   # The page: lobby, waiting room, drawing, voting, results
│   └── style.css    # Styling and animations
├── server.js        # Rooms, timers, and vote counting
├── package.json     # Project info and dependencies
└── .gitignore       # Keeps node_modules out of Git
```

## Running Locally

You need [Node.js](https://nodejs.org) installed.

```bash
# 1. Clone the repository
git clone https://github.com/YOUR-USERNAME/pixel-battle.git
cd pixel-battle

# 2. Install dependencies
npm install

# 3. Start the server
node server.js
```

Then open `http://localhost:3000` in your browser.

To test with two players on one computer, open a second tab or an incognito window.

To play with a friend on the same Wi-Fi, find your computer's IPv4 address with `ipconfig`, then have your friend open `http://YOUR-IP:3000`.

## Deploying

The game can be hosted on [Render](https://render.com) as a Web Service:

- **Build command:** `npm install`
- **Start command:** `node server.js`

Render sets the port automatically, so no changes are needed.

## Known Limitations

- Rooms and games are stored in memory, so they reset when the server restarts.
- Only two players can play in a room at a time.
- The vote relies on the players, so a player who wants to win can vote for their own drawing.

## Ideas for Future Updates

- Play again in the same room without rejoining
- Show a live countdown to the vote
- Let players pick a name color or avatar
- Add more tie-breaking rules

## License

This project is open source. Add a license if you plan to share it publicly.
