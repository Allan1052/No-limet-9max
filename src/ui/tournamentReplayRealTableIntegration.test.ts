import { describe, expect, it } from "vitest";
import replayerSource from "./Replayer.tsx?raw";

describe("Replay do torneio usa a mesa real do jogo", () => {
  it("consome handHistoryToReplay e renderiza PokerTable em modo replay read-only", () => {
    expect(replayerSource).toContain("handHistoryToReplay");
    expect(replayerSource).toContain("<PokerTable");
    expect(replayerSource).toContain("readOnly");
    expect(replayerSource).toContain("frame.state");
    expect(replayerSource).toContain("frame.label");
    expect(replayerSource).toContain("frame.actorSeat");
  });

  it("remove a mesa paralela antiga e preserva revisão/compartilhamento", () => {
    expect(replayerSource).not.toContain('className="replay-board"');
    expect(replayerSource).not.toContain('className="board"');
    expect(replayerSource).toContain("HandActions");
    expect(replayerSource).toContain("Decisão ótima:");
  });
});
