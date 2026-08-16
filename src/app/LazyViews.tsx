import { lazy, type ComponentType } from "react";

// Code-splitting por rota: as views de treino, estudo e utilidades não
// participam do primeiro paint do app. Elas carregam sob demanda quando o
// jogador navega até elas (bundle principal ~400KB mais leve no primeiro
// carregamento, critico em 4G fraco e celulares modestos).
export const IcmCalculator = lazy(() => import("../ui/IcmCalculator").then((m) => ({ default: m.IcmCalculator })));
export const UltraTrainer = lazy(() => import("../ui/UltraTrainer").then((m) => ({ default: m.UltraTrainer })));
export const StreetTrainer = lazy(() => import("../ui/StreetTrainer").then((m) => ({ default: m.StreetTrainer })));
export const DrillView = lazy(() => import("../ui/DrillView").then((m) => ({ default: m.DrillView })));
export const HandLab = lazy(() => import("../ui/HandLab").then((m) => ({ default: m.HandLab })));
export const CampaignView = lazy(() => import("../ui/CampaignView").then((m) => ({ default: m.CampaignView })));
export const TrainView = lazy(() => import("../ui/TrainView").then((m) => ({ default: m.TrainView })));
export const LearnTrailView = lazy(() => import("../ui/LearnTrailView").then((m) => ({ default: m.LearnTrailView })));
export const Leaderboard = lazy(() => import("../ui/Leaderboard").then((m) => ({ default: m.Leaderboard })));
export const AnatomiaTorneio = lazy(() => import("../ui/AnatomiaTorneio").then((m) => ({ default: m.AnatomiaTorneio })));
export const ProfileView = lazy(() => import("../ui/ProfileView").then((m) => ({ default: m.ProfileView })));
export const ImportView = lazy(() => import("../ui/ImportView").then((m) => ({ default: m.ImportView })));
export const MissionsPanel = lazy(() => import("../ui/MissionsPanel").then((m) => ({ default: m.MissionsPanel })));
export const RangeGrid = lazy(() => import("../ui/RangeGrid").then((m) => ({ default: m.RangeGrid })));
export const TournamentSetup = lazy(() => import("../ui/Tournament").then((m) => ({ default: m.TournamentSetup })));
export const AchievementsPanel = lazy(() => import("../ui/AchievementsPanel").then((m) => ({ default: m.AchievementsPanel })));
export const FinalTableTrainer = lazy(() => import("../ui/FinalTableTrainer").then((m) => ({ default: m.FinalTableTrainer })));

// Helper para assinar componentes lazy como ComponentType esperado pelos ternários
export function asLazy<C>(component: ComponentType<C>): ComponentType<C> {
  return component as ComponentType<C>;
}
