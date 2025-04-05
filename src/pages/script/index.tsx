import { ReactNode, useEffect, useState } from 'react';
import ScriptPage from '@site/src/components/gameScriptComponents/ScriptPage';
import Ajv from 'ajv';
import scriptSchema from './script.schema.json';
import { GameScript } from '@site/src/components/gameScriptComponents/scriptTypes';
import Layout from '@theme/Layout';
import scriptData from '@site/static/script.json';

const ajv = new Ajv({
  formats: {
    'uint32': true,
  }
});
const validate = ajv.compile(scriptSchema);


export default function Page({ }): ReactNode {
  useEffect(() => {
    // Load the script data from the JSON file
  }, []);
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