declare global {
    namespace NodeJS {
        interface ProcessEnv {
            GUILD_ID: string;
            DISCORD_TOKEN: string;
        }
    }
}

export {};
