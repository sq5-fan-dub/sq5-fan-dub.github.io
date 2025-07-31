import { RichText } from "./richText";

export interface IndexItem<Raw = number> {
  readonly id: string;
  readonly raw: Raw;
}

export interface Role extends IndexItem<string> {
  readonly name: string;
  readonly shortName: string;
  readonly conversations: Conversation[];
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

export interface Conversation extends IndexItem<[number | null, number | null]> {
  readonly verb: string | null;
  readonly cond: string | null;
  readonly parentRoom: Room;
  readonly parentNoun: Noun;
  readonly lines: Line[];
  readonly roles: Role[];
  containsRole(roleId: string): boolean;
}

export interface Line extends IndexItem {
  readonly role: Role;
  readonly text: RichText;
  readonly parentConversation: Conversation;
}

export interface ScriptIndex {
  conversations: { readonly [id: string]: Conversation };
  nouns: { readonly [id: string]: Noun };
  roles: { readonly [id: string]: Role };
  rooms: { readonly [id: string]: Room };
  lines: { readonly [id: string]: Line };
}