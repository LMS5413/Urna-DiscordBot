export interface VoteOPT {
    msgid?: string;
    number: string;
    type: string;
    infos?: infos[]
}
interface infos {
    deput_code: string;
}