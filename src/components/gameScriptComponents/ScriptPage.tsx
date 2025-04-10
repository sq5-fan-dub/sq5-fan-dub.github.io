import { ReactNode, MouseEventHandler, useState, useRef, Ref, useCallback, createContext, useContext, useEffect, DependencyList, Suspense } from 'react';
import { GameScript, Room, Noun, Conversation, Line, RichText, TextPiece } from './scriptTypes';
import scriptStyles from './script.module.css';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { PopOver } from '../popper/popper';
import { produce } from 'immer';

// Utility functions

// This function maps an object to an array of values using a provided function.
// It also sorts the array based on a provided sorting function, if given.
// The function takes an object, a mapping function, and an optional sorting function.
// It returns an array of mapped values.
function getObjectEntries<T, R>(
  obj: { [k: string]: T },
  sortKeyFn?: (a: T) => (number | string)
): [T, string][] {
  type SortEntry = [T, string];
  const entries: SortEntry[] = [];
  for (const key in obj) {
    entries.push([obj[key], key]);
  }
  if (sortKeyFn) {
    entries.sort((a, b) => {
      const aKey = sortKeyFn(a[0]);
      const bKey = sortKeyFn(b[0]);
      if (aKey < bKey) {
        return -1;
      }
      if (aKey > bKey) {
        return 1;
      }
      return 0;
    });
  }
  return entries;
}

// Script Page State

export interface ScriptPageState {
  focuses?: TocFocuses;
}

const ScriptPageStateContext = createContext<ScriptPageState | null>(null);

function useScriptPageState(): ScriptPageState {
  const state = useContext(ScriptPageStateContext);
  if (!state) {
    throw new Error('useScriptPageState must be used within a ScriptPageStateProvider');
  }
  return state;
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

const ScriptData = createContext<GameScript | null>(null);

function useScriptData(): GameScript | null {
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

function ParentHoverReveal({ children }: { children: ReactNode }): ReactNode {
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
    <div className={scriptStyles.speaker}>{script.roles[line.role].short_name}:</div>
    <div className={scriptStyles.lineText}>
      <RichTextElem richText={line.text} />
      <ParentHoverReveal><CopyButton text={line.id} /></ParentHoverReveal>
    </div>
  </div>
}

function ConversationElem({ conversation_id, conversation }: { conversation_id: string, conversation: Conversation }): ReactNode {
  return <div className={scriptStyles.convSet} id={conversation_id}>
    <div className={scriptStyles.verb}>{conversation.verb || <i>Any</i>}</div>
    <div className={scriptStyles.cond}>{conversation.cond || <i>Any</i>}</div>
    <div className={scriptStyles.conv}>
      {
        conversation.lines.map((line) =>
          <LineElem key={line.id} line={line} />)
      }
    </div>
  </div>;
}

function NounElem({ noun_id }: { noun_id: string, noun: Noun }): ReactNode {
  const script = useContext(ScriptData);
  const noun = script.nouns[noun_id];
  return <section className={scriptStyles.noun} id={noun_id}>
    <header className={scriptStyles.title}><RichTextElem richText={noun.noun_title} /><CopyButton text={noun_id} /></header>
    {
      noun.conversations.map((conversation_id) =>
        <ConversationElem
          key={conversation_id}
          conversation_id={conversation_id}
          conversation={script.conversations[conversation_id]}
        />)
    }
  </section>
}

function RoomElem({ room_id }: { room_id: string, room: Room }): ReactNode {
  const script = useContext(ScriptData);
  const room = script.rooms[room_id];
  let roomNum = room.room_id;
  return <section className={scriptStyles.room} id={room_id}>
    <header><RichTextElem richText={room.room_title} />&nbsp;<i>{`(Room #${roomNum})`}</i><CopyButton text={room_id} /></header>
    {
      room.nouns.map((noun_id) =>
        <NounElem
          key={noun_id}
          noun_id={noun_id}
          noun={script.nouns[noun_id]}
        />)
    }
  </section>
}

function RoleTable({ }): ReactNode {
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
              <td>{role.short_name}</td>
            </tr>)
      }
    </tbody>
  </table>;
}

export interface TocFocuses {
  readonly role_id?: string;
  readonly room_id?: string;
};

function TableOfContents({ focuses, onFocusClose, onRoleSelect, onRoomSelect }: {
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
  const roomEntries = getObjectEntries(script.rooms, a => a.room_id)
    .map(([room, room_id]) =>
      <li key={room_id} id={room_id} onClick={() => onRoomSelect(room_id)}>
        <RichTextElem richText={room.room_title} />
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
        <span><RichTextElem richText={script.rooms[focuses.room_id].room_title} /></span>
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

interface ScriptPageEventHandlers {
  readonly onRoleSelect?: (role_id: string) => void;
  readonly onRoomSelect?: (room_id: string) => void;
}

export default function ScriptPage({ script, headerHeight, fragment, handlers }: {
  script: GameScript,
  headerHeight: number,
  fragment?: string,
  handlers?: ScriptPageEventHandlers
}): ReactNode {
  useEffect(() => {
    if (!fragment) {
      console.log("No fragment")
      return;
    }

    const element = document.getElementById(fragment);
    if (!element) {
      return;
    }
    element?.scrollIntoView();
  }, [fragment])
  const [scriptState, setScriptState] = useState<ScriptPageState | null>({});
  const onFocusClose = useCallback((field: 'role_id' | 'room_id') => {
    switch (field) {
      case 'role_id':
        setScriptState(produce(draft => {
          draft.focuses = draft.focuses || {};
          draft.focuses.role_id = null;
        }));
        break;
      case 'room_id':
        setScriptState(produce(draft => {
          draft.focuses = draft.focuses || {};
          draft.focuses.room_id = null;
        }));
        break;
    }
  }, []);
  const onRoleSelect = useCallback((role_id: string) => {
    setScriptState(produce(draft => {
      draft.focuses = draft.focuses || {};
      draft.focuses.role_id = role_id;
    }));
  }, []);
  const onRoomSelect = useCallback((room_id: string) => {
    setScriptState(produce(draft => {
      draft.focuses = draft.focuses || {};
      draft.focuses.room_id = room_id;
    }));
  }, []);

  if (!script) {
    return null;
  }

  const body = (() => {
    if (scriptState.focuses?.room_id) {
      return <RoomElem room_id={scriptState.focuses.room_id} room={script.rooms[scriptState.focuses.room_id]} />;
    } else if (scriptState.focuses?.role_id) {
      return <p> This is what a role would look like! {scriptState.focuses.role_id}</p>;
    } else {
      const rooms = getObjectEntries(script.rooms, a => a.room_id)
        .map(([room, room_id]) =>
          <RoomElem key={room_id} room_id={room_id} room={room} />
        )
      return <>
        <h2>Rooms</h2>
        <div className={scriptStyles.scriptGrid}>
          {rooms}
        </div>
      </>;
    }

  })();

  return <ScriptData.Provider value={script}>
    <div className={scriptStyles.scriptWindow}>
      <div className={scriptStyles.scriptSidebar}>
        <div className={scriptStyles.sideMenu} style={{
          ['--header-height' as any]: `${headerHeight}px`,
        }}>
          <TableOfContents
            focuses={scriptState.focuses || {}}
            onFocusClose={onFocusClose}
            onRoleSelect={onRoleSelect}
            onRoomSelect={onRoomSelect}
          />
        </div>
      </div>
      <div className={scriptStyles.scriptMain}>
        <ScriptPageStateContext.Provider value={scriptState}>
          <div>
            <h2>Roles</h2>
            <RoleTable />
          </div>
          {body}
        </ScriptPageStateContext.Provider>
      </div>
    </div>
  </ScriptData.Provider>
}