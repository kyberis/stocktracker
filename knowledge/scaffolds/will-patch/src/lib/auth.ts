import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";

/**
 * Will auth, after IdP cutover.
 *
 * One OIDC provider, the IdP at user.trefolio.com. Local password / Google
 * providers have been removed; users sign up and manage credentials on the
 * IdP only.
 *
 * The `signIn` callback writes through to local `User.dailyAgentMessageLimit`
 * so quota checks in agent-quota.ts keep working without a network round-trip.
 *
 * See knowledge/design-docs/will-idp-integration.md (in trefolio repo).
 */

const FREE_DAILY_LIMIT = 30;

interface IdpProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  locale?: string;
  pro_until?: string;
  entitlements?: {
    trefolio_pro: boolean;
    clara_daily_limit: number;
    will_daily_limit: number;
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    {
      id: "trefolio-id",
      name: "Trefolio Account",
      type: "oauth",
      wellKnown: `${process.env.IDP_BASE_URL}/.well-known/openid-configuration`,
      authorization: { params: { scope: "openid email profile entitlements" } },
      clientId: process.env.IDP_CLIENT_ID,
      clientSecret: process.env.IDP_CLIENT_SECRET,
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile: IdpProfile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name ?? null,
          image: null,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile) return false;
      const p = profile as unknown as IdpProfile;
      const limit = p.entitlements?.will_daily_limit ?? FREE_DAILY_LIMIT;
      await db.user.upsert({
        where: { idpSub: p.sub },
        create: {
          idpSub: p.sub,
          email: p.email,
          name: p.name,
          dailyAgentMessageLimit: limit,
        },
        update: {
          email: p.email,
          name: p.name,
          dailyAgentMessageLimit: limit,
        },
      });
      return true;
    },
    async jwt({ token, profile }) {
      if (profile) {
        const p = profile as unknown as IdpProfile;
        token.sub = p.sub;
        token.email = p.email;
        token.entitlements = p.entitlements;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub);
        session.user.entitlements = token.entitlements as unknown as IdpProfile["entitlements"];
      }
      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);
