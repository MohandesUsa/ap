import { AdminRepository } from '../../src/modules/admin-auth/admin.repository.ts';
import { hashPassword } from '../../src/security/password.ts';
import { apiCall, type TestApp } from './testApp.ts';
import type { AdminRole } from '../../src/modules/admin-auth/permissions.ts';

/** Creates an admin directly via the repository (there is no public register endpoint by
 *  design — see admin-auth.routes.ts) and logs them in through the real HTTP endpoint, so tests
 *  exercise the actual login path rather than fabricating a token. */
export async function createAndLoginAdmin(app: TestApp, phone: string, role: AdminRole, fullName = `Admin ${phone}`) {
  const repo = new AdminRepository(app.db);
  const passwordHash = await hashPassword('adminpass123');
  const admin = await repo.create({ phoneNumber: phone, passwordHash, fullName, role });

  const login = await apiCall(app.baseUrl, 'POST', '/admin/auth/login', {
    body: { phoneNumber: phone, password: 'adminpass123' },
  });
  return { admin, accessToken: (login.body as { accessToken: string }).accessToken };
}
