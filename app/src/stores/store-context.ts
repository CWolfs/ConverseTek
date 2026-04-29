import { createContext } from 'react';

import type stores from '.';

export const storeContext = createContext<typeof stores | null>(null);
