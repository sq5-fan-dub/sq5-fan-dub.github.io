import { ReactNode } from "react";

export default interface Props {
  readonly children?: ReactNode;
  readonly onCollapse: () => void;
  readonly isVisible: boolean;
}
