import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';

export const ac = createAccessControl(defaultStatements);

// O master administra a plataforma; o admin de empresa gerencia a própria equipe pelas rotas do sistema.
export const roles = {
  master: ac.newRole({ ...adminAc.statements }),
  admin: ac.newRole({ ...userAc.statements }),
  attendant: ac.newRole({ ...userAc.statements }),
};
