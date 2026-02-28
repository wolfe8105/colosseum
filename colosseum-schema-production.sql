-- ============================================================
-- THE COLOSSEUM — Production Schema (Item 6.2.2.1)
-- 18 tables, RLS policies, triggers, seed data
-- Paste into Supabase SQL Editor → Run
-- Then paste colosseum-ring3-functions.sql after this
-- ============================================================

-- ========================
-- 1. PROFILES
-- ========================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  date_of_birth DATE,
  is_minor BOOLEAN DEFAULT false,

  -- Stats
  elo_rating INTEGER DEFAULT 1200,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  debates_completed INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,

  -- Economy
  token_balance INTEGER DEFAULT 50,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','contender','champion','creator')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Trust & Profile
  trust_score INTEGER DEFAULT 50,
  profile_depth_pct INTEGER DEFAULT 0,

  -- Soft delete
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles readable" ON public.profiles
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ========================
-- 2. USER SETTINGS
-- ========================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  notif_challenges BOOLEAN DEFAULT true,
  notif_results BOOLEAN DEFAULT true,
  notif_reactions BOOLEAN DEFAULT true,
  notif_follows BOOLEAN DEFAULT true,
  privacy_public_profile BOOLEAN DEFAULT true,
  privacy_debate_history BOOLEAN DEFAULT true,
  privacy_allow_challenges BOOLEAN DEFAULT true,
  audio_auto_mute BOOLEAN DEFAULT false,
  audio_effects BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);


-- ========================
-- 3. PROFILE DEPTH ANSWERS
-- ========================
CREATE TABLE IF NOT EXISTS public.profile_depth_answers (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profile_depth_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own depth" ON public.profile_depth_answers
  FOR ALL USING (auth.uid() = user_id);


-- ========================
-- 4. COSMETICS
-- ========================
CREATE TABLE IF NOT EXISTS public.cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('border','badge','effect')),
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common','rare','legendary')),
  description TEXT,
  css_class TEXT,
  price_tokens INTEGER DEFAULT 0,
  price_usd NUMERIC(6,2) DEFAULT 0,
  required_tier TEXT DEFAULT 'free',
  required_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cosmetics public read" ON public.cosmetics
  FOR SELECT USING (is_active = true);


-- ========================
-- 5. USER COSMETICS (inventory)
-- ========================
CREATE TABLE IF NOT EXISTS public.user_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cosmetic_id UUID NOT NULL REFERENCES public.cosmetics(id),
  equipped BOOLEAN DEFAULT false,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, cosmetic_id)
);

ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own cosmetics" ON public.user_cosmetics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own cosmetics" ON public.user_cosmetics
  FOR ALL USING (auth.uid() = user_id);


-- ========================
-- 6. ACHIEVEMENTS
-- ========================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'general',
  requirement_type TEXT,
  requirement_value INTEGER DEFAULT 0,
  reward_tokens INTEGER DEFAULT 0,
  reward_cosmetic_id UUID REFERENCES public.cosmetics(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements public read" ON public.achievements
  FOR SELECT USING (is_active = true);


-- ========================
-- 7. USER ACHIEVEMENTS
-- ========================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public achievement display" ON public.user_achievements
  FOR SELECT USING (true);


-- ========================
-- 8. FOLLOWS
-- ========================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows public read" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users manage own follows" ON public.follows
  FOR ALL USING (auth.uid() = follower_id);


-- ========================
-- 9. NOTIFICATIONS
-- ========================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);


-- ========================
-- 10. DEBATES
-- ========================
CREATE TABLE IF NOT EXISTS public.debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  format TEXT DEFAULT 'standard' CHECK (format IN ('standard','crossfire','qa_prep')),
  
  debater_a UUID REFERENCES public.profiles(id),
  debater_b UUID REFERENCES public.profiles(id),
  winner UUID REFERENCES public.profiles(id),
  
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','matched','live','voting','completed','canceled')),
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 5,
  
  votes_a INTEGER DEFAULT 0,
  votes_b INTEGER DEFAULT 0,
  
  elo_change_a INTEGER,
  elo_change_b INTEGER,
  
  spectator_count INTEGER DEFAULT 0,
  recording_url TEXT,
  transcript JSONB,
  
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_debates_status ON public.debates(status, created_at DESC);
CREATE INDEX idx_debates_debater_a ON public.debates(debater_a);
CREATE INDEX idx_debates_debater_b ON public.debates(debater_b);

ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Debates public read" ON public.debates
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users create debates" ON public.debates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Debaters update own debates" ON public.debates
  FOR UPDATE USING (auth.uid() IN (debater_a, debater_b));


-- ========================
-- 11. DEBATE VOTES
-- ========================
CREATE TABLE IF NOT EXISTS public.debate_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voted_for TEXT NOT NULL CHECK (voted_for IN ('a','b')),
  round_number INTEGER DEFAULT 0,
  voted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(debate_id, user_id, round_number)
);

CREATE INDEX idx_debate_votes_debate ON public.debate_votes(debate_id);

ALTER TABLE public.debate_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes public read" ON public.debate_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users vote" ON public.debate_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ========================
-- 12. PREDICTIONS
-- ========================
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  predicted_winner TEXT NOT NULL CHECK (predicted_winner IN ('a','b')),
  tokens_wagered INTEGER DEFAULT 0,
  correct BOOLEAN,
  payout INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(debate_id, user_id)
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictions public read" ON public.predictions
  FOR SELECT USING (true);

CREATE POLICY "Users create own predictions" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ========================
-- 13. REPORTS
-- ========================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  reported_user_id UUID REFERENCES public.profiles(id),
  debate_id UUID REFERENCES public.debates(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users read own reports" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);


-- ========================
-- 14. TOKEN TRANSACTIONS
-- ========================
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn','spend','purchase','refund','reward','wager','payout')),
  source TEXT,
  description TEXT,
  balance_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_token_tx_user ON public.token_transactions(user_id, created_at DESC);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions" ON public.token_transactions
  FOR SELECT USING (auth.uid() = user_id);


-- ========================
-- 15. PAYMENTS
-- ========================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_payment_id TEXT,
  stripe_subscription_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  type TEXT CHECK (type IN ('subscription','token_purchase','tip','tournament_entry')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_user ON public.payments(user_id, created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);


-- ========================
-- 16. ASYNC DEBATES (Hot Takes that escalated)
-- ========================
CREATE TABLE IF NOT EXISTS public.async_debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hot_take_id UUID,
  topic TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  challenger_id UUID NOT NULL REFERENCES public.profiles(id),
  defender_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','active','voting','completed')),
  rounds JSONB DEFAULT '[]',
  votes_challenger INTEGER DEFAULT 0,
  votes_defender INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.async_debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Async debates public read" ON public.async_debates
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users create async" ON public.async_debates
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Participants update async" ON public.async_debates
  FOR UPDATE USING (auth.uid() IN (challenger_id, defender_id));


-- ========================
-- 17. HOT TAKES
-- ========================
CREATE TABLE IF NOT EXISTS public.hot_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  section TEXT DEFAULT 'trending',
  reaction_count INTEGER DEFAULT 0,
  challenge_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hot_takes_section ON public.hot_takes(section, created_at DESC);
CREATE INDEX idx_hot_takes_user ON public.hot_takes(user_id);

ALTER TABLE public.hot_takes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hot takes public read" ON public.hot_takes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users create hot takes" ON public.hot_takes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own takes" ON public.hot_takes
  FOR DELETE USING (auth.uid() = user_id);


-- ========================
-- 18. HOT TAKE REACTIONS
-- ========================
CREATE TABLE IF NOT EXISTS public.hot_take_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hot_take_id UUID NOT NULL REFERENCES public.hot_takes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT DEFAULT 'fire',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hot_take_id, user_id)
);

ALTER TABLE public.hot_take_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions public read" ON public.hot_take_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users manage own reactions" ON public.hot_take_reactions
  FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, date_of_birth, is_minor)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)),
    COALESCE(new.raw_user_meta_data->>'display_name', 'Gladiator'),
    (new.raw_user_meta_data->>'date_of_birth')::date,
    CASE WHEN (new.raw_user_meta_data->>'date_of_birth') IS NOT NULL
      THEN (now() - (new.raw_user_meta_data->>'date_of_birth')::date) < interval '18 years'
      ELSE false
    END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Auto-update reaction counts
CREATE OR REPLACE FUNCTION public.update_reaction_count()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hot_takes SET reaction_count = reaction_count + 1 WHERE id = NEW.hot_take_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hot_takes SET reaction_count = GREATEST(0, reaction_count - 1) WHERE id = OLD.hot_take_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_reaction_change ON public.hot_take_reactions;
CREATE TRIGGER on_reaction_change
  AFTER INSERT OR DELETE ON public.hot_take_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_reaction_count();


-- Auto-update follower notification
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_follower_name TEXT;
BEGIN
  SELECT display_name INTO v_follower_name FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.following_id,
    'follow',
    COALESCE(v_follower_name, 'Someone') || ' followed you',
    'You have a new follower!',
    json_build_object('follower_id', NEW.follower_id)::jsonb
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_follow ON public.follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_follower();


-- Updated_at auto-touch
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS settings_updated ON public.user_settings;
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================
-- SEED DATA — 45 Cosmetics
-- ============================================================
INSERT INTO public.cosmetics (name, type, rarity, description, css_class, price_tokens, required_tier) VALUES
  -- Borders (15)
  ('Bronze Ring', 'border', 'common', 'Simple bronze frame', 'border-bronze', 50, 'free'),
  ('Silver Ring', 'border', 'common', 'Clean silver frame', 'border-silver', 100, 'free'),
  ('Gold Ring', 'border', 'common', 'Classic gold frame', 'border-gold', 200, 'free'),
  ('Flame Border', 'border', 'rare', 'Animated fire edge', 'border-flame', 500, 'contender'),
  ('Ice Border', 'border', 'rare', 'Frost crystal edge', 'border-ice', 500, 'contender'),
  ('Lightning Border', 'border', 'rare', 'Electric pulse edge', 'border-lightning', 500, 'contender'),
  ('Neon Red', 'border', 'rare', 'Glowing red outline', 'border-neon-red', 400, 'contender'),
  ('Neon Blue', 'border', 'rare', 'Glowing blue outline', 'border-neon-blue', 400, 'contender'),
  ('Neon Gold', 'border', 'rare', 'Glowing gold outline', 'border-neon-gold', 600, 'champion'),
  ('Diamond Frame', 'border', 'legendary', 'Sparkling diamond edge', 'border-diamond', 1500, 'champion'),
  ('Champion Laurel', 'border', 'legendary', 'Golden laurel wreath', 'border-laurel', 2000, 'champion'),
  ('Dragon Scale', 'border', 'legendary', 'Animated dragon scales', 'border-dragon', 2500, 'creator'),
  ('Void Border', 'border', 'legendary', 'Dark matter pulsing', 'border-void', 3000, 'creator'),
  ('Gladiator Shield', 'border', 'legendary', 'Roman shield frame', 'border-gladiator', 2000, 'champion'),
  ('Colosseum Arch', 'border', 'legendary', 'Stone arch frame', 'border-arch', 2500, 'creator'),
  -- Badges (18)
  ('First Blood', 'badge', 'common', 'Won first debate', 'badge-first-blood', 0, 'free'),
  ('Hot Streak', 'badge', 'common', '3 wins in a row', 'badge-hot-streak', 0, 'free'),
  ('Fire Starter', 'badge', 'common', 'Posted 10 hot takes', 'badge-fire-starter', 0, 'free'),
  ('Debate DNA', 'badge', 'common', 'Profile depth: Debate DNA complete', 'badge-debate-dna', 0, 'free'),
  ('Values Badge', 'badge', 'common', 'Profile depth: Values complete', 'badge-values', 0, 'free'),
  ('Veteran', 'badge', 'common', 'Profile depth: Debate History complete', 'badge-veteran', 0, 'free'),
  ('Lifestyle', 'badge', 'common', 'Profile depth: Lifestyle complete', 'badge-lifestyle', 0, 'free'),
  ('Sharp Tongue', 'badge', 'rare', '10 wins total', 'badge-sharp-tongue', 300, 'free'),
  ('Iron Will', 'badge', 'rare', 'Came back from 0-3', 'badge-iron-will', 500, 'free'),
  ('Crowd Favorite', 'badge', 'rare', '100+ spectator votes received', 'badge-crowd-fav', 400, 'free'),
  ('Oracle', 'badge', 'rare', '10 correct predictions', 'badge-oracle', 300, 'free'),
  ('Kingslayer', 'badge', 'legendary', 'Beat someone 500+ ELO higher', 'badge-kingslayer', 0, 'free'),
  ('Unbreakable', 'badge', 'legendary', '10 win streak', 'badge-unbreakable', 0, 'free'),
  ('Judge Dredd', 'badge', 'rare', 'Moderated 10 debates', 'badge-judge', 0, 'free'),
  ('Jury Duty', 'badge', 'common', 'Served as moderator', 'badge-jury', 0, 'free'),
  ('Recruiter', 'badge', 'rare', 'Referred 5 friends', 'badge-recruiter', 0, 'free'),
  ('Philanthropist', 'badge', 'rare', 'Tipped 1000+ tokens', 'badge-philanthropist', 500, 'contender'),
  ('Centurion', 'badge', 'legendary', '100 debates completed', 'badge-centurion', 0, 'free'),
  -- Effects (12)
  ('Entrance Smoke', 'effect', 'common', 'Smoke puff on match join', 'effect-smoke', 200, 'free'),
  ('Victory Confetti', 'effect', 'common', 'Confetti on win', 'effect-confetti', 200, 'free'),
  ('Win Thunder', 'effect', 'rare', 'Lightning strike on win', 'effect-thunder', 600, 'contender'),
  ('Win Fireworks', 'effect', 'rare', 'Fireworks on win', 'effect-fireworks', 600, 'contender'),
  ('Entrance Fire', 'effect', 'rare', 'Fire burst on match join', 'effect-fire', 800, 'contender'),
  ('Earthquake', 'effect', 'legendary', 'Screen shake on win', 'effect-earthquake', 1500, 'champion'),
  ('Golden Glow', 'effect', 'legendary', 'Avatar golden aura', 'effect-golden-glow', 2000, 'champion'),
  ('Shadow Trail', 'effect', 'legendary', 'Dark trailing effect', 'effect-shadow', 1800, 'champion'),
  ('Crown Descend', 'effect', 'legendary', 'Crown drops on win', 'effect-crown', 2500, 'creator'),
  ('Arena Roar', 'effect', 'legendary', 'Crowd roar audio on win', 'effect-roar', 2000, 'champion'),
  ('Gladiator Entrance', 'effect', 'legendary', 'Full gladiator intro', 'effect-gladiator', 3000, 'creator'),
  ('Meteor Strike', 'effect', 'legendary', 'Meteor on critical win', 'effect-meteor', 3500, 'creator')
ON CONFLICT DO NOTHING;


-- ============================================================
-- SEED DATA — 25 Achievements
-- ============================================================
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, reward_tokens) VALUES
  ('First Blood', 'Win your first debate', '⚔️', 'combat', 'wins', 1, 10),
  ('Getting Warmed Up', 'Win 5 debates', '🔥', 'combat', 'wins', 5, 25),
  ('Sharp Tongue', 'Win 10 debates', '🗡️', 'combat', 'wins', 10, 50),
  ('Gladiator', 'Win 25 debates', '🛡️', 'combat', 'wins', 25, 100),
  ('Centurion', 'Win 100 debates', '🏛️', 'combat', 'wins', 100, 500),
  ('Hot Streak', '3 wins in a row', '🔥', 'streak', 'streak', 3, 15),
  ('On Fire', '5 wins in a row', '💥', 'streak', 'streak', 5, 30),
  ('Unbreakable', '10 wins in a row', '⛓️', 'streak', 'streak', 10, 100),
  ('Legend', '20 wins in a row', '👑', 'streak', 'streak', 20, 250),
  ('Rising Star', 'Reach ELO 1300', '⭐', 'rank', 'elo', 1300, 20),
  ('Contender', 'Reach ELO 1500', '🥊', 'rank', 'elo', 1500, 50),
  ('Elite', 'Reach ELO 1700', '💎', 'rank', 'elo', 1700, 100),
  ('Master', 'Reach ELO 2000', '🏆', 'rank', 'elo', 2000, 250),
  ('Kingslayer', 'Beat someone 500+ ELO higher', '👑', 'special', 'elo_upset', 500, 75),
  ('Oracle', 'Get 10 predictions correct', '🔮', 'prediction', 'correct_predictions', 10, 50),
  ('Prophet', 'Get 50 predictions correct', '📿', 'prediction', 'correct_predictions', 50, 200),
  ('Fire Starter', 'Post 10 hot takes', '🔥', 'social', 'hot_takes', 10, 20),
  ('Influencer', 'Get 100 total reactions', '📢', 'social', 'reactions_received', 100, 50),
  ('Viral', 'Get 1000 total reactions', '🌊', 'social', 'reactions_received', 1000, 200),
  ('Recruiter', 'Refer 5 friends', '📨', 'social', 'referrals', 5, 75),
  ('Judge Dredd', 'Moderate 10 debates', '⚖️', 'moderation', 'moderations', 10, 50),
  ('Jury Duty', 'Serve as moderator for first time', '🔨', 'moderation', 'moderations', 1, 10),
  ('Deep Dive', 'Complete 50% of profile depth', '📊', 'profile', 'profile_depth', 50, 30),
  ('Open Book', 'Complete 100% of profile depth', '📖', 'profile', 'profile_depth', 100, 100),
  ('Philanthropist', 'Tip 1000+ tokens total', '💰', 'economy', 'tokens_tipped', 1000, 50)
ON CONFLICT DO NOTHING;


-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_elo ON public.profiles(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_wins ON public.profiles(wins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_hot_takes_reactions ON public.hot_takes(reaction_count DESC);
