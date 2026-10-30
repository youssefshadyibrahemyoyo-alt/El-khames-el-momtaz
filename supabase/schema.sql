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

-- 3. Core RPCs & Storage Buckets:
--   - Buckets: 'player-photos' (admin player cards) & 'manager-avatars' (logged-in manager profile pics)
--   - public.update_my_manager_profile(p_display_name, p_team_name, p_avatar_url)
--   - public.save_pre_gw_lineup(p_captain, p_vice, p_player_ids, p_chip) [saves squad into manager_saved_lineups pre-GW1 or between finished GWs]
--   - public.save_squad(p_gameweek_id, p_captain, p_vice, p_player_ids, p_chip) [GW1 = 0 hits, uses profiles.budget, mirrors manager_saved_lineups]
--   - public.admin_generate_gameweek(p_transfer_deadline) [confirmed GW creation + auto-materializes manager_saved_lineups + H2H & Cup sync]
--   - public.preview_gameweek_price_changes(p_gameweek_id)[FPL price rise/drop preview]
--   - public.admin_end_gameweek(p_gameweek_id, p_price_changes) [applies price deltas & grows owners' budgets]
--   - public.admin_reset_all_rounds()                     [reset season/test rounds & budgets to GW1]
--   - public.start_gameweek(p_gameweek_id)                [auto-rolls over missing squads + syncs H2H]
--   - public.league_standings()                           [season standings with avatar, team_name & budget]
--   - public.gameweek_standings(p_gameweek_id)            [single-GW standings]
--   - public.get_h2h_overview(p_gameweek_id)              [weekly 1v1 fixtures & H2H standings]
--   - public.get_public_matches(p_gameweek_id)            [public 15-min match feed + MVP & Hat-tricks]
--   - public.get_gameweek_highlights(p_gameweek_id)       [Team of the Week Dream 5 + Banter Trophies]
--   - public.inspect_gameweek_squad(p_gw, p_mgr)          [post-deadline squad & points inspector]
--   - public.get_player_profile(p_player_id)              [full player profile, bio, availability & career stats]
--   - public.save_match_stats(p_match_id, p_rows)         [atomic match stats entry incl. is_mvp]
--   - public.get_fan_potn_poll(p_gameweek_id)             [Fans' Vote: Player of the Night poll & live tallies]
--   - public.cast_fan_potn_vote(p_gameweek_id, p_player)  [cast/update logged-in fan vote]
--   - public.admin_create_cup(p_name)                     [launch single-elimination Knockout Cup bracket]
--   - public.get_cup_overview()                           [Knockout Cup bracket ties & Cup Champion]
--   - public.get_manager_trophy_cabinet()                 [permanent GW Winner & Cup Champion counts per manager]
--   - public.admin_list_members()                         [admin member list with registered auth emails]
--   - public.admin_reset_member_password(p_user, p_pass)  [instant 1-click admin password reset]
--   - public.get_player_form_map()                        [3-GW rolling fantasy form average per player]
--   - public.list_league_months()                         [scored Cairo calendar months for monthly tables]
--   - public.monthly_standings(p_month_key)               [Manager of the Month standings per YYYY-MM]
--   - public.get_league_news_feed()                       [Clubhouse Bulletins + automatic Live League Wire]
--   - public.admin_post_news / admin_toggle_pin_news / admin_delete_news
--   - public.get_season_records()                         [All-Time Season Hall of Records]
--   - public.get_gameweek_scout(p_gameweek_id)            [Post-deadline Most Captained %, Most Owned % & Chips Active]
--   - public.league_standings()                           [includes rank_delta arrows vs previous scored GW]
--   - 4 Chips supported across save_squad / save_pre_gw_lineup: Triple Captain, Wildcard, Bench Boost, Free Hit

