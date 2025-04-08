import { ReactNode, MouseEventHandler, useState, useRef, RefObject, Ref, RefCallback, useLayoutEffect, useCallback, createContext, useContext, forwardRef, ForwardedRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GameScript, Room, Noun, Conversation, Line, RichText, TextPiece } from './scriptTypes';
import scriptStyles from './script.module.css';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { useImmer } from 'use-immer';
import { } from '@theme/Navbar';

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

const layerCache = new WeakMap<HTMLElement, HTMLDivElement>();

function createPopupLayer(): HTMLDivElement | null {
  if (!ExecutionEnvironment.canUseDOM) {
    return null;
  }

  if (layerCache.has(document.body)) {
    return layerCache.get(document.body);
  }

  const popupLayer = document.createElement('div');
  popupLayer.className = scriptStyles.popupLayer;
  document.body.appendChild(popupLayer);
  layerCache.set(document.body, popupLayer);
  console.log('Popup layer created:', popupLayer);
  return popupLayer;
}

// Script Page State

type ScriptPageState = {
  type: 'roomFocus' | 'nounFocus';
  id: string;
} | {
  type: 'default';
}

type ScriptPageStateUpdater = (state: ScriptPageState) => void;

const ScriptPageStateContext = createContext<[ScriptPageState, ScriptPageStateUpdater] | null>(null);

function useScriptPageState(): [ScriptPageState, ScriptPageStateUpdater] {
  const state = useContext(ScriptPageStateContext);
  if (!state) {
    throw new Error('useScriptPageState must be used within a ScriptPageStateProvider');
  }
  return state;
}

// React Hooks

function useOnUpdate<T>(value: T, onUpdate: (value: T) => void): void {
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    onUpdate(value);
  }
}

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

function Popup({ target, x, y, children }: {
  target: RefObject<HTMLElement>,
  x: number,
  y: number,
  children: ReactNode
}): ReactNode {
  const isBrowser = useIsBrowser();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    // If there is a current reference, get its position relative to document.body
    if (!isBrowser) {
      return;
    }
    const bodyRect = document.body.getBoundingClientRect();
    const rect = target.current.getBoundingClientRect();
    const x = rect.left - bodyRect.left;
    const y = rect.top - bodyRect.top;

    if (x !== position.x || y !== position.y) {
      setPosition({ x, y });
    }
  }, [isBrowser, target.current]);
  if (!isBrowser) {
    return null;
  }

  const popupLayer = createPopupLayer();
  if (!popupLayer) {
    return null;
  }

  return createPortal(
    <div
      className={scriptStyles.popupBox}
      style={{ left: position.x + x, top: position.y + y }}
      children={children}
    />, popupLayer);
}

function CopyButton({ text }: { text: string }): ReactNode {
  const isBrowser = useIsBrowser();
  const buttonRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const parentRefCallback = useCallback((ref: HTMLElement) => {
    buttonRef.current = ref;
  }, []);
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
      ref={parentRefCallback}
      onClick={isBrowser ? clickCallback : null}
    />
    {
      isOpen && <Popup target={buttonRef} x={8} y={8}>
        <div className={scriptStyles.popup}>{`Copied ID To Clipboard: ${text}`}</div>
      </Popup>
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
    <div className={scriptStyles['line-text']}>
      <RichTextElem richText={line.text} />
      <ParentHoverReveal><CopyButton text={line.id} /></ParentHoverReveal>
    </div>
  </div>
}

function ConversationElem({ conversation_id, conversation }: { conversation_id: string, conversation: Conversation }): ReactNode {
  return <div id={conversation_id}>
    {
      conversation.verb &&
      <div>
        <b>Verb: </b> {conversation.verb}
      </div>
    }
    {
      conversation.cond &&
      <div>
        <b>Condition: </b> {conversation.cond}
      </div>
    }
    <div className={scriptStyles.dialogue}>
      {
        conversation.lines.map((line) =>
          <LineElem key={line.id} line={line} />)
      }
    </div>
  </div>
}

function NounElem({ noun_id, noun }: { noun_id: string, noun: Noun }): ReactNode {
  const script = useContext(ScriptData);
  return <div id={noun_id}>
    <h3><RichTextElem richText={noun.noun_title} /></h3>
    {
      noun.conversations.map((conversation_id) =>
        <ConversationElem
          key={conversation_id}
          conversation_id={conversation_id}
          conversation={script.conversations[conversation_id]}
        />)
    }
  </div>
}

function RoomElem({ room_id, room }: { room_id: string, room: Room }): ReactNode {
  const script = useContext(ScriptData);
  return <div>
    <h2><RichTextElem richText={room.room_title} /></h2>
    {
      room.nouns.map((noun_id) =>
        <NounElem
          key={noun_id}
          noun_id={noun_id}
          noun={script.nouns[noun_id]}
        />)
    }
  </div>
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

function TableOfContents({ onRoleSelect, onRoomSelect }: {
  onRoleSelect?: (role_id: string) => void,
  onRoomSelect?: (room_id: string) => void,
}): ReactNode {
  const script = useContext(ScriptData);
  onRoleSelect = onRoleSelect || (() => { });
  onRoomSelect = onRoomSelect || (() => { });

  const roleEntries = getObjectEntries(script.roles, a => a.name)
    .map(([role, role_id]) =>
      <li key={role_id} id={role_id}>
        <a className={scriptStyles.tocAnchor} onClick={() => onRoleSelect(role_id)}>{role.name}</a>
      </li>);
  const roomEntries = getObjectEntries(script.rooms, a => a.room_id)
    .map(([room, room_id]) =>
      <li key={room_id} id={room_id}>
        <a className={scriptStyles.tocAnchor} onClick={() => onRoomSelect(room_id)}><RichTextElem richText={room.room_title} /></a>
      </li>);

  return <div>
    <header>Roles</header>
    <ul>{roleEntries}</ul>
    <header>Rooms</header>
    <ul>{roomEntries}</ul>
  </div>;
}

export default function ScriptPage({ script, focus }: {
  script: GameScript,
  focus?: string,
}): ReactNode {
  const [viewState, setViewState] = useImmer<ScriptPageState>({ type: 'default' });
  useOnUpdate(focus, () => {
    if (!focus || focus === '') {
      setViewState({ type: 'default' });
      return;
    }
    const dashPos = focus.indexOf('-');
    let focusType: string | null = null;
    if (dashPos !== -1) {
      focusType = focus.substring(0, dashPos);
    }
    switch (focusType) {
      case 'room':
        setViewState({ type: 'roomFocus', id: focus });
        break;
      case 'noun':
        setViewState({ type: 'nounFocus', id: focus });
        break;
      default:
        throw new Error(`Unknown focus type: ${focusType}`);
    }
  });

  if (!script) {
    return null;
  }

  const body = (() => {
    switch (viewState.type) {
      case 'roomFocus':
        return <RoomElem room_id={viewState.id} room={script.rooms[viewState.id]} />;
      case 'nounFocus':
        return <NounElem noun_id={viewState.id} noun={script.nouns[viewState.id]} />;
      case 'default': {
        const rooms = getObjectEntries(script.rooms, a => a.room_id)
          .map(([room, room_id]) =>
            <RoomElem key={room_id} room_id={room_id} room={room} />
          )
        return <div>
          <h2>Rooms</h2>
          {rooms}
        </div>;
      }
    }
  })();

  return <ScriptData.Provider value={script}>
    <div className={scriptStyles.scriptWindow}>
      <div className={scriptStyles.scriptSidebar}>
        <div className={scriptStyles.sideMenu}>
          <TableOfContents
            onRoleSelect={(role_id) => {
              console.log('Role selected:', role_id);
              // setViewState({ type: 'roomFocus', id: role_id });
            }}
            onRoomSelect={(room_id) => {
              console.log('Room selected:', room_id);
              // setViewState({ type: 'roomFocus', id: room_id });
            }}
          />
        </div>
      </div>
      <div className={scriptStyles.scriptMain}>
        <ScriptPageStateContext.Provider value={[viewState, setViewState]}>
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