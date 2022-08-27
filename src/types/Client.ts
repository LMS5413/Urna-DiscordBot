import { Client, Collection } from "discord.js";
import { VoteOPT } from "./VoteOPT";

export interface NewClient extends Client {
    vote: Collection<string, VoteOPT>;
}