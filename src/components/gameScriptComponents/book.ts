import { RichText, RichTextSegment, RichTextStyle } from "./richText";
import { Conversation, Line, Noun, Role, Room, ScriptIndex } from "./scriptIndex";
import { BookFormat, ConditionItem, ConversationItem, LineItem, LineText, NounItem, RoleItem, RoomItem, VerbItem } from "./scriptTypes"

type EntryIndex<Entry> = {
  [id: string]: Entry;
}

interface Identified {
  id: string;
}

interface EntryBase {
  resolveGraph(book: Book): void;
}

function createIndexFromEntries<T extends Identified, R>(entries: T[], mapFn: (entry: T) => R): EntryIndex<R> {
  const index: EntryIndex<R> = Object.create(null);
  for (const entry of entries) {
    index[entry.id] = mapFn(entry);
  }
  return index;
}

function createLineText(lineText: LineText): RichText {
  if (typeof lineText === 'string') {
    return RichText.ofPlainText(lineText);
  } else if (Array.isArray(lineText)) {
    return new RichText(lineText.map(segment => {
      if (typeof segment === 'string') {
        return new RichTextSegment(new RichTextStyle(false, false), segment);
      } else {
        return new RichTextSegment(
          new RichTextStyle(segment.style.bold, segment.style.italic),
          segment.text
        );
      }
    }));
  }
}

class LineEntry implements EntryBase, Line {
  item_: LineItem;
  richText_: RichText;
  parentConversation_: ConversationEntry;
  role_: RoleEntry;

  constructor(lineItem: LineItem) {
    this.item_ = lineItem;
    this.richText_ = createLineText(lineItem.text);
  }

  resolveGraph(book: Book): void {
    const parentId = book.format_object.conversations[this.item_.parentConversation].id;
    this.parentConversation_ = book.conversations[parentId];
    const roleId = book.format_object.roles[this.item_.role].id;
    this.role_ = book.roles[roleId];
    this.parentConversation_.lines_.push(this);
    this.parentConversation_.roles_.add(this.role_);
  }

  get id(): string {
    return this.item_.id;
  }

  get raw(): number {
    return this.item_.num;
  }

  get role(): Role {
    return this.role_;
  }

  get text(): RichText {
    return this.richText_;
  }

  get parentConversation(): Conversation {
    return this.parentConversation_;
  }
}

class ConversationEntry implements EntryBase, Conversation {
  item_: ConversationItem;
  lines_: LineEntry[];
  parentNoun_: NounEntry;
  roles_: Set<RoleEntry>;
  condition_: ConditionEntry | null;
  verb_: VerbEntry | null;

  constructor(conversationItem: ConversationItem) {
    this.item_ = conversationItem;
    this.lines_ = [];
    this.roles_ = new Set<RoleEntry>();
  }

  resolveGraph(book: Book): void {
    const parentId = book.format_object.nouns[this.item_.parentNoun].id;
    this.parentNoun_ = book.nouns[parentId];
    this.parentNoun_.conversations_.push(this);

    if (this.item_.condition !== null) {
      const conditionId = book.format_object.conditions[this.item_.condition].id;
      this.condition_ = book.conditions[conditionId];
    } else {
      this.condition_ = null;
    }

    if (this.item_.verb !== null) {
      const verbId = book.format_object.verbs[this.item_.verb].id;
      this.verb_ = book.verbs[verbId];
    } else {
      this.verb_ = null;
    }
  }

  get id(): string {
    return this.item_.id;
  }

  get raw(): [number | null, number | null] {
    return [this.item_.verb, this.item_.condition];
  }

  get verb(): string | null {
    return this.verb_ ? this.verb_.item.name : null;
  }

  get cond(): string | null {
    return this.condition_ ? this.condition_.item_.description : null;
  }

  get parentRoom(): Room {
    return this.parentNoun_.parentRoom_;
  }

  get parentNoun(): Noun {
    return this.parentNoun_;
  }

  get lines(): Line[] {
    return this.lines_;
  }

  get roles(): Role[] {
    return Array.from(this.roles_);
  }

  containsRole(roleId: string): boolean {
    for (const role of this.roles_) {
      if (role.id === roleId) {
        return true;
      }
    }
    return false;
  }
}

class NounEntry implements EntryBase, Noun {
  item_: NounItem;
  parentRoom_: RoomEntry;
  conversations_: ConversationEntry[];
  title_: RichText;

  constructor(nounItem: NounItem) {
    this.item_ = nounItem;
    this.conversations_ = [];
    this.title_ = RichText.ofPlainText(this.item_.description ?? `Noun #${this.item_.num}`);
  }

  resolveGraph(book: Book): void {
    const parentId = book.format_object.rooms[this.item_.parentRoom].id;
    this.parentRoom_ = book.rooms[parentId];
    this.parentRoom_.nouns_.push(this);
  }

  get id(): string {
    return this.item_.id;
  }

  get raw(): number {
    return this.item_.num;
  }

  get parentRoom(): Room {
    return this.parentRoom_;
  }

  get name(): string | null {
    return this.item_.description;
  }

  get title(): RichText {
    return this.title_;
  }

  get conversations(): Conversation[] {
    return this.conversations_;
  }
}

class VerbEntry implements EntryBase {
  item: VerbItem;
  constructor(verbItem: VerbItem) {
    this.item = verbItem;
  }

  resolveGraph(book: Book): void {
  }
}

class ConditionEntry implements EntryBase {
  item_: ConditionItem;
  parentRoom_: RoomEntry;
  constructor(conditionItem: ConditionItem) {
    this.item_ = conditionItem;
  }

  resolveGraph(book: Book): void {
    const parentId = book.format_object.rooms[this.item_.parentRoom].id;
    this.parentRoom_ = book.rooms[parentId];
    this.parentRoom_.conditions_.push(this);
  }
}

class RoomEntry implements EntryBase, Room {
  item_: RoomItem;
  nouns_: NounEntry[];
  conditions_: ConditionEntry[];
  title_: RichText;
  constructor(roomItem: RoomItem) {
    this.item_ = roomItem;
    this.nouns_ = [];
    this.conditions_ = [];
    this.title_ = RichText.ofPlainText(this.item_.name ?? `Room #${this.item_.num}`);
  }

  resolveGraph(book: Book): void {
  }

  get id(): string {
    return this.item_.id;
  }

  get raw(): number {
    return this.item_.num;
  }

  get title(): RichText {
    return this.title_;
  }

  get nouns(): Noun[] {
    return this.nouns_;
  }
}

class RoleEntry implements EntryBase, Role {
  item_: RoleItem;
  conversations_: ConversationEntry[];
  constructor(roleItem: RoleItem) {
    this.item_ = roleItem;
    this.conversations_ = [];
  }

  resolveGraph(book: Book): void {
  }

  get id(): string {
    return this.item_.id;
  }

  get raw(): string {
    return this.item_.id;
  }

  get name(): string {
    return this.item_.name;
  }

  get shortName(): string {
    return this.item_.shortName;
  }
  get conversations(): Conversation[] {
    return this.conversations_;
  }
}

class Book implements ScriptIndex {
  roles: EntryIndex<RoleEntry>;
  rooms: EntryIndex<RoomEntry>;
  nouns: EntryIndex<NounEntry>;
  conversations: EntryIndex<ConversationEntry>;
  lines: EntryIndex<LineEntry>;

  format_object: BookFormat
  conditions: EntryIndex<ConditionEntry>;
  verbs: EntryIndex<VerbEntry>;

  constructor(format_object: BookFormat,) {
    this.format_object = format_object;
    this.roles = createIndexFromEntries(format_object.roles, role => new RoleEntry(role));
    this.rooms = createIndexFromEntries(format_object.rooms, room => new RoomEntry(room));
    this.nouns = createIndexFromEntries(format_object.nouns, noun => new NounEntry(noun));
    this.conversations = createIndexFromEntries(format_object.conversations, conv => new ConversationEntry(conv));
    this.conditions = createIndexFromEntries(format_object.conditions, cond => new ConditionEntry(cond));
    this.verbs = createIndexFromEntries(format_object.verbs, verb => new VerbEntry(verb));
    this.lines = createIndexFromEntries(format_object.lines, line => new LineEntry(line));

    // Resolve and freeze all entries

    const resolveList: EntryBase[] = [
      Object.values(this.roles),
      Object.values(this.rooms),
      Object.values(this.nouns),
      Object.values(this.conversations),
      Object.values(this.conditions),
      Object.values(this.verbs),
      Object.values(this.lines)
    ].flat();

    for (const entry of resolveList) {
      entry.resolveGraph(this);
    }

  }
  static FromJSON(formatObject: BookFormat): Book {
    return new Book(formatObject);
  }
}

export function createBookFromJSON(formatObject: BookFormat): Book {
  return Book.FromJSON(formatObject);
}