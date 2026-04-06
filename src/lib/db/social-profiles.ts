import { ensureInitialized } from "./client";
import { str, num, parseExperienceLevel } from "./helpers";

export type SocialVisibility = "public" | "private";

export interface SocialProfile {
  userId: string;
  displayName: string;
  avatarUrl: string;
  profileSlug: string;
  bio: string;
  headline: string;
  socialVisibility: SocialVisibility;
  experienceLevel: string;
  sharePortfolioValue: boolean;
  shareHoldings: boolean;
  allowComments: boolean;
  connectionCount: number;
  postCount: number;
}

export interface PublicProfileData extends SocialProfile {
  createdAt: string;
}

const RESERVED_SLUGS = new Set(["admin", "api", "app", "login", "signup", "network", "settings", "profile", "demo", "help", "support", "about", "terms", "privacy", "blog"]);
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  if (!SLUG_REGEX.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  if (slug.includes("--")) return false;
  return true;
}

export async function getSocialProfile(userId: string): Promise<SocialProfile | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.id, u.display_name, u.avatar_url, u.profile_slug, u.bio, u.headline,
            u.social_visibility, u.experience_level, u.share_portfolio_value, u.share_holdings, u.allow_comments,
            (SELECT COUNT(*) FROM user_connections WHERE (requester_id = u.id OR receiver_id = u.id) AND status = 'accepted') as connection_count,
            (SELECT COUNT(*) FROM social_posts WHERE user_id = u.id AND is_draft = 0) as post_count
          FROM users u WHERE u.id = ?`,
    args: [userId],
  });
  if (!result.rows.length) return null;
  const r = result.rows[0];
  return {
    userId: str(r.id),
    displayName: str(r.display_name),
    avatarUrl: str(r.avatar_url),
    profileSlug: str(r.profile_slug),
    bio: str(r.bio),
    headline: str(r.headline),
    socialVisibility: str(r.social_visibility) === "public" ? "public" : "private",
    experienceLevel: parseExperienceLevel(r.experience_level),
    sharePortfolioValue: num(r.share_portfolio_value) === 1,
    shareHoldings: num(r.share_holdings) === 1,
    allowComments: num(r.allow_comments ?? 1) === 1,
    connectionCount: num(r.connection_count),
    postCount: num(r.post_count),
  };
}

export async function getPublicProfileBySlug(slug: string): Promise<PublicProfileData | null> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: `SELECT u.id, u.display_name, u.avatar_url, u.profile_slug, u.bio, u.headline,
            u.social_visibility, u.experience_level, u.share_portfolio_value, u.share_holdings, u.allow_comments, u.created_at,
            (SELECT COUNT(*) FROM user_connections WHERE (requester_id = u.id OR receiver_id = u.id) AND status = 'accepted') as connection_count,
            (SELECT COUNT(*) FROM social_posts WHERE user_id = u.id AND is_draft = 0 AND visibility = 'public') as post_count
          FROM users u WHERE u.profile_slug = ? AND u.profile_slug != ''`,
    args: [slug],
  });
  if (!result.rows.length) return null;
  const r = result.rows[0];
  return {
    userId: str(r.id),
    displayName: str(r.display_name),
    avatarUrl: str(r.avatar_url),
    profileSlug: str(r.profile_slug),
    bio: str(r.bio),
    headline: str(r.headline),
    socialVisibility: str(r.social_visibility) === "public" ? "public" : "private",
    experienceLevel: parseExperienceLevel(r.experience_level),
    sharePortfolioValue: num(r.share_portfolio_value) === 1,
    shareHoldings: num(r.share_holdings) === 1,
    allowComments: num(r.allow_comments ?? 1) === 1,
    connectionCount: num(r.connection_count),
    postCount: num(r.post_count),
    createdAt: str(r.created_at),
  };
}

export async function updateSocialProfile(
  userId: string,
  data: {
    profileSlug?: string;
    bio?: string;
    headline?: string;
    socialVisibility?: SocialVisibility;
    sharePortfolioValue?: boolean;
    shareHoldings?: boolean;
    allowComments?: boolean;
    experienceLevel?: string;
  }
): Promise<void> {
  const client = await ensureInitialized();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (data.profileSlug !== undefined) { sets.push("profile_slug = ?"); args.push(data.profileSlug); }
  if (data.bio !== undefined) { sets.push("bio = ?"); args.push(data.bio.slice(0, 500)); }
  if (data.headline !== undefined) { sets.push("headline = ?"); args.push(data.headline.slice(0, 120)); }
  if (data.socialVisibility !== undefined) { sets.push("social_visibility = ?"); args.push(data.socialVisibility); }
  if (data.sharePortfolioValue !== undefined) { sets.push("share_portfolio_value = ?"); args.push(data.sharePortfolioValue ? 1 : 0); }
  if (data.shareHoldings !== undefined) { sets.push("share_holdings = ?"); args.push(data.shareHoldings ? 1 : 0); }
  if (data.allowComments !== undefined) { sets.push("allow_comments = ?"); args.push(data.allowComments ? 1 : 0); }
  if (data.experienceLevel !== undefined) { sets.push("experience_level = ?"); args.push(data.experienceLevel); }

  if (!sets.length) return;
  args.push(userId);
  await client.execute({
    sql: `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function isSlugAvailable(slug: string, excludeUserId?: string): Promise<boolean> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: excludeUserId
      ? "SELECT id FROM users WHERE profile_slug = ? AND id != ?"
      : "SELECT id FROM users WHERE profile_slug = ?",
    args: excludeUserId ? [slug, excludeUserId] : [slug],
  });
  return result.rows.length === 0;
}
