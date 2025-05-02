import { useLocation } from "@docusaurus/router";
import { ReactNode, useCallback, useState } from "react";
import { prefersReducedMotion, ThemeClassNames } from "@docusaurus/theme-common";
import clsx from "clsx";
import Sidebar from "../../Sidebar"

import styles from './styles.module.css'
import ExpandButton from '@theme/DocRoot/Layout/Sidebar/ExpandButton';

export interface Props {
  children?: ReactNode;
  isVisible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function LayoutSidebar({ children, isVisible, setVisible }: Props): ReactNode {
  const [hiddenSidebar, setHiddenSidebar] = useState(false);
  const toggleSidebar = useCallback(() => {
    if (hiddenSidebar) {
      setHiddenSidebar(false);
    }
    // onTransitionEnd won't fire when sidebar animation is disabled
    // fixes https://github.com/facebook/docusaurus/issues/8918
    if (!hiddenSidebar && prefersReducedMotion()) {
      setHiddenSidebar(true);
    }
    setVisible((value) => !value);
  }, [setVisible, hiddenSidebar]);

  return (
    <aside
      className={clsx(
        ThemeClassNames.docs.docSidebarContainer,
        styles.docSidebarContainer,
        !isVisible && styles.docSidebarContainerHidden,
      )}
      onTransitionEnd={(e) => {
        if (!e.currentTarget.classList.contains(styles.docSidebarContainer!)) {
          return;
        }

        if (!isVisible) {
          setHiddenSidebar(true);
        }
      }}>
      <div
        className={clsx(
          styles.sidebarViewport,
          hiddenSidebar && styles.sidebarViewportHidden,
        )}>
        <Sidebar
          onCollapse={toggleSidebar}
          isVisible={isVisible}>
          {children}
        </Sidebar>
        {hiddenSidebar && <ExpandButton toggleSidebar={toggleSidebar} />}
      </div>
    </aside>
  );
}