import { CommandInteraction } from "discord.js";
import { NewClient } from "./Client";

export interface CommandType {
    name: string;
    description?: string;
    run: (client: NewClient, interaction: CommandInteraction) => void;
}