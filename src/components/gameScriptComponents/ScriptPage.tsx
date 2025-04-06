import { ReactNode, MouseEventHandler, useState, useRef, RefObject, Ref, RefCallback, useLayoutEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { GameScript, Room, Noun, Conversation, Line, RichText, TextPiece } from './scriptTypes';
import scriptStyles from './script.module.css';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

// Utility functions

// This function maps an object to an array of values using a provided function.
// It also sorts the array based on a provided sorting function, if given.
// The function takes an object, a mapping function, and an optional sorting function.
// It returns an array of mapped values.
function mapObject<T, R>(
  obj: { [k: string]: T },
  func: (key: string, val: T) => R,
  sortKeyFn?: (a: T) => (number | string)
): R[] {
  type SortEntry = { key: string, val: T };
  const entries: SortEntry[] = [];
  for (const key in obj) {
    entries.push({ key, val: obj[key] });
  }
  if (sortKeyFn) {
    entries.sort((a, b) => {
      const aKey = sortKeyFn(a.val);
      const bKey = sortKeyFn(b.val);
      if (aKey < bKey) {
        return -1;
      }
      if (aKey > bKey) {
        return 1;
      }
      return 0;
    });
  }
  return entries.map((entry) => func(entry.key, entry.val));
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

// React contexts

const ScriptData = createContext<GameScript | null>(null);

// React components

function Icon({ icon }: { icon: string }): ReactNode {
  return <span className={clsx(['material-symbols-outlined', scriptStyles['material-symbols-outlined']])}>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    {icon}
  </span>
}

function IconButton({
  icon,
  parentRef,
  onClick
}: {
  icon: string,
  parentRef?: RefCallback<HTMLElement>,
  onClick?: MouseEventHandler
}): ReactNode {
  return <div ref={parentRef} className={scriptStyles.button} onClick={onClick}>
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
  console.log('Popup:', position.x, position.y);

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
      parentRef={parentRefCallback}
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
        mapObject(
          script.roles,
          ((role_id, role) => (
            <tr key={role_id} id={role_id}>
              <td>{role.name}</td>
              <td>{role.short_name}</td>
            </tr>)),
          (a) => a.name)
      }
    </tbody>
  </table>;
}

export default function ScriptPage({ script, focus }: {
  script: GameScript,
  focus?: string,
}): ReactNode {
  const [viewState, setViewState] = useState<ScriptPageState>({ type: 'default' });
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
        const rooms = mapObject(
          script.rooms,
          ((room_id, room) => (<RoomElem key={room_id} room_id={room_id} room={room} />)),
          (a) => a.room_id);
        return <div>
          <h2>Rooms</h2>
          {rooms}
        </div>;
      }
    }
  })();

  return <ScriptData.Provider value={script}>
    <ScriptPageStateContext.Provider value={[viewState, setViewState]}>
      <div>
        <h2>Roles</h2>
        <RoleTable />
      </div>
      {body}
    </ScriptPageStateContext.Provider>
  </ScriptData.Provider>
}