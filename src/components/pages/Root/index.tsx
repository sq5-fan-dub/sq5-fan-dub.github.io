import { HtmlClassNameProvider, ThemeClassNames } from '@docusaurus/theme-common'
import { ReactNode } from 'react';

import clsx from 'clsx';
import RootLayout from '../Layout';
import Layout from '@theme/Layout';

export interface Props {
  sidebar?: ReactNode;
  children: ReactNode;
}

export default function Root({ sidebar, children }): ReactNode {
  return <HtmlClassNameProvider className={clsx(ThemeClassNames.page.docsDocPage)}>
    <Layout>
      <RootLayout
        sidebar={sidebar}
        content={children} />
    </Layout>
  </HtmlClassNameProvider>
}