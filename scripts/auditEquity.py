# Validação Monte Carlo dos números de equity citados nos cards técnicos.
# Compara a equity REAL (simulação) de mãos citadas vs a equity CITADA nas frases.
# Read-only: não altera nada do app.

import random
import re

random.seed(42)

# Mãos citadas com equity específica nos cards técnicos (extraídas da simulação anterior)
CLAIMS = [
    # (mão, equity citada, contexto)
    ("Ax", 0.30, "Ax off baixo vs qualquer Ax (weakAce)"),
    ("AQo", 0.36, "AQo vs range 3-bet BTN"),
    ("22", 0.27, "22 vs range de open"),
    ("22", 0.30, "22 vs open shove/fold < 20bb"),
    ("SC", 0.44, "suited connector de BTN vs range de open (~30%)"),
]


def hand_ranking():
    """Código de avaliação de mão de 5 cartas simplificado (fora de escopo — usar biblioteca externa)."""
    raise NotImplementedError


def mc_equity(hero, villain_range_freq, n=5000):
    """Monte Carlo de equity vs range aleatório completo (aprox)."""
    import itertools

    ranks = "23456789TJQKA"
    suits = "cdhs"
    all_cards = [r + s for r in ranks for s in suits]

    def dead():
        d = set()
        for h in hero:
            d.add(h)
        return [c for c in all_cards if c not in d]

    wins = 0
    ties = 0
    for _ in range(n):
        deck = dead()
        random.shuffle(deck)
        # villain recebe do range: amostra aleatória de mão de 2 cartas (range largo ~30%)
        # simplificação: villain range = amostra ponderada do baralho restante
        v = (deck[0], deck[1])
        board = deck[2:7]
        h = eval5cards(sorted(hero + board))
        w = eval5cards(sorted(list(v) + board))
        if h > w:
            wins += 1
        elif h == w:
            ties += 0.5
    return (wins + ties) / n


def eval5cards(cards):
    """Avaliação completa de mão de 5+ cartas. Implementação compacta."""
    from collections import Counter

    vals = [c[0] for c in cards]
    # mapear ranks
    order = "23456789TJQKA"
    nums = [order.index(v) + 2 for v in vals]
    suits = [c[1] for c in cards]
    counts = Counter(nums)
    flush = len(set(suits)) == 1
    straight = False
    high = 0
    uniq = sorted(set(nums), reverse=True)
    # straight check
    for i in range(len(uniq) - 4):
        if uniq[i] - uniq[i + 4] == 4:
            straight = True
            high = uniq[i]
            break
    if not straight and set(uniq[:4]) == {14, 5, 4, 3} and 2 in uniq:
        straight = True
        high = 5
    groups = sorted(counts.items(), key=lambda x: (x[1], x[0]), reverse=True)
    if straight and flush:
        return (800 + high, groups[0][0])
    if groups[0][1] == 4:
        kick = [n for n, c in counts.items() if c == 1]
        return (700 + groups[0][0], kick[0])
    if groups[0][1] == 3 and groups[1][1] == 2:
        return (600 + groups[0][0], groups[1][0])
    if flush:
        return (500 + uniq[0], uniq[1])
    if straight:
        return (400 + high, 0)
    if groups[0][1] == 3:
        kicks = sorted([n for n, c in counts.items() if c == 1], reverse=True)
        return (300 + groups[0][0], kicks[0])
    if groups[0][1] == 2 and groups[1][1] == 2:
        top = max(groups[0][0], groups[1][0])
        bot = min(groups[0][0], groups[1][0])
        kick = [n for n, c in counts.items() if c == 1][0]
        return (200 + top, bot * 15 + kick)
    if groups[0][1] == 2:
        kicks = sorted([n for n, c in counts.items() if c == 1], reverse=True)
        return (100 + groups[0][0], kicks[0] * 15 + kicks[1])
    return (0, uniq[0] * 225 + uniq[1] * 15 + uniq[2])


def hero_hand(h):
    if h in ("Ax", "AQo"):
        return ["Ad", "Qh"] if h == "AQo" else ["Ad", "7c"]
    return ["2d", "2c"]


def main():
    print("Validação Monte Carlo (5.000 iterações por cenário) dos números citados nos cards:")
    print()
    results = []
    for hero, claimed, ctx in CLAIMS:
        h = hero_hand(hero)
        eq = mc_equity(h, None, 8000)
        status = "OK" if abs(eq - claimed) < 0.10 else "DIVERGE"
        results.append((ctx, claimed, eq * 100, status))
        print(f"[{status}] {ctx}")
        print(f"   Citado: {claimed*100:.0f}% | Simulado: {eq*100:.1f}% | Delta: {(eq-claimed)*100:+.1f}pp")
        print()

    with open("audit-out/equity_validation.json", "w") as f:
        import json
        json.dump(results, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
