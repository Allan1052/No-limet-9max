// Modal do "range por jogador" (modo avançado): mostra a grade que o jogador
// deveria jogar naquele spot — abrir (RFI) ou defender contra o raise — com a
// mão real dele em destaque e um selo dizendo em que categoria ela caía.

import { useMemo } from "react";
import { useT } from "../i18n";
import { CardView } from "./Card";
import { SpotRangeGrid } from "./SpotRangeGrid";
import { spotRangeGrid, type SpotCategory } from "../ranges/spotGrid";
import { BASELINE_PROFILE } from "../bots/profiles";
import type { PlayerSpot } from "../app/handSpots";

const CAT_KEY: Record<SpotCategory, string> = {
  open: "spot.cat.open",
  "3bet": "spot.cat.3bet",
  "4bet": "spot.cat.4bet",
  call: "spot.cat.call",
  limp: "spot.cat.limp",
  fold: "spot.cat.fold",
};

export function SpotRangePopup({ spot, onClose }: { spot: PlayerSpot; onClose: () => void }) {
  const { t } = useT();
  const facing = spot.raiserPosition != null;

  const cells = useMemo(
    () =>
      spotRangeGrid({
        heroPosition: spot.position,
        effectiveBB: spot.effectiveBB,
        profile: BASELINE_PROFILE,
        raiserPosition: spot.raiserPosition,
        openSizeBB: spot.openSizeBB,
      }),
    [spot.position, spot.effectiveBB, spot.raiserPosition, spot.openSizeBB],
  );

  // Segunda grade: o jogador abriu e levou 3-bet → 4-bet / pagar / foldar.
  const cells3bet = useMemo(
    () =>
      spot.vs3bet
        ? spotRangeGrid({
            heroPosition: spot.position,
            effectiveBB: spot.effectiveBB,
            profile: BASELINE_PROFILE,
            raiserPosition: spot.vs3bet.threeBettorPosition,
            openSizeBB: spot.vs3bet.threeBetSizeBB,
            threeBet: true,
          })
        : null,
    [spot.position, spot.effectiveBB, spot.vs3bet],
  );

  const realCat = cells[spot.handType]?.category ?? "fold";
  const realCat3bet = cells3bet ? cells3bet[spot.handType]?.category ?? "fold" : null;
  const who = spot.isHero ? t("spot.you") : spot.name;
  const title = facing
    ? t("spot.defendTitle", {
        who,
        pos: spot.position,
        raiser: spot.raiserPosition!,
        size: (spot.openSizeBB ?? 2.3).toFixed(1),
      })
    : t("spot.openTitle", { who, pos: spot.position });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="replay spot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="spot-head">
          <h3>{title}</h3>
          <div className="spot-depth">{spot.effectiveBB}bb</div>
        </div>

        {spot.cards.length >= 2 ? (
          <div className="spot-realhand">
            <div className="spot-cards">
              {spot.cards.map((c, i) => (
                <CardView key={i} card={c} />
              ))}
            </div>
            <div className={`spot-verdict cat-${realCat}`}>
              {t("spot.handWas", { hand: prettyHand(spot.handType) })}{" "}
              <b>{t(CAT_KEY[realCat] as never)}</b>
            </div>
          </div>
        ) : (
          <div className="spot-verdict" style={{ marginBottom: 12 }}>
            {t("spot.noCards")}
          </div>
        )}

        <SpotRangeGrid cells={cells} highlight={spot.handType || undefined} />

        <div className="spot-legend">
          {facing ? (
            <>
              <Swatch cls="cat-3bet" label={t("spot.cat.3bet")} />
              <Swatch cls="cat-call" label={t("spot.cat.call")} />
              <Swatch cls="cat-fold" label={t("spot.cat.fold")} />
            </>
          ) : (
            <>
              <Swatch cls="cat-open" label={t("spot.cat.open")} />
              <Swatch cls="cat-fold" label={t("spot.cat.fold")} />
            </>
          )}
        </div>

        <p className="spot-note">{facing ? t("spot.noteDefend") : t("spot.noteOpen")}</p>

        {cells3bet && spot.vs3bet ? (
          <div className="spot-section">
            <h4 className="spot-section-title">
              {t("spot.vs3betTitle", {
                who,
                raiser: spot.vs3bet.threeBettorPosition,
                size: spot.vs3bet.threeBetSizeBB.toFixed(1),
              })}
            </h4>

            {spot.cards.length >= 2 && realCat3bet ? (
              <div className={`spot-verdict cat-${realCat3bet}`} style={{ marginBottom: 12 }}>
                {t("spot.handWas", { hand: prettyHand(spot.handType) })}{" "}
                <b>{t(CAT_KEY[realCat3bet] as never)}</b>
              </div>
            ) : null}

            <SpotRangeGrid cells={cells3bet} highlight={spot.handType || undefined} />

            <div className="spot-legend">
              <Swatch cls="cat-4bet" label={t("spot.cat.4bet")} />
              <Swatch cls="cat-call" label={t("spot.cat.call")} />
              <Swatch cls="cat-fold" label={t("spot.cat.fold")} />
            </div>

            <p className="spot-note">{t("spot.note4bet")}</p>
          </div>
        ) : null}

        <button className="btn" style={{ width: "100%" }} onClick={onClose}>
          {t("spot.close")}
        </button>
      </div>
    </div>
  );
}

function Swatch({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="spot-sw-item">
      <span className={`spot-sw ${cls}`} /> {label}
    </span>
  );
}

/** "AKs" → "A♠K♠"?  Não temos naipe aqui; mostramos "AKs"/"AKo"/"AA" legível. */
function prettyHand(handType: string): string {
  return handType;
}
