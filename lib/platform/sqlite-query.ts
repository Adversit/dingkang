type Argument = string | number | boolean | null | Uint8Array;

export function postgresQuery(statement: string, args: readonly Argument[], previousChanges: number) {
  const parameters: Argument[] = [];
  let index = 0;
  const ignoreConflict = /^\s*INSERT OR IGNORE\b/i.test(statement);
  const sql = statement.replace(/^\s*INSERT OR IGNORE\b/i, 'INSERT').replace(
    /'(?:''|[^'])*'|"(?:""|[^"])*"|`[^`]+`|\bIS\s+(NOT\s+)?\?|\bchanges\(\)|\?/gi,
    (token, negated: string | undefined) => {
      if (token.startsWith("'") || token.startsWith('"')) return token;
      if (token.startsWith('`')) return '"' + token.slice(1, -1) + '"';
      if (token.toLowerCase() === 'changes()') return String(previousChanges);
      parameters.push(args[index++]);
      const placeholder = '$' + parameters.length;
      if (token === '?') return placeholder;
      return (negated ? 'IS DISTINCT FROM ' : 'IS NOT DISTINCT FROM ') + placeholder;
    },
  );
  if (index !== args.length) throw new Error('SQLite statement parameter count mismatch.');
  const text = ignoreConflict
    ? sql.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING')
    : sql;
  return { text, values: parameters };
}
