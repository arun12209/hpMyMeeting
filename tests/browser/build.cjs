const fs=require('fs'),path=require('path');const {rollup}=require('rollup');const {transformSync}=require('@lwc/compiler');
const root=process.cwd(),lwc=path.join(root,'force-app/main/default/lwc'),mocks=path.join(root,'tests/browser/mocks');
const controls={
 icon:['@api iconName; @api size; @api alternativeText; get path(){const icons={event:"M5 3v4m14-4v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 8h2m4 0h2m-8 4h2m4 0h2",clock:"M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",refresh:"M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6",new_window:"M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",user:"M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2",linked:"m10 14 4-4m-6 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0",arrowright:"M4 12h16m-6-6 6 6-6 6",arrowdown:"M12 4v16m-6-6 6 6 6-6",chevronleft:"m15 6-6 6 6 6",chevronright:"m9 6 6 6-6 6",expand_alt:"M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",warning:"m12 3 10 18H2L12 3Zm0 6v5m0 3v1",info:"M12 10v7m0-11v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",back:"M20 12H4m6-6-6 6 6 6",sort:"m5 8 4-4 4 4m-4-4v16m4-4 4 4 4-4m-4 4V4"};return icons[this.iconName?.split(":")[1]]||icons.event;}','<svg viewBox="0 0 24 24" aria-hidden="true"><path d={path}></path></svg>'],
 button:['@api label; @api disabled;','<button disabled={disabled}>{label}</button>'],
 buttonIcon:['@api iconName; @api alternativeText; get symbol(){return this.iconName?.includes("left")?"‹":this.iconName?.includes("right")?"›":"↻";}','<button aria-label={alternativeText}>{symbol}</button>'],
 input:['@api label; @api value; @api type; change(event){event.stopPropagation();this.value=event.target.value;this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value}}));}','<label>{label}<input type={type} value={value} oninput={change}/></label>'],
 combobox:['@api label; @api value; @api options=[]; change(event){event.stopPropagation();this.value=event.target.value;this.dispatchEvent(new CustomEvent("change",{detail:{value:this.value}}));}','<label>{label}<select value={value} onchange={change}><template for:each={options} for:item="option"><option key={option.value} value={option.value}>{option.label}</option></template></select></label>'],
 tab:['@api label; @api value; active(){this.dispatchEvent(new CustomEvent("active"));}','<button onclick={active}>{label}</button><slot></slot>'],
 tabset:['@api activeTabValue;','<slot></slot>'],
 modalHeader:['@api label;','<h2>{label}</h2>'],modalBody:['','<slot></slot>'],modalFooter:['','<slot></slot>']
};
for(const [name,[js,html]]of Object.entries(controls)){
 fs.writeFileSync(path.join(mocks,name+'.js'),`import {LightningElement,api} from 'lwc'; export default class Control extends LightningElement {${js}}`);
 fs.writeFileSync(path.join(mocks,name+'.html'),`<template>${html}</template>`);
 fs.writeFileSync(path.join(mocks,name+'.css'),':host{display:block}button,input,select{font:inherit;min-height:44px;border:1px solid #b7c6d7;border-radius:5px;background:white;color:#0b5cab;padding:8px;max-width:100%}label{display:flex;flex-direction:column;gap:4px;color:#526171;font-size:14px}h2{font-size:24px}');
}
fs.writeFileSync(path.join(mocks,'icon.css'),':host{display:inline-flex;flex:none;vertical-align:middle}svg{width:15px;height:15px;fill:none;stroke:var(--slds-c-icon-color-foreground-default,#70819a);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}:host([size="small"]) svg{width:22px;height:22px}');
fs.writeFileSync(path.join(mocks,'navigation.js'),"export const NavigationMixin=(Base)=>class extends Base{[NavigationMixin.Navigate](value){window.__lastNavigation=value;}};NavigationMixin.Navigate=Symbol('navigate');");
fs.writeFileSync(path.join(mocks,'modal.js'),`import {LightningElement,api,createElement} from 'lwc'; export default class Modal extends LightningElement {
 static open(config){return new Promise(resolve=>{const backdrop=document.createElement('div');backdrop.className='preview-backdrop';const shell=document.createElement('div');shell.className='preview-modal';shell.setAttribute('role','dialog');shell.setAttribute('aria-label',config.label||'My Meetings');const close=document.createElement('button');close.className='preview-close';close.textContent='×';close.setAttribute('aria-label','Close modal');const el=createElement('c-preview-modal',{is:this});for(const key of ['initialDate','initialMode','scopeConfig','displayZone','integrationConfig'])el[key]=config[key];const finish=(value)=>{backdrop.remove();document.removeEventListener('keydown',escape);resolve(value);};const escape=(event)=>{if(event.key==='Escape')finish();};close.onclick=()=>finish();el.addEventListener('previewclose',event=>finish(event.detail));document.addEventListener('keydown',escape);shell.append(close,el);backdrop.append(shell);document.body.append(backdrop);});}
 @api close(result){this.dispatchEvent(new CustomEvent('previewclose',{detail:result}));}
}`);
(async()=>{
const bundle=await rollup({input:path.join(root,'tests/browser/entry.js'),plugins:[{
 name:'local-lwc-preview',
 resolveId(id,importer){
  if(id==='lwc')return require.resolve('@lwc/engine-dom/dist/index.js');
  if(id.startsWith('c/')){const name=id.slice(2);return path.join(lwc,name,name+'.js');}
  if(id.startsWith('lightning/'))return path.join(mocks,id.slice(10)+'.js');
  if(id.startsWith('@salesforce/'))return '\0'+id;
  if(id.startsWith('.')){let p=path.resolve(path.dirname(importer),id);if(!path.extname(p))p+='.js';return p;}
 },
 load(id){
  if(id.startsWith('\0@salesforce/'))return `export default ${JSON.stringify(id.includes('user/Id')?'005000000000001AAA':id.includes('locale')?'en-US':'UTC')};`;
  if(id.includes('.scoped.css')&&!fs.existsSync(id))return 'export default undefined;';
  if((id.endsWith('.html')||id.endsWith('.css'))&&!fs.existsSync(id))return 'export default undefined;';
 },
 transform(source,id){
  if(!fs.existsSync(id))return null;
  if(id.includes('@lwc/engine-dom'))return source.replaceAll('process.env.NODE_ENV',"'production'");
  if(id.startsWith(lwc)||id.startsWith(mocks)&&!id.endsWith('graphql.js')&&!id.endsWith('navigation.js')){
   const name=path.basename(id).split('.')[0];
   const compiled=transformSync(source,id,{name,namespace:id.startsWith(lwc)?'c':'lightning',apiVersion:65}).code;
   // Match Salesforce/Jest field assignment semantics; native class fields shadow LWC reactive accessors.
   return require('@babel/core').transformSync(compiled,{configFile:false,babelrc:false,plugins:[[require('@babel/plugin-transform-class-properties'),{loose:true}]]}).code;
  }
 }
}]});
fs.mkdirSync(path.join(root,'tests/browser/dist'),{recursive:true});await bundle.write({file:path.join(root,'tests/browser/dist/app.js'),format:'iife'});
fs.writeFileSync(path.join(root,'tests/browser/dist/index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My Meetings local QA</title><style>body{font:16px Arial,sans-serif;margin:0;padding:12px;background:#f4f6f9}p{margin:0}#mount{max-width:1200px;margin:auto}#mount.wide{background:white;border:1px solid #e1e7ef;border-radius:20px;padding:20px}.preview-backdrop{position:fixed;inset:0;background:#13253e66;z-index:10;display:flex;justify-content:center;align-items:center;padding:24px}.preview-modal{position:relative;background:white;border-radius:20px;padding:24px;width:1200px;max-width:100%;max-height:92vh;overflow:auto}.preview-close{position:absolute;top:0;right:2px;background:none;border:0;font-size:24px;color:#65748b;z-index:20;cursor:pointer}aside{font-size:12px;color:#526171;margin:0 0 12px}.slds-assistive-text{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}</style><aside>LOCAL FIXTURES · Actual compiled LWC templates · Platform controls mocked · No Salesforce connection</aside><main id="mount"></main><script src="app.js"></script></html>`);
})();
