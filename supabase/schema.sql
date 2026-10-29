-- =============================================================================
-- El Khames El Momtaz — Complete Supabase Schema, Storage, Views & RPCs
-- Applied to project ref: pauejnlhaltdugngipmw
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- 1. Storage bucket for direct player photo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-photos',
  'player-photos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- 2. Leaderboard & player fantasy total views (only finished matches count)
CREATE OR REPLACE VIEW public.top_scorers WITH (security_invoker = on) AS
SELECT
  fp.id AS player_id,
  fp.display_name,
  fp.photo_url,
  COALESCE(SUM(pms.goals) FILTER (WHERE m.status = 'finished'), 0) AS goals
FROM public.football_players fp
LEFT JOIN public.player_match_stats pms ON pms.player_id = fp.id
LEFT JOIN public.matches m ON m.id = pms.match_id
GROUP BY fp.id, fp.display_name, fp.photo_url;

CREATE OR REPLACE VIEW public.top_assists WITH (security_invoker = on) AS
SELECT
  fp.id AS player_id,
  fp.display_name,
  fp.photo_url,
  COALESCE(SUM(pms.assists) FILTER (WHERE m.status = 'finished'), 0) AS assists
FROM public.football_players fp
LEFT JOIN public.player_match_stats pms ON pms.player_id = fp.id
LEFT JOIN public.matches m ON m.id = pms.match_id
GROUP BY fp.id, fp.display_name, fp.photo_url;

CREATE OR REPLACE VIEW public.goal_contributions WITH (security_invoker = on) AS
SELECT
  fp.id AS player_id,
  fp.display_name,
  fp.photo_url,
  COALESCE(SUM(pms.goals) FILTER (WHERE m.status = 'finished'), 0) AS goals,
  COALESCE(SUM(pms.assists) FILTER (WHERE m.status = 'finished'), 0) AS assists,
  COALESCE(SUM(pms.goals + pms.assists) FILTER (WHERE m.status = 'finished'), 0) AS contributions
FROM public.football_players fp
LEFT JOIN public.player_match_stats pms ON pms.player_id = fp.id
LEFT JOIN public.matches m ON m.id = pms.match_id
GROUP BY fp.id, fp.display_name, fp.photo_url;

CREATE OR REPLACE VIEW public.player_ratings WITH (security_invoker = on) AS
SELECT
  fp.id AS player_id,
  fp.display_name,
  fp.photo_url,
  ROUND(AVG(pms.rating) FILTER (WHERE m.status = 'finished'), 2) AS average_rating,
  COUNT(pms.rating) FILTER (WHERE m.status = 'finished') AS rated_matches
FROM public.football_players fp
LEFT JOIN public.player_match_stats pms ON pms.player_id = fp.id
LEFT JOIN public.matches m ON m.id = pms.match_id
GROUP BY fp.id, fp.display_name, fp.photo_url;

CREATE OR REPLACE VIEW public.player_fantasy_totals WITH (security_invoker = on) AS
SELECT
  fp.id AS player_id,
  COALESCE(SUM(
    COALESCE((SELECT points FROM public.scoring_rules WHERE key = 'appearance'), 0)
    + pms.goals            * COALESCE((SELECT points FROM public.scoring_rules WHERE key = 'goal'), 0)
    + pms.assists          * COALESCE((SELECT points FROM public.scoring_rules WHERE key = 'assist'), 0)
    + pms.saves            * COALESCE((SELECT points FROM public.scoring_rules WHERE key = 'save'), 0)
    + pms.penalty_saves    * COALESCE((SELECT points FROM public.scoring_rules WHERE key = 'penalty_save'), 0)
    + pms.penalties_missed * COALESCE((SELECT points FROM public.scoring_rules WHERE key = 'penalty_missed'), 0)
    + pms.yellow_cards     * COALESCE((SELECT points FROM public.scoring_rules WHERE key = 'yellow_card'), 0)
    + pms.red_cards        * COALESCE((SELECT points FROM public.scoring_rules WHERE key = 'red_card'), 0)
    + pms.own_goals        * COALESCE((SELECT points FROM public.scoring_rules WHERE key = 'own_goal'), 0)
  ), 0)::integer AS total_points,
  COUNT(pms.id)::integer AS matches_played
FROM public.football_players fp
LEFT JOIN (
  public.player_match_stats pms
  JOIN public.matches m ON m.id = pms.match_id AND m.status = 'finished'
) ON pms.player_id = fp.id
GROUP BY fp.id;

-- 3. Core RPCs:
--   - public.save_squad(p_gameweek_id, p_captain, p_vice, p_player_ids, p_chip)
--   - public.start_gameweek(p_gameweek_id)           [auto-rolls over missing squads]
--   - public.league_standings()                      [season standings with auto-rollover]
--   - public.gameweek_standings(p_gameweek_id)       [single-GW standings]
--   - public.inspect_gameweek_squad(p_gw, p_mgr)     [post-deadline squad & points inspector]
--   - public.save_match_stats(p_match_id, p_rows)    [atomic match stats entry]
