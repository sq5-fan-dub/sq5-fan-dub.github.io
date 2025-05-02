// A basic layout component that allows for a header, footer, sidebar, and main content area.
//
// Much of this code is copied/adapted from the Docusaurus theme-classic package,
// and the DocsLayout component in particular.

import {
  ReactNode,
  useState,
} from 'react';
import BackToTopButton from '@theme/BackToTopButton';
import LayoutSidebar from './Sidebar';
import LayoutMain from './Main';

// The following imports may not be part of the docusaurus public API. They
// will need to be duplicated here before full publishing.
//
// The code is under the MIT license, which is compatible with the permissive
// license of this project.
import layoutStyles from './styles.module.css';

export interface Props {
  // The sidebar to display on the left side of the page. If not provided, the
  // sidebar will not be displayed.
  sidebar?: ReactNode;

  // The main content of the page.
  content: ReactNode;
}

export default function Layout({ sidebar, content }: Props): ReactNode {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  return (
    <div className={layoutStyles.docsWrapper}>
      <BackToTopButton />
      <div className={layoutStyles.docRoot}>
        {sidebar && (
          <LayoutSidebar
            isVisible={sidebarVisible}
            setVisible={setSidebarVisible}>
            {sidebar}
          </LayoutSidebar>
        )}
        <LayoutMain
          hasSidebar={!!sidebar}
          isSidebarVisible={sidebarVisible}>
          {content}
        </LayoutMain>
      </div>
    </div>
  );
}