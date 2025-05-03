/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 * Copyright (c) Brian Chin.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the src/components/pages directory of this source tree.
 */

import clsx from "clsx";
import { ReactNode } from "react";

import styles from './styles.module.css';

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