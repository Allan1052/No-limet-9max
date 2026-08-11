import { describe, it } from 'vitest';
import { preflopDecision } from '../preflop';
import { profileById } from '../../bots/profiles';

function makeHand(type: string): [number, number] {
  const r1 = "23456789TJQKA".indexOf(type[0]);
  const r2 = "23456789TJQKA".indexOf(type[1]);
  const suited = type.length === 3 && type[2] === 's';
  const c1 = (r1) * 4 + 0;
  const c2 = suited ? (r2) * 4 + 0 : (r2) * 4 + 1;
  return [c1, c2];
}

function posIndex(pos: string): number {
  return ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'].indexOf(pos);
}

describe('debug shove 28-45bb — com ICM/stage', () => {
  const hands = ['44', 'A4s', 'A5s'];
  const bbs = [28, 35, 40, 45];
  const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB'] as const;
  const tag = profileById('tag');

  it('com stage=Late e ICM baixo', () => {
    for (const bb of bbs) {
      for (const pos of positions) {
        for (const hand of hands) {
          // Simular mesa final com ICM pressure
          const ctx = {
            heroPosition: pos,
            hand: makeHand(hand),
            effectiveBB: bb,
            profile: tag,
            variant: 'holdem' as const,
            allInsAhead: 0,
            stage: 'Late' as const,
            icmMultiplier: 0.5, // ICM pressionando (perto do dinheiro)
          };
          const result = preflopDecision(ctx);
          if (result.action === 'jam') {
            console.log(`  JAM RFI Late/ICM: ${hand} ${pos} ${bb}bb — ${result.reason}`);
          }
        }
      }
    }
  });

  it('vs open raise com stage=Late e ICM baixo', () => {
    for (const bb of bbs) {
      for (const pos of positions) {
        for (const hand of hands) {
          for (const raiser of ['CO', 'HJ', 'BTN'] as const) {
            if (pos === raiser) continue;
            if (posIndex(pos) <= posIndex(raiser)) continue;
            const ctx = {
              heroPosition: pos,
              hand: makeHand(hand),
              effectiveBB: bb,
              profile: tag,
              variant: 'holdem' as const,
              raiserPosition: raiser,
              openSizeBB: 2.5,
              allInsAhead: 0,
              betLevelFaced: 1,
              stage: 'Late' as const,
              icmMultiplier: 0.5,
            };
            const result = preflopDecision(ctx);
            if (result.action === 'jam') {
              console.log(`  JAM VS OPEN Late/ICM: ${hand} ${pos} vs ${raiser} ${bb}bb — ${result.reason}`);
            }
          }
        }
      }
    }
  });

  it('RFI com stage=Final (mesa final)', () => {
    for (const bb of bbs) {
      for (const pos of positions) {
        for (const hand of hands) {
          const ctx = {
            heroPosition: pos,
            hand: makeHand(hand),
            effectiveBB: bb,
            profile: tag,
            variant: 'holdem' as const,
            allInsAhead: 0,
            stage: 'Final' as const,
            icmMultiplier: 0.3,
          };
          const result = preflopDecision(ctx);
          if (result.action === 'jam') {
            console.log(`  JAM RFI Final: ${hand} ${pos} ${bb}bb — ${result.reason}`);
          }
        }
      }
    }
  });
});
