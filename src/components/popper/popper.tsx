import useIsBrowser from '@docusaurus/useIsBrowser';
import { createPopper, Options as PopperOptions, } from '@popperjs/core';
import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PortalFunction = (element: ReactNode) => ReactNode;

function NullCreatePopper(elem: ReactNode): ReactNode {
  return null
}

function usePopper(isOpen: boolean, refElement: HTMLElement | null, options: Partial<PopperOptions>): PortalFunction {
  const isBrowser = useIsBrowser();
  const popperDiv = useRef<HTMLDivElement>(null);
  const [portalFunc, setPortalFunc] = useState<{ function: PortalFunction }>(null);
  useEffect(() => {
    if (!isBrowser) return;
    if (!popperDiv.current) {
      popperDiv.current = document.createElement('div');
      setPortalFunc({
        function: (element: ReactNode) =>
          createPortal(element, popperDiv.current as HTMLDivElement)
      })
    }
    if (!isOpen) return;
    if (!refElement) return;
    window.document.body.appendChild(popperDiv.current);
    const popper = createPopper(refElement, popperDiv.current, options);
    return () => {
      popper.destroy();
      popperDiv.current?.remove();
    }
  }, [isBrowser, isOpen, popperDiv, refElement, options])

  if (!portalFunc) {
    return NullCreatePopper;
  }

  return portalFunc.function;
}



export function PopOver({ target, children }: {
  target?: HTMLElement,
  options?: Partial<PopperOptions>,
  children: ReactNode
}): ReactNode {
  const createPopper = usePopper(true, target, {
    placement: 'bottom',
  });

  return createPopper(children);
}

