import { describe, expect, it } from "vitest";
import importReplayerSource from "./ImportReplayer.tsx?raw";
import tableSource from "./Table.tsx?raw";

describe("Import replay usa a mesa real do jogo", () => {
  it("consome os ReplayFrame do motor e renderiza a PokerTable em replay read-only", () => {
    expect(importReplayerSource).toContain('parsedHandToReplay');
    expect(importReplayerSource).toContain('<PokerTable');
    expect(importReplayerSource).toContain('readOnly');
    expect(importReplayerSource).toContain('frame.label');
    expect(importReplayerSource).toContain('frame.actorSeat');
    expect(importReplayerSource).not.toContain('function buildSteps');
    expect(importReplayerSource).not.toContain('interface SeatState');
    expect(importReplayerSource).not.toContain('interface StepInfo');
  });

  it("PokerTable oferece modo somente leitura e não encaminha seleção de assento nesse modo", () => {
    expect(tableSource).toContain('readOnly = false');
    expect(tableSource).toContain('readOnly?: boolean');
    expect(tableSource).toContain('onSelect={readOnly ? undefined : onSelectSeat}');
  });
});
