import { ReactNode } from 'react';
import ScriptPage from '@site/src/components/gameScriptComponents/ScriptPage';
import scriptData from './script.json'
import Ajv from 'ajv';
import scriptSchema from './script.schema.json';
import { GameScript } from '@site/src/components/gameScriptComponents/scriptTypes';
import Layout from '@theme/Layout';

const ajv = new Ajv({
  formats: {
    'uint32': true,
  }
});
const validate = ajv.compile(scriptSchema);


export default function Page({ }): ReactNode {
  if (!validate(scriptData)) {
    console.error(validate.errors);
    throw new Error('Invalid script data');
  }
  return (
    <Layout>
      <ScriptPage script={scriptData as GameScript} />
    </Layout>)
}