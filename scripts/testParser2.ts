import { parseHandHistory } from "../src/import/handHistory";
import { readFileSync } from "fs";
const text = readFileSync("/home/ubuntu/reels-importacao/test_hand_history.txt", "utf8");
const r = parseHandHistory(text);
console.log("hands:", r.length);
if (r.length) {
  const h = r[0];
  console.log("bb:", h.bb, "seats:", h.seats.length, "actions:", h.actions.length, "board:", h.board.length, "hero:", h.heroName, JSON.stringify(h.heroCards));
}
