import type { NoticesState } from './types.ts';

const requests: { state: NoticesState; busy: boolean } = {
  state: {
    companies: [],
    grants: [],
    notices: [],
    attachments: [],
  },
  busy: false,
};

export { requests };
