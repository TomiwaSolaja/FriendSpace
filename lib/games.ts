export const THIS_OR_THAT = [
  { a: "Coffee", b: "Tea" },
  { a: "City walk", b: "Park picnic" },
  { a: "Morning plans", b: "Night plans" },
  { a: "New restaurant", b: "A usual favorite" },
  { a: "Board games", b: "Something outdoors" },
  { a: "Museum", b: "Live music" },
];

export type TicTacToeState = {
  board: Array<"X" | "O" | null>;
  playerX: string;
  playerO: string;
  turn: "X" | "O";
  winner: "X" | "O" | "draw" | null;
};

export type ThisOrThatState = {
  prompt: { a: string; b: string };
  votes: Record<string, "a" | "b">;
  revealed: boolean;
};

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function newTicTacToe(playerX: string, playerO: string): TicTacToeState {
  return {
    board: Array(9).fill(null),
    playerX,
    playerO,
    turn: "X",
    winner: null,
  };
}

export function applyTicTacToeMove(state: TicTacToeState, userId: string, cell: number): TicTacToeState {
  if (state.winner) throw new Error("This game is over");
  if (!Number.isInteger(cell) || cell < 0 || cell > 8 || state.board[cell]) {
    throw new Error("Pick an empty square");
  }
  const expected = state.turn === "X" ? state.playerX : state.playerO;
  if (userId !== expected) throw new Error("It is not your turn");

  const board = [...state.board];
  board[cell] = state.turn;
  const winner = winnerOf(board);
  return {
    ...state,
    board,
    winner,
    turn: winner ? state.turn : state.turn === "X" ? "O" : "X",
  };
}

function winnerOf(board: Array<"X" | "O" | null>): TicTacToeState["winner"] {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

export function newThisOrThat(): ThisOrThatState {
  const prompt = THIS_OR_THAT[Math.floor(Math.random() * THIS_OR_THAT.length)];
  return { prompt, votes: {}, revealed: false };
}

export function applyThisOrThatVote(
  state: ThisOrThatState,
  userId: string,
  choice: "a" | "b",
  memberIds: string[],
): ThisOrThatState {
  if (!memberIds.includes(userId)) throw new Error("You are not in this group");
  if (state.votes[userId]) throw new Error("You already voted");
  if (choice !== "a" && choice !== "b") throw new Error("Pick one of the two options");
  const votes = { ...state.votes, [userId]: choice };
  return {
    ...state,
    votes,
    revealed: memberIds.every((id) => votes[id]),
  };
}
