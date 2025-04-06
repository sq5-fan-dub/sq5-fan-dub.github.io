import { ReactNode, useEffect, useState } from 'react';
import ScriptPage from '@site/src/components/gameScriptComponents/ScriptPage';
import Ajv from 'ajv';
import scriptSchema from './script.schema.json';
import { GameScript } from '@site/src/components/gameScriptComponents/scriptTypes';
import Layout from '@theme/Layout';
import scriptData from '@site/static/script.json';
import { useLocation } from '@docusaurus/router';

const ajv = new Ajv({
  formats: {
    'uint32': true,
  }
});
const validate = ajv.compile(scriptSchema);


export default function Page({ }): ReactNode {
  // We represent the current state as a fragment of the URL.
  const location = useLocation();

  
  if (location.hash) {
    const hash = location.hash.substring(1);
  }
  if (!scriptData) {
    return null;
  }
  if (!validate(scriptData)) {
    console.error(validate.errors);
    throw new Error('Invalid script data');
  }
  return (
    <Layout>
      <ScriptPage script={scriptData as GameScript} />
    </Layout>)
}