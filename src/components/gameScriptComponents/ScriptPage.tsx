import {
  ReactNode,
  MouseEventHandler,
  useState,
  Ref,
  useCallback,
  createContext,
  useContext,
  useEffect,
} from 'react';
import { RichText, RichTextSegment } from './richText';
import scriptStyles from './script.module.css';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { PopOver } from '../popper/popper';
import { Conversation, Line, Noun, Room, ScriptIndex } from './scriptIndex';

// Utility functions

type Sortable = number | string | Sortable[];

function sortItems(a: Sortable, b: Sortable): number {
  if (Array.isArray(a) && Array.isArray(b)) {
    // Sort arrays lexicographically by item.
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const result = sortItems(a[i], b[i]);
      if (result !== 0) {
        return result;
      }
    }
    return a.length - b.length;
  }

  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;

}

function sortBy<T>(arr: T[], keyFn: (a: T) => Sortable): T[] {
  return arr.sort((a, b) => {
    return sortItems(keyFn(a), keyFn(b));
  });
}

// This function maps an object to an array of values using a provided function.
// It also sorts the array based on a provided sorting function, if given.
// The function takes an object, a mapping function, and an optional sorting function.
// It returns an array of mapped values.
function getObjectEntries<T, R>(
  obj: { [k: string]: T },
  sortKeyFn?: (a: T, k: string) => Sortable
): [T, string][] {
  type SortEntry = [T, string];
  let entries: SortEntry[] = [];
  for (const key in obj) {
    entries.push([obj[key], key]);
  }
  if (sortKeyFn) {
    entries = sortBy(entries, e => sortKeyFn(e[0], e[1]));
  }
  return entries;
}

function objGroupBy<T, K>(items: T[], keyFn: (item: T) => K): [K, T[]][] {
  const itemMap = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!itemMap.has(key)) {
      itemMap.set(key, []);
    }
    itemMap.get(key).push(item);
  }
  return Array.from(itemMap.entries());
}

// Script Page State

export interface ScriptPageState {
  focuses?: TocFocuses;
}

// React Hooks

function useScriptFont() {
  useEffect(() => {
    const scriptFontLink = document.getElementById('script-font');
    if (scriptFontLink) {
      return;
    }

    const link = document.createElement('link');
    link.id = 'script-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
    document.head.appendChild(link);
  }, []);
}

// React contexts

export const ScriptData = createContext<ScriptIndex | null>(null);

function useScriptData(): ScriptIndex | null {
  return useContext(ScriptData);
}

export const CurrentHighlightId = createContext<string | null>(null);

function useCurrentHighlightId(): string | null {
  return useContext(CurrentHighlightId);
}

// React components

function Icon({ icon }: { icon: string }): ReactNode {
  useScriptFont();
  return <span className={clsx(['material-symbols-outlined', scriptStyles['material-symbols-outlined']])}>
    {icon}
  </span>
}

function IconButton({ icon, ref, onClick }: {
  icon: string,
  ref: Ref<HTMLDivElement>,
  onClick?: MouseEventHandler
}): ReactNode {
  return <div ref={ref} className={scriptStyles.button} onClick={onClick}>
    <Icon icon={icon} />
  </div>
}

function CopyButton({ text }: { text: string }): ReactNode {
  const isBrowser = useIsBrowser();
  const [buttonRef, setButtonRef] = useState<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const clickCallback = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setIsOpen(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
    });
  }, [text])

  return <>
    <IconButton
      icon="content_copy"
      ref={setButtonRef}
      onClick={isBrowser ? clickCallback : null}
    />
    {
      isOpen && <PopOver target={buttonRef} options={{
        placement: 'bottom',
      }}>
        <div className={scriptStyles.popup}>{`Copied ID To Clipboard: ${text}`}</div>
      </PopOver>
    }
  </>;
}

function IdControls({ id }: { id: string }): ReactNode {
  return <ParentHoverReveal>
    <CopyButton text={id} />
  </ParentHoverReveal>
}

function ParentHoverReveal({ children }: { children?: ReactNode }): ReactNode {
  return <div className={scriptStyles.hoverReveal}>
    {children}
  </div>
}

function TextPieceElem({ textItem: { text, style } }: { textItem: RichTextSegment }): ReactNode {
  let itemNode = <>{text}</>
  if (style) {
    if (style.bold) {
      itemNode = <b>{itemNode}</b>;
    }
    if (style.italic) {
      itemNode = <i>{itemNode}</i>;
    }
  }
  return itemNode
}

function RichTextElem({ richText }: { richText: RichText }): ReactNode {
  return richText.segments.map((textItem, index) => <TextPieceElem key={index} textItem={textItem} />)
}

function LineElem({ line }: {
  line: Line,
}): ReactNode {
  const highlightId = useCurrentHighlightId();
  return <div id={line.id} className={clsx(
    scriptStyles.line,
    (highlightId == line.id) && scriptStyles.focused,
  )}>
    <div className={scriptStyles.speaker}>{line.role.shortName}:</div>
    <div className={scriptStyles.lineText}>
      <RichTextElem richText={line.text} /><IdControls id={line.id} />
    </div>
  </div>
}

function ConversationElem({ conv }: {
  conv: Conversation,
}): ReactNode {
  return <div className={scriptStyles.convSet} id={conv.id}>
    <div className={scriptStyles.verb}>{conv.verb || <i>Any</i>}</div>
    <div className={scriptStyles.cond}>{conv.cond || <i>Any</i>}</div>
    <div className={scriptStyles.conv}>
      {
        conv.lines.map((line) =>
          <LineElem key={line.id} line={line} />)
      }
    </div>
  </div>;
}

function NounElem({ noun, convs }: {
  noun: Noun,
  convs: Conversation[],
}): ReactNode {
  const convElems = sortBy(convs, conv => conv.raw).map((conv) => {
    return <ConversationElem
      key={conv.id}
      conv={conv}
    />
  });
  return <section key={noun.id} id={noun.id} className={scriptStyles.noun}>
    <header>
      <RichTextElem richText={noun.title} /><IdControls id={noun.id} />
    </header>
    {convElems}
  </section>
}

function RoomElem({ room, convs }: {
  room: Room,
  convs: Conversation[],
}): ReactNode {
  const nounElems = sortBy(objGroupBy(convs, a => a.parentNoun),
    ([noun, _]) => noun.raw).map(([noun, convs]) =>
      <NounElem key={noun.id} noun={noun} convs={convs} />
    );

  return <section id={room.id} className={scriptStyles.room}>
    <header>
      <RichTextElem richText={room.title} /><IdControls id={room.id} />
    </header>
    {nounElems}
  </section>
}

export function ScriptLayout({ convs, highlight }: {
  convs: Conversation[],
  highlight: string | null,
}): ReactNode {
  const entryNodes = sortBy(objGroupBy(convs, a => a.parentRoom),
    ([room, _]) => room.raw).map(([room, convs]) =>
      <RoomElem key={room.id} room={room} convs={convs} />
    );
  return <CurrentHighlightId value={highlight}>
    <div className={scriptStyles.script} children={entryNodes} />
  </CurrentHighlightId>
}

// A summary of the contents of the script.
export function ScriptSummary({ script, onFocusSelect }: {
  script: ScriptIndex,
  onFocusSelect: (focus: keyof TocFocuses, id: string) => void,
}): ReactNode {
  return <div className={scriptStyles.summary}>
    <div>
      <h2>Roles</h2>
      <RoleTable script={script} onFocusSelect={onFocusSelect} />
    </div>
    <div>
      <h2>Rooms</h2>
      <ul>
        {
          sortBy(Object.values(script.rooms), a => a.raw)
            .map((room) =>
              <li key={room.id} id={room.id}>
                <a href="#" onClick={() => {
                  onFocusSelect('room_id', room.id);
                }}><RichTextElem richText={room.title} /></a>
              </li>)
        }
      </ul>
    </div>
  </div>
}

export function RoleTable({ script, onFocusSelect }: {
  script: ScriptIndex,
  onFocusSelect: (focus: keyof TocFocuses, id: string) => void,
}): ReactNode {
  return <table className={scriptStyles.roleTable}>
    <thead>
      <tr>
        <th>Role</th>
        <th>Short Name</th>
      </tr>
    </thead>
    <tbody>
      {
        getObjectEntries(script.roles, a => a.name)
          .map(([role, role_id]) =>
            <tr key={role_id} id={role_id}>
              <td><a href="#" onClick={() => {
                onFocusSelect('role_id', role_id);
              }}>{role.name}</a></td>
              <td>{role.shortName}</td>
            </tr>)
      }
    </tbody>
  </table>;
}

interface FocusDesc {
  readonly typeName: string;
  readonly nameRender: (script: ScriptIndex, id: string) => ReactNode;
};

type FocusDescMap = {
  [key in keyof TocFocuses]: FocusDesc;
}

const FocusDescs: FocusDescMap = {
  conv_id: {
    typeName: 'Conversation',
    nameRender: (script, id) => {
      return id;
    },
  },
  role_id: {
    typeName: 'Role',
    nameRender: (script, id) => {
      return script.roles[id].name;
    },
  },
  room_id: {
    typeName: 'Room',
    nameRender: (script, id) => {
      return <RichTextElem richText={script.rooms[id].title} />;
    }
  },
}

export interface TocFocuses {
  readonly conv_id?: string;
  readonly role_id?: string;
  readonly room_id?: string;
};

export function TableOfContents({ focuses, onFocusClose, onFocusSelect }: {
  focuses?: TocFocuses,
  onFocusClose?: (field: keyof TocFocuses) => void,
  onFocusSelect?: (focus: keyof TocFocuses, id: string) => void,
}): ReactNode {
  const script = useScriptData();
  focuses = focuses || {};
  onFocusClose = onFocusClose || (() => { });
  onFocusSelect = onFocusSelect || (() => { });

  const roleEntries = getObjectEntries(script.roles, a => a.name)
    .map(([role, role_id]) =>
      <li key={role_id} id={role_id} onClick={() => onFocusSelect('role_id', role_id)}>
        {role.name}
      </li>);
  const roomEntries = sortBy(Object.values(script.rooms), a => a.raw)
    .map((room) =>
      <li key={room.id} id={room.id} onClick={() => onFocusSelect('room_id', room.id)}>
        <RichTextElem richText={room.title} />
      </li>);

  const focusItems: ReactNode[] = Object.keys(focuses).map((key) => {
    const id = focuses[key];
    if (!id) {
      return null;
    }
    const focusDesc: FocusDesc = FocusDescs[key];
    if (!focusDesc) {
      throw new Error(`Unknown focus type: ${key}`);
    }

    return <div className={scriptStyles.focusItem} key={key}>
      <div>
        <span>{focusDesc.typeName}:</span> {" "}
        <span>{focusDesc.nameRender(script, id)}</span>
      </div>
      <button onClick={() => onFocusClose(key as keyof TocFocuses)}>X</button>
    </div>
  });

  return <div className={scriptStyles.toc}>
    <div className={scriptStyles.focusList} children={focusItems} />
    <div className={scriptStyles.scrollPane}>
      <section>
        <header>Roles</header>
        <menu>{roleEntries}</menu>
      </section>
      <section>
        <header>Rooms</header>
        <menu>{roomEntries}</menu>
      </section>
    </div>
  </div>;
}