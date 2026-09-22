const fs = require('fs'); const path = require('path'); const {transformSync} = require('@lwc/compiler'); const {parse} = require('graphql');
const root = 'force-app/main/default/lwc'; let count = 0;
for (const name of fs.readdirSync(root)) {
 for (const ext of ['js','html','css']) {
  const file = path.join(root,name,`${name}.${ext}`); if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file,'utf8');
  const result = transformSync(source,file,{name,namespace:'c',apiVersion:65});
  const errors = (result.warnings || []).filter(w=>w.level===1 || w.level==='Error');
  if (errors.length) throw new Error(JSON.stringify(errors));
  if (ext === 'js') for (const match of source.matchAll(/gql`([\s\S]*?)`/g)) parse(match[1]);
  count++;
 }
}
console.log(`Compiled ${count} LWC source files; parsed all GraphQL documents (not schema validation).`);
