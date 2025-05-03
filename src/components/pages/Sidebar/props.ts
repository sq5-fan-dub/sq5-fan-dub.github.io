/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 * Copyright (c) Brian Chin.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the src/components/pages directory of this source tree.
 */

import { ReactNode } from "react";

export default interface Props {
  readonly children?: ReactNode;
  readonly onCollapse: () => void;
  readonly isVisible: boolean;
}
