import { ReactNode, useEffect, useRef, useState } from 'react';
import ScriptPage from '@site/src/components/gameScriptComponents/ScriptPage';
import Ajv from 'ajv';
import scriptSchema from './script.schema.json';
import { GameScript } from '@site/src/components/gameScriptComponents/scriptTypes';
import scriptData from '@site/static/script.json';
import { useLocation } from '@docusaurus/router';
import LayoutProvider from '@theme/Layout/Provider';
import Navbar from '@theme/Navbar';
import pageStyles from './page.module.css';
import useIsBrowser from '@docusaurus/useIsBrowser';

const ajv = new Ajv({
  formats: {
    'uint32': true,
  }
});
const validate = ajv.compile(scriptSchema);

function useElementSize(
): [{ width: number, height: number } | null, (HTMLElement) => void] {
  const isBrowser = useIsBrowser();
  const observer = useRef<ResizeObserver>(null);
  const [sizedElem, setSizedElem] = useState<HTMLElement>(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }
    ResizeObserverEntry;

    if (!observer.current) {
      observer.current = new ResizeObserver((entries) => {
        let width = 0;
        let height = 0;
        for (const entry of entries) {
          // Get the writing mode of the element, to sort out
          // whether width or height is the writing mode
          const writingMode = window.getComputedStyle(entry.target).writingMode;
          const isVertical = writingMode === 'vertical-rl' || writingMode === 'vertical-lr';

          for (const borderBox of entry.borderBoxSize) {
            const entryWidth = isVertical ? borderBox.blockSize : borderBox.inlineSize;
            const entryHeight = isVertical ? borderBox.inlineSize : borderBox.blockSize;
            width = Math.max(width, entryWidth);
            height = Math.max(height, entryHeight);
          }
        }
        setSize({ width, height });
      });
    }

    if (!sizedElem) {
      return;
    }

    observer.current.observe(sizedElem);
    return () => {
      observer.current.unobserve(sizedElem);
    }
  }, [isBrowser, sizedElem])
  return [size, setSizedElem];
}

export default function Page({ }): ReactNode {
  // We represent the current state as a fragment of the URL.
  const location = useLocation();
  const [headerSize, setHeaderRef] = useElementSize();

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
  return (<LayoutProvider>
    <div className={pageStyles.screen}>
      <div className={pageStyles.navBar} ref={setHeaderRef}>
        <Navbar />
      </div>
      <div className={pageStyles.main}>
        <ScriptPage
          script={scriptData as GameScript}
          headerHeight={headerSize ? headerSize.height : 0}
          fragment={hash} />
      </div>
    </div>
  </LayoutProvider>)
}