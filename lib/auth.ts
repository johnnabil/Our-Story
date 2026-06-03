import { timingSafeEqual } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60
  },
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const submittedPassword =
          typeof credentials?.password === "string" ? credentials.password : "";
        const editPassword = process.env.EDIT_PASSWORD ?? "";

        if (!editPassword) {
          return null;
        }

        const encoder = new TextEncoder();
        const a = encoder.encode(submittedPassword);
        const b = encoder.encode(editPassword);

        if (a.byteLength === b.byteLength && timingSafeEqual(a, b)) {
          return {
            id: "admin",
            name: "Admin"
          };
        }

        return null;
      }
    })
  ]
});
