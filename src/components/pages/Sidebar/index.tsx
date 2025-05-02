import { ReactNode } from "react";

import { useWindowSize } from "@docusaurus/theme-common";
import Props from "./props"
import SidebarDesktop from "./Desktop";
import SidebarMobile from "./Mobile";

export default function Sidebar(props: Props): ReactNode {
  const windowSize = useWindowSize();

  // Desktop sidebar visible on hydration: need SSR rendering
  const shouldRenderSidebarDesktop =
    windowSize === 'desktop' || windowSize === 'ssr';

  // Mobile sidebar not visible on hydration: can avoid SSR rendering
  const shouldRenderSidebarMobile = windowSize === 'mobile';

  return (
    <>
      {shouldRenderSidebarDesktop && <SidebarDesktop {...props} />}
      {shouldRenderSidebarMobile && <SidebarMobile {...props} />}
    </>
  );
}