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
import { RichText, TextPiece } from './scriptTypes';
import scriptStyles from './script.module.css';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { PopOver } from '../popper/popper';
import { Conversation, createIndex, Line, ScriptIndex } from './scriptIndex';

// Utility functions

function sortBy<T>(arr: T[], keyFn: (a: T) => (number | string)): T[] {
  return arr.sort((a, b) => {
    const aKey = keyFn(a);
    const bKey = keyFn(b);
    if (aKey < bKey) {
      return -1;
    }
    if (aKey > bKey) {
      return 1;
    }
    return 0;
  });
}

// This function maps an object to an array of values using a provided function.
// It also sorts the array based on a provided sorting function, if given.
// The function takes an object, a mapping function, and an optional sorting function.
// It returns an array of mapped values.
function getObjectEntries<T, R>(
  obj: { [k: string]: T },
  sortKeyFn?: (a: T, k: string) => (number | string)
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
  return <div className={scriptStyles['hover-reveal']}>
    {children}
  </div>
}

function TextPieceElem({ textItem: { text, style } }: { textItem: TextPiece }): ReactNode {
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
  return richText.items.map((textItem, index) => <TextPieceElem key={index} textItem={textItem} />)
}

function LineElem({ line }: { line: Line }): ReactNode {
  const script = useContext(ScriptData);
  return <div id={line.id} className={scriptStyles.line}>
    <div className={scriptStyles.speaker}>{line.role.shortName}:</div>
    <div className={scriptStyles.lineText}>
      <RichTextElem richText={line.text} /><IdControls id={line.id} />
    </div>
  </div>
}

function ConversationElem({ conv }: { conv: Conversation }): ReactNode {
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

export function ScriptLayout({ convs }: { convs: Conversation[] }): ReactNode {
  const entryNodes = sortBy(objGroupBy(convs, a => a.parentRoom),
    ([room, _]) => room.num).map(([room, convs]) => {
      const nounElems = sortBy(objGroupBy(convs, a => a.parentNoun),
        ([noun, _]) => noun.num).map(([noun, convs]) => {
          const convElems = sortBy(convs, conv => conv.num).map((conv) => {
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
        }).flat()

      return <section key={room.id} id={room.id} className={scriptStyles.room}>
        <header>
          <RichTextElem richText={room.title} /><IdControls id={room.id} />
        </header>
        {nounElems}
      </section>
    }).flat()
  return <div className={scriptStyles.script} children={entryNodes} />
}

export function RoleTable({ }): ReactNode {
  const script = useContext(ScriptData);
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
              <td>{role.name}</td>
              <td>{role.shortName}</td>
            </tr>)
      }
    </tbody>
  </table>;
}

export interface TocFocuses {
  readonly role_id?: string;
  readonly room_id?: string;
};

export function TableOfContents({ focuses, onFocusClose, onRoleSelect, onRoomSelect }: {
  focuses?: TocFocuses,
  onFocusClose?: (field: 'role_id' | 'room_id') => void,
  onRoleSelect?: (role_id: string) => void,
  onRoomSelect?: (room_id: string) => void,
}): ReactNode {
  const script = useScriptData();
  focuses = focuses || {};
  onFocusClose = onFocusClose || (() => { });
  onRoleSelect = onRoleSelect || (() => { });
  onRoomSelect = onRoomSelect || (() => { });

  const roleEntries = getObjectEntries(script.roles, a => a.name)
    .map(([role, role_id]) =>
      <li key={role_id} id={role_id} onClick={() => onRoleSelect(role_id)}>
        {role.name}
      </li>);
  const roomEntries = sortBy(Object.values(script.rooms), a => a.num)
    .map((room) =>
      <li key={room.id} id={room.id} onClick={() => onRoomSelect(room.id)}>
        <RichTextElem richText={room.title} />
      </li>);

  return <div className={scriptStyles.toc}>
    {
      focuses.role_id &&
      <div className={scriptStyles.focusItem}>
        <span>Role:</span>
        <span>{script.roles[focuses.role_id].name}</span>
        <button onClick={() => onFocusClose('role_id')}>X</button>
      </div>
    }
    {
      focuses.room_id &&
      <div className={scriptStyles.focusItem}>
        <span>Room:</span>
        <span><RichTextElem richText={script.rooms[focuses.room_id].title} /></span>
        <button onClick={() => onFocusClose('room_id')}>X</button>
      </div>
    }
    <section>
      <header>Roles</header>
      <menu>{roleEntries}</menu>
    </section>
    <section>
      <header>Rooms</header>
      <menu>{roomEntries}</menu>
    </section>
  </div>;
}

export interface ScriptPageEventHandlers {
  readonly onRoleSelect?: (role_id: string) => void;
  readonly onRoomSelect?: (room_id: string) => void;
}