import clsx from "clsx";
import { ReactNode } from "react";

import styles from '@theme/DocRoot/Layout/Mainstyles.module.css';

export interface Props {
  hasSidebar: boolean;
  isSidebarVisible: boolean;
  children?: ReactNode;
}

export default function Main({ hasSidebar, isSidebarVisible, children }: Props): ReactNode {
  return (
    <main
      className={clsx(
        styles.docMainContainer,
        (!isSidebarVisible || !hasSidebar) && styles.docMainContainerEnhanced,
      )}>
      <div
        className={clsx(
          'container padding-top--md padding-bottom--lg',
          styles.docItemWrapper,
          (!hasSidebar) && styles.docItemWrapperEnhanced,
        )}>
        {children}
      </div>
    </main>
  )
}