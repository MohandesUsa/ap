import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';
import type { AdminRole, Permission } from './permissions.ts';

export interface AdminRow {
  id: string;
  phone_number: string;
  password_hash: string;
  full_name: string;
  role: AdminRole;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class AdminRepository {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  async findByPhone(phone: string): Promise<AdminRow | null> {
    const { rows } = await this.db.query<AdminRow>('SELECT * FROM admins WHERE phone_number = $1', [phone]);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<AdminRow | null> {
    const { rows } = await this.db.query<AdminRow>('SELECT * FROM admins WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async list(): Promise<AdminRow[]> {
    const { rows } = await this.db.query<AdminRow>('SELECT * FROM admins ORDER BY created_at DESC');
    return rows;
  }

  async create(params: { phoneNumber: string; passwordHash: string; fullName: string; role: AdminRole }): Promise<AdminRow> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const { rows } = await this.db.query<AdminRow>(
      `INSERT INTO admins (id, phone_number, password_hash, full_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, $6, $7) RETURNING *`,
      [id, params.phoneNumber, params.passwordHash, params.fullName, params.role, now, now],
    );
    return rows[0];
  }

  async update(id: string, fields: { fullName?: string; role?: AdminRole; isActive?: boolean }): Promise<AdminRow> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Admin not found');
    const { rows } = await this.db.query<AdminRow>(
      `UPDATE admins SET full_name = $1, role = $2, is_active = $3, updated_at = $4 WHERE id = $5 RETURNING *`,
      [
        fields.fullName ?? existing.full_name,
        fields.role ?? existing.role,
        fields.isActive === undefined ? existing.is_active : (fields.isActive ? 1 : 0),
        new Date().toISOString(),
        id,
      ],
    );
    return rows[0];
  }

  async getCustomPermissions(adminId: string): Promise<Permission[]> {
    const { rows } = await this.db.query<{ permission: Permission }>(
      'SELECT permission FROM admin_permissions WHERE admin_id = $1',
      [adminId],
    );
    return rows.map((r) => r.permission);
  }

  async grantPermission(adminId: string, permission: Permission, grantedBy: string): Promise<void> {
    // INSERT ... ON DUPLICATE/CONFLICT would be nicer, but this project's DbClient abstraction
    // (Phase 3.1) doesn't standardize upsert syntax across MySQL/SQLite — a plain existence check
    // is simple, correct, and consistent with how the rest of this codebase avoids dialect-
    // specific SQL (see MySqlClient.ts's own doc comment on the same tradeoff).
    const { rows } = await this.db.query(
      'SELECT 1 FROM admin_permissions WHERE admin_id = $1 AND permission = $2',
      [adminId, permission],
    );
    if (rows.length > 0) return;
    await this.db.query(
      'INSERT INTO admin_permissions (admin_id, permission, granted_at, granted_by) VALUES ($1, $2, $3, $4)',
      [adminId, permission, new Date().toISOString(), grantedBy],
    );
  }

  async revokePermission(adminId: string, permission: Permission): Promise<void> {
    await this.db.query('DELETE FROM admin_permissions WHERE admin_id = $1 AND permission = $2', [adminId, permission]);
  }
}
