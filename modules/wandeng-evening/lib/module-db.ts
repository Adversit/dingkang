const tables = ['conversations','memories','messages','pages','preferences','runs','suppressions'];
const identifiers = new RegExp('\\b(' + tables.join('|') + ')\\b', 'g');
export function moduleDb(db: D1Database): D1Database {
  return new Proxy(db, {get(target, key) {
    if (key === 'prepare') return (sql: string) => target.prepare(sql.replace(identifiers, 'wandeng_evening__$1'));
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
  }});
}
