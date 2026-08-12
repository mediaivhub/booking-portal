import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: "admin" | "nurse";
      initials?: string;
    };
  }

  interface User {
    role: "admin" | "nurse";
    initials?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    userId: string;
    initials?: string;
  }
}
