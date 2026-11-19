import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { Repository } from './repo.js';
import type { GameRecord } from './types.js';

function mapGame(row: any): GameRecord {
  return {
    id: row.id,
    inviteCode: row.invite_code,
    stateUserId: row.state_user_id,
    insurgentUserId: row.insurgent_user_id,
    observerToken: row.observer_token,
    state: typeof row.state === 'string' ? JSON.parse(row.state) : row.state,
    revision: row.revision,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

const GAME_COLUMNS = 'id, invite_code, state_user_id, insurgent_user_id, observer_token, state, revision, created_at, updated_at';

export function createPgRepository(pool: pg.Pool): Repository {
  return {
    async createUser(email, passwordHash, displayName) {
      const result = await pool.query(
        'INSERT INTO users(id, email, password_hash, display_name) VALUES($1,$2,$3,$4) RETURNING id, email, password_hash, display_name',
        [randomUUID(), email, passwordHash, displayName],
      );
      const row = result.rows[0];
      return { id: row.id, email: row.email, passwordHash: row.password_hash, displayName: row.display_name };
    },
    async findUserByEmail(email) {
      const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
      const row = result.rows[0];
      return row ? { id: row.id, email: row.email, passwordHash: row.password_hash, displayName: row.display_name } : null;
    },
    async findUserById(id) {
      const result = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
      const row = result.rows[0];
      return row ? { id: row.id, email: row.email, passwordHash: row.password_hash, displayName: row.display_name } : null;
    },
    async createSession(userId, tokenHash, expiresAt) {
      const result = await pool.query(
        'INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,$4) RETURNING *',
        [randomUUID(), userId, tokenHash, expiresAt],
      );
      const row = result.rows[0];
      return { id: row.id, userId: row.user_id, tokenHash: row.token_hash, expiresAt: new Date(row.expires_at) };
    },
    async findActiveSessionByTokenHash(tokenHash, now) {
      const result = await pool.query('SELECT * FROM sessions WHERE token_hash=$1 AND expires_at>$2', [tokenHash, now]);
      const row = result.rows[0];
      return row ? { id: row.id, userId: row.user_id, tokenHash: row.token_hash, expiresAt: new Date(row.expires_at) } : null;
    },
    async deleteSession(id) { await pool.query('DELETE FROM sessions WHERE id=$1', [id]); },
    async createPasswordReset(id, userId, tokenHash, expiresAt) {
      await pool.query('INSERT INTO password_resets(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,$4)', [id, userId, tokenHash, expiresAt]);
    },
    async resetPassword(tokenHash, passwordHash, now) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query('SELECT * FROM password_resets WHERE token_hash=$1 FOR UPDATE', [tokenHash]);
        const reset = result.rows[0];
        if (!reset || reset.used_at || new Date(reset.expires_at) <= now) {
          await client.query('ROLLBACK');
          return false;
        }
        await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, reset.user_id]);
        await client.query('UPDATE password_resets SET used_at=$1 WHERE id=$2', [now, reset.id]);
        await client.query('DELETE FROM sessions WHERE user_id=$1', [reset.user_id]);
        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async createGame(game) {
      await pool.query(
        'INSERT INTO games(id,invite_code,state_user_id,insurgent_user_id,observer_token,state,revision,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [game.id, game.inviteCode, game.stateUserId, game.insurgentUserId, game.observerToken, JSON.stringify(game.state), game.revision, game.createdAt, game.updatedAt],
      );
    },
    async findGameById(id) {
      const result = await pool.query(`SELECT ${GAME_COLUMNS} FROM games WHERE id=$1`, [id]);
      return result.rows[0] ? mapGame(result.rows[0]) : null;
    },
    async findGameByInviteCode(code) {
      const result = await pool.query(`SELECT ${GAME_COLUMNS} FROM games WHERE invite_code=$1`, [code]);
      return result.rows[0] ? mapGame(result.rows[0]) : null;
    },
    async findGameByObserverToken(token) {
      const result = await pool.query(`SELECT ${GAME_COLUMNS} FROM games WHERE observer_token=$1`, [token]);
      return result.rows[0] ? mapGame(result.rows[0]) : null;
    },
    async listGamesForUser(userId) {
      const result = await pool.query(`SELECT ${GAME_COLUMNS} FROM games WHERE state_user_id=$1 OR insurgent_user_id=$1 ORDER BY updated_at DESC`, [userId]);
      return result.rows.map(mapGame);
    },
    async mutateGame<T>(id: string, mutator: (game: GameRecord) => Promise<{ game: GameRecord; value: T }> | { game: GameRecord; value: T }): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query(`SELECT ${GAME_COLUMNS} FROM games WHERE id=$1 FOR UPDATE`, [id]);
        if (!result.rows[0]) throw new Error('Game not found');
        const mutation = await mutator(mapGame(result.rows[0]));
        const game = mutation.game;
        await client.query(
          'UPDATE games SET state_user_id=$2,insurgent_user_id=$3,observer_token=$4,state=$5,revision=$6,updated_at=$7 WHERE id=$1',
          [id, game.stateUserId, game.insurgentUserId, game.observerToken, JSON.stringify(game.state), game.revision, game.updatedAt],
        );
        await client.query('COMMIT');
        return mutation.value;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
