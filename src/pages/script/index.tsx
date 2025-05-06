import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScriptPageState,
  ScriptData,
  ScriptLayout,
  TableOfContents,
  RoleTable,
  ScriptSummary,
} from '@site/src/components/gameScriptComponents/ScriptPage';
import PageRoot from '@site/src/components/pages/Root';
import Ajv from 'ajv';
import scriptSchema from './script.schema.json';
import { GameScript } from '@site/src/components/gameScriptComponents/scriptTypes';
import scriptData from '@site/static/script.json';
import { useLocation } from '@docusaurus/router';
import { produce } from 'immer';
import { createIndex } from '@site/src/components/gameScriptComponents/scriptIndex';

const ajv = new Ajv({
  formats: {
    'uint32': true,
  }
});
const validate = ajv.compile(scriptSchema);

function ScriptPage({ script, fragment }: {
  script: GameScript,
  fragment?: string,
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
  const [scriptState, setScriptState] = useState<ScriptPageState>({});
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

  const scriptIndex = useMemo(() => createIndex(script), [script]);

  const conversations = useMemo(() => {
    if (!script) {
      return [];
    }

    let conversations = Object.values(scriptIndex.conversations);
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
      focuses={scriptState.focuses || {}}
      onFocusClose={onFocusClose}
      onRoleSelect={onRoleSelect}
      onRoomSelect={onRoomSelect}
    />
  );

  return <ScriptData.Provider value={scriptIndex}>
    <PageRoot sidebar={sidebar}>
      {hasFilter ?
        <ScriptLayout convs={conversations} /> :
        <ScriptSummary
          script={scriptIndex}
          onRoleSelect={onRoleSelect}
          onRoomSelect={onRoomSelect} />
      }
    </PageRoot>
  </ScriptData.Provider>;
}

export default function Page({ }): ReactNode {
  // We represent the current state as a fragment of the URL.
  const location = useLocation();

  let hash = null;
  if (location.hash) {
    hash = location.hash.substring(1);
  }
  if (!scriptData) {
    return null;
  }
  if (!validate(scriptData)) {
    console.error(validate.errors);
    throw new Error('Invalid script data');
  }
  return (
    <ScriptPage
      script={scriptData as GameScript}
      fragment={hash} />
  );
}