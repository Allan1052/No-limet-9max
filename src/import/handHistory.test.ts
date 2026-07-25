import { describe, it, expect } from "vitest";
import { parseHandHistory, parseHandBlock, assignPositions, type ParsedSeat } from "./handHistory";
import { cardsToString } from "../engine/cards";

const PS_HAND = `PokerStars Hand #241234567890: Tournament #3456789012, $10+$1 USD Hold'em No Limit - Level V (30/60) - 2024/01/15 20:14:33 ET
Table '3456789012 5' 9-max Seat #6 is the button
Seat 1: Alice (1500 in chips)
Seat 2: Bob (1420 in chips)
Seat 3: Carol (2100 in chips)
Seat 4: Dave (980 in chips)
Seat 5: Hero (1500 in chips)
Seat 6: Frank (1600 in chips)
Alice: posts small blind 30
Bob: posts big blind 60
*** HOLE CARDS ***
Dealt to Hero [Ah Kd]
Carol: folds
Dave: folds
Hero: raises 120 to 180
Frank: calls 180
Alice: folds
Bob: folds
*** FLOP *** [7h 2c Ts]
Hero: bets 200
Frank: calls 200
*** TURN *** [7h 2c Ts] [Kh]
Hero: bets 500
Frank: folds
Uncalled bet (500) returned to Hero
Hero collected 780 from pot
*** SUMMARY ***
Total pot 780 | Rake 0
Board [7h 2c Ts Kh]
Seat 5: Hero collected (780)`;

const GG_HAND = `Poker Hand #TM9988776655: Tournament #22334455, $5+$0.50 Hold'em No Limit - Level3(10/20) - 2024/02/20 18:00:00
Table '22334455 1' 9-max Seat #1 is the button
Seat 1: a1b2c3d4 (2000 in chips)
Seat 2: Hero (1800 in chips)
Seat 3: ff00ff00 (1500 in chips)
a1b2c3d4: posts the ante 3
Hero: posts the ante 3
ff00ff00: posts the ante 3
Hero: posts small blind 10
ff00ff00: posts big blind 20
*** HOLE CARDS ***
Dealt to Hero [As Ac]
a1b2c3d4: raises 40 to 60
Hero: raises 120 to 180
ff00ff00: folds
a1b2c3d4: calls 120
*** FLOP *** [2d 7c Jh]
Hero: bets 200
a1b2c3d4: folds
Uncalled bet (200) returned to Hero
Hero collected 420 from pot
*** SUMMARY ***
Total pot 420`;

describe("parseHandHistory — PokerStars", () => {
  const hands = parseHandHistory(PS_HAND);
  it("lê exatamente uma mão", () => {
    expect(hands.length).toBe(1);
  });
  const h = hands[0];
  it("identifica site, torneio e blinds", () => {
    expect(h.site).toBe("PokerStars");
    expect(h.tournamentId).toBe("3456789012");
    expect(h.sb).toBe(30);
    expect(h.bb).toBe(60);
  });
  it("lê os assentos e o stack do herói", () => {
    expect(h.seats.length).toBe(6);
    const hero = h.seats.find((s) => s.isHero)!;
    expect(hero.name).toBe("Hero");
    expect(hero.stack).toBe(1500);
  });
  it("lê as cartas do herói e o board", () => {
    expect(cardsToString(h.heroCards)).toBe("AhKd");
    expect(cardsToString(h.board)).toBe("7h2cTsKh");
  });
  it("atribui a posição do botão corretamente", () => {
    const frank = h.seats.find((s) => s.name === "Frank")!;
    expect(frank.isButton).toBe(true);
    expect(frank.position).toBe("BTN");
    const alice = h.seats.find((s) => s.name === "Alice")!;
    expect(alice.position).toBe("SB");
    const bob = h.seats.find((s) => s.name === "Bob")!;
    expect(bob.position).toBe("BB");
    // 6 jogadores → o herói (assento antes do botão) é o CO.
    const hero = h.seats.find((s) => s.isHero)!;
    expect(hero.position).toBe("CO");
  });
  it("registra a sequência de ações", () => {
    const heroRaise = h.actions.find((a) => a.player === "Hero" && a.type === "raise");
    expect(heroRaise).toBeTruthy();
    expect(heroRaise!.amount).toBe(180);
  });
});

describe("parseHandHistory — GGPoker", () => {
  const hands = parseHandHistory(GG_HAND);
  const h = hands[0];
  it("identifica o site GGPoker e o ante", () => {
    expect(h.site).toBe("GGPoker");
    expect(h.ante).toBe(3);
    expect(h.bb).toBe(20);
  });
  it("lê AA do herói", () => {
    expect(cardsToString(h.heroCards)).toBe("AsAc");
  });
  it("registra o 3-bet do herói (raise to 180)", () => {
    const reraise = h.actions.filter((a) => a.player === "Hero" && a.type === "raise");
    expect(reraise.length).toBe(1);
    expect(reraise[0].amount).toBe(180);
  });
});

describe("assignPositions — heads-up", () => {
  it("no heads-up o botão é o SB", () => {
    const seats: ParsedSeat[] = [
      { seat: 1, name: "A", stack: 1000, isHero: false, isButton: true },
      { seat: 2, name: "B", stack: 1000, isHero: false, isButton: false },
    ];
    assignPositions(seats, 1);
    expect(seats.find((s) => s.seat === 1)!.position).toBe("SB");
    expect(seats.find((s) => s.seat === 2)!.position).toBe("BB");
  });
});

describe("robustez", () => {
  it("texto lixo não quebra (devolve lista vazia)", () => {
    expect(parseHandHistory("isso não é uma mão de poker")).toEqual([]);
  });
  it("bloco sem blinds devolve null", () => {
    expect(parseHandBlock("PokerStars Hand #1: nada aqui")).toBeNull();
  });
});
