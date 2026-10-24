import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function localD1(path=':memory:'){
 const db=new DatabaseSync(path);db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())if(!db.prepare('SELECT name FROM local_migrations WHERE name=?').get(name)){db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));db.prepare('INSERT INTO local_migrations VALUES (?)').run(name);}
 const prepare=sql=>{let args=[];const statement={bind(...a){args=a;return statement;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}};return statement;};
 return {prepare,async batch(items){db.exec('BEGIN');try{const r=[];for(const s of items)r.push(await s.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}},close(){db.close();}};
}
