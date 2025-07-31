import { ReactNode, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  ScriptPageState,
  ScriptData,
  ScriptLayout,
  TableOfContents,
  RoleTable,
  ScriptSummary,
  TocFocuses,
} from '@site/src/components/gameScriptComponents/ScriptPage';
import PageRoot from '@site/src/components/pages/Root';
import Ajv from 'ajv/dist/2020';
import scriptSchema from './script.schema.json';
import { BookFormat } from '@site/src/components/gameScriptComponents/scriptTypes';
import scriptData from '@site/static/script.json';
import { useLocation } from '@docusaurus/router';
import { produce } from 'immer';
import { createBookFromJSON } from '@site/src/components/gameScriptComponents/book';

const ajv = new Ajv({
  formats: {
    'uint': true,
    'uint16': true,
    'uint8': true,
    'uint32': true,
  }
});
const validate = ajv.compile(scriptSchema);

interface ScriptPageHandle {
  setFocusId: (id: string | null) => void;
}

function ScriptPage({ script, ref }: {
  script: BookFormat,
  ref: React.RefObject<ScriptPageHandle>,
}): ReactNode {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [scriptState, setScriptState] = useState<ScriptPageState>({
    focuses: {
      conv_id: null,
      role_id: null,
      room_id: null,
    }
  });
  const onFocusClose = useCallback((focus: keyof TocFocuses) => {
    console.log('onFocusClose', focus);
    setScriptState(produce(draft => {
      draft.focuses[focus] = null;
    }));
  }, []);
  useImperativeHandle(ref, () => ({
    setFocusId: (id: string | null) => {
      if (!id) {
        return;
      }

      if (id.startsWith('line-')) {
        // We set the focus to the conversation with the line
        const line = book.lines[id]
        if (!line) {
          return;
        }
        setScriptState(produce(draft => {
          draft.focuses = {
            conv_id: line.parentConversation.id,
            role_id: null,
            room_id: null,
          };
          setHighlightId(id);
        }))
      }
    }
  }));
  const onFocusSelect = useCallback((focus: keyof TocFocuses, id: string) => {
    setScriptState(produce(draft => {
      draft.focuses[focus] = id;
    }));
  }, []);

  const book = useMemo(() => createBookFromJSON(script), [script]);

  const conversations = useMemo(() => {
    if (!script) {
      return [];
    }

    let conversations = Object.values(book.conversations);
    if (scriptState.focuses?.conv_id) {
      conversations = conversations.filter(conv => {
        return conv.id === scriptState.focuses.conv_id;
      });
    }
    if (scriptState.focuses?.room_id) {
      conversations = conversations.filter(conv => {
        return conv.parentRoom.id === scriptState.focuses.room_id;
      });
    }

    if (scriptState.focuses?.role_id) {
      conversations = conversations.filter(conv => {
        return conv.containsRole(scriptState.focuses.role_id);
      });
    }
    return conversations;
  }, [script, scriptState]);

  if (!script) {
    return null;
  }

  let hasFilter = scriptState.focuses?.role_id || scriptState.focuses?.room_id;

  const sidebar = (
    <TableOfContents
      focuses={scriptState.focuses}
      onFocusClose={onFocusClose}
      onFocusSelect={onFocusSelect}
    />
  );

  return <ScriptData.Provider value={book}>
    <PageRoot sidebar={sidebar}>
      {hasFilter ?
        <ScriptLayout convs={conversations} highlight={highlightId} /> :
        <ScriptSummary
          script={book}
          onFocusSelect={onFocusSelect}
        />
      }
    </PageRoot>
  </ScriptData.Provider>;
}

export default function Page({ }): ReactNode {
  // We represent the current state as a fragment of the URL.
  const location = useLocation();
  const scriptRef = useRef<ScriptPageHandle>(null);
  useEffect(() => {
    if (!scriptRef.current) {
      return;
    }

    if (!location.hash) {
      return;
    }

    const hash = location.hash.substring(1);
    if (!hash) {
      return;
    }

    scriptRef.current.setFocusId(hash);
  }, [location.hash]);

  if (!scriptData) {
    return null;
  }
  if (!validate(scriptData)) {
    console.error(validate.errors);
    throw new Error('Invalid script data');
  }
  return (
    <ScriptPage
      script={scriptData as BookFormat}
      ref={scriptRef} />
  );
}