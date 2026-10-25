/** Campus network protocol v1. Positions are metres: east-positive x, south-positive y. */
export const CAMPUS_PROTOCOL = 1;
export const CAMPUS_MAX_PLAYERS = 8;
export const CAMPUS_ACTIVE_MS = 20_000;
export type CampusId = 'south' | 'north';
export type CampusDirection = 'up' | 'down' | 'left' | 'right';
export type CampusAppearance = { avatar: number };
export type CampusPlayer = {
  id: string; nickname: string; appearance: CampusAppearance; x: number; y: number;
  direction: CampusDirection; moving: boolean; interior: string | null; interiorX:number|null; interiorY:number|null; seq: number; updatedAt: number;
};
export type CampusRoom = {
  id: string; code: string; title: string; campus: CampusId; maxPlayers: number; players?: number;
};
export type CampusMessage = {
  id: number; playerId: string; nickname: string; text: string; createdAt: number; deleted: boolean;
  scope: 'plaza' | 'room'; campus: CampusId;
};
export type CampusSnapshot = {
  type: 'snapshot'; protocol: 1; serverTime: number; selfId: string; room: CampusRoom | null;
  players: CampusPlayer[]; messages: CampusMessage[]; lastMessageId: number;
};

