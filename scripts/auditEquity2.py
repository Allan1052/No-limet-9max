# Validação Monte Carlo com ranges ADEQUADOS (não aleatórios) das equities citadas nos cards.
import random
from collections import Counter

random.seed(7)

RANKS = "23456789TJQKA"
SUITS = "cdhs"
ALL = [r + s for r in RANKS for s in SUITS]
ORDER = "23456789TJQKA"


def parse(h):
    """'AdQh' -> [(14,'d'),(12,'h')]"""
    out = []
    i = 0
    while i < len(h):
        out.append((ORDER.index(h[i]) + 2, h[i + 1]))
        i += 2
    return out


def eval5(cards):
    vals = [c[0] for c in cards]
    suits = [c[1] for c in cards]
    counts = Counter(vals)
    flush = len(set(suits)) == 1
    uniq = sorted(set(vals), reverse=True)
    straight = False
    high = 0
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
        return (800 + high,)
    if groups[0][1] == 4:
        return (700 + groups[0][0],)
    if groups[0][1] == 3 and groups[1][1] == 2:
        return (600 + groups[0][0],)
    if flush:
        return (500 + uniq[0],)
    if straight:
        return (400 + high,)
    if groups[0][1] == 3:
        return (300 + groups[0][0],)
    if groups[0][1] == 2 and groups[1][1] == 2:
        t = max(groups[0][0], groups[1][0])
        b = min(groups[0][0], groups[1][0])
        return (200 + t, b)
    if groups[0][1] == 2:
        ks = sorted([n for n, c in counts.items() if c == 1], reverse=True)
        return (100 + groups[0][0], ks[0], ks[1])
    return (0, uniq[0], uniq[1], uniq[2])


# Range de 3-bet BTN citado no card: QQ+, AK, AQs + blefes A5s-A2s, 76s
r3b = []
for r in RANKS:
    if RANKS.index(r) >= RANKS.index("Q"):
        for a in SUITS:
            for b in SUITS:
                if a < b:
                    r3b.append(r + a + r + b)
for a in SUITS:
    for b in SUITS:
        if a != b:
            r3b.append("A" + a + "K" + b)
        if a == b:
            r3b.append("A" + a + "Q" + b)
for a in SUITS:
    for r2 in ["2", "3", "4", "5"]:
        r3b.append("A" + a + r2 + a)
    r3b.append("7" + a + "6" + a)
r3b = list(set(r3b))

# Range de open UTG (~16%): 22+, ATo+, KQo+, A5s-A2s, KTs+, QJs, JTs, T9s
openutg = []
for r in RANKS:
    for a in SUITS:
        for b in SUITS:
            if a < b:
                openutg.append(r + a + r + b)
for a in SUITS:
    for b in SUITS:
        if a != b:
            openutg.append("A" + a + "T" + b)
            openutg.append("A" + a + "J" + b)
            openutg.append("A" + a + "Q" + b)
            openutg.append("A" + a + "K" + b)
            openutg.append("K" + a + "Q" + b)
        if a == b:
            for r2 in ["2", "3", "4", "5"]:
                openutg.append("A" + a + r2 + a)
            for k in ["T", "J", "Q", "K"]:
                openutg.append("K" + a + k + a)
            openutg.append("Q" + a + "J" + a)
            openutg.append("J" + a + "T" + a)
            openutg.append("T" + a + "9" + a)
openutg = list(set(openutg))


def equity(h, vrange, n=40000):
    dead = set(parse(h))
    deck = [c for c in ALL if c not in dead]
    wins = 0
    ties = 0
    used = 0
    vr = set(vrange)
    while used < n:
        random.shuffle(deck)
        v = deck[0] + deck[1]
        if v not in vr:
            continue
        board = deck[2:7]
        bc = [(ORDER.index(b[0]) + 2, b[1]) for b in board]
        w = eval5(parse(h) + bc)
        vv = eval5(parse(v) + bc)
        if w > vv:
            wins += 1
        elif w == vv:
            ties += 0.5
        used += 1
    return (wins + ties) / n


print(f"Range 3-bet BTN: {len(r3b)} combos | Range open UTG: {len(openutg)} combos")
scenarios = [
    ("A" + SUITS[0] + "Q" + SUITS[1], r3b, "AQo vs 3-bet BTN (card técnico cita ~36–44%; card Meta cita ~44% bruta)"),
    ("A" + SUITS[0] + "7" + SUITS[2], r3b, "A7o vs 3-bet BTN (card técnico cita ~30% 'Ax off baixo')"),
    ("A" + SUITS[0] + "T" + SUITS[2], r3b, "ATo vs 3-bet BTN (card técnico cita 'Ax off baixo' ~30%)"),
    ("2c2d", openutg, "22 vs open UTG (card técnico cita ~27%)"),
    ("3" + SUITS[0] + "2" + SUITS[0], openutg, "32s vs open UTG (card cita ~44% equity do SC)"),
]
for h, rng, label in scenarios:
    eq = equity(h, rng)
    print(f"[{label}] MC: {eq*100:.1f}%")
