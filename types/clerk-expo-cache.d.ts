declare module "@clerk/clerk-expo/dist/cache" {
  export type TokenCache = {
    getToken: (key: string) => Promise<string | null>;
    saveToken: (key: string, token: string) => Promise<void>;
  };
}
