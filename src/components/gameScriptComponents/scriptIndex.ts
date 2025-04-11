import { RichText, GameScript as ScriptJson } from "./scriptTypes";

export interface Role {
  readonly scriptIndex: ScriptIndex;
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly conversations: Conversation[];
}

export interface IndexItem {
  readonly scriptIndex: ScriptIndex;
  readonly id: string;
  readonly num: number;
}

export interface Room extends IndexItem {
  readonly title: RichText;
  readonly nouns: Noun[];
}

export interface Noun extends IndexItem {
  readonly parentRoom: Room;
  readonly name: string | null;
  readonly title: RichText;
  readonly conversations: Conversation[];
}

export interface Conversation extends IndexItem {
  readonly verb: string | null;
  readonly cond: string | null;
  readonly parentRoom: Room;
  readonly parentNoun: Noun;
  readonly lines: Line[];
  readonly roles: Role[];
  containsRole(roleId: string): boolean;
}

export interface Line {
  readonly scriptIndex: ScriptIndex;
  readonly id: string;
  readonly role: Role;
  readonly text: RichText;
  readonly parentConversation: Conversation;
}

export interface ScriptIndex {
  conversations: { [id: string]: Conversation };
  nouns: { [id: string]: Noun };
  roles: { [id: string]: Role };
  rooms: { [id: string]: Room };
}

export function createIndex(script: ScriptJson): ScriptIndex {
  const index = new ScriptIndexImpl();
  const freezeList: Object[] = [index];
  for (const [id, role] of Object.entries(script.roles)) {
    const roleObj = new RoleImpl(index, id, role.name, role.short_name);
    index.roles[id] = roleObj;
    freezeList.push(roleObj);
  }
  for (const [id, room] of Object.entries(script.rooms)) {
    const roomObj = new RoomImpl(index, id, room.room_id, room.room_title);
    index.rooms[id] = roomObj;
    freezeList.push(roomObj);
  }
  for (const [id, noun] of Object.entries(script.nouns)) {
    const room = index.rooms[noun.room_id];
    const nounObj = new NounImpl(
      index,
      id,
      noun.noun_id,
      noun.noun_name || null,
      noun.noun_title,
      room,
    );
    room.nouns.push(nounObj);
    index.nouns[id] = nounObj;
    freezeList.push(nounObj);
  }
  for (const [id, conversation] of Object.entries(script.conversations)) {
    const noun = index.nouns[conversation.noun];
    const convObj = new ConversationImpl(
      index,
      id,
      conversation.conv_id,
      conversation.verb || null,
      conversation.cond || null,
      noun.parentRoom,
      noun,
    );
    noun.conversations.push(convObj);
    index.conversations[id] = convObj;
    freezeList.push(convObj);

    const roleSet = new Set<Role>();

    for (const line of conversation.lines) {
      const role = index.roles[line.role];
      roleSet.add(role);
      const lineObj = new LineImpl(index, line.id, role, line.text, convObj);
      convObj.lines.push(lineObj);
      freezeList.push(lineObj);
    }

    for (const role of roleSet) {
      convObj.roles.push(role);
      role.conversations.push(convObj);
    }
  }

  for (const freezeObj of freezeList) {
    Object.freeze(freezeObj);
  }

  return index;
}

// Private implementation classes

class ScriptIndexImpl implements ScriptIndex {
  roles: { [id: string]: Role; };
  rooms: { [id: string]: Room; };
  nouns: { [id: string]: Noun; };
  conversations: { [id: string]: Conversation; };

  constructor() {
    this.conversations = Object.create(null);
    this.nouns = Object.create(null);
    this.roles = Object.create(null);
    this.rooms = Object.create(null);
  }
}

class RoleImpl implements Role {
  conversations: Conversation[];

  constructor(
    public scriptIndex: ScriptIndex,
    public id: string,
    public name: string,
    public shortName: string) {
    this.conversations = [];
  }
}

class RoomImpl implements Room {
  nouns: Noun[];

  constructor(
    public scriptIndex: ScriptIndex,
    public id: string,
    public num: number,
    public title: RichText
  ) {
    this.nouns = [];
  }
}

class NounImpl implements Noun {
  conversations: Conversation[];

  constructor(
    public scriptIndex: ScriptIndex,
    public id: string,
    public num: number,
    public name: string | null,
    public title: RichText,
    public parentRoom: Room,
  ) {
    this.conversations = [];
  }
}

class ConversationImpl implements Conversation {
  lines: Line[];
  roles: Role[];
  containsRole(roleId: string): boolean {
    throw new Error("Method not implemented.");
  }

  constructor(
    public scriptIndex: ScriptIndex,
    public id: string,
    public num: number,
    public verb: string | null,
    public cond: string | null,
    public parentRoom: Room,
    public parentNoun: Noun,
  ) {
    this.lines = [];
    this.roles = [];
  }
}

class LineImpl implements Line {
  constructor(
    public scriptIndex: ScriptIndex,
    public id: string,
    public role: Role,
    public text: RichText,
    public parentConversation: Conversation,
  ) {
  }
}