import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';

export const ac = createAccessControl(defaultStatements);

export const roles = {
  admin: ac.newRole({ ...adminAc.statements }),
  attendant: ac.newRole({ ...userAc.statements }),
};
