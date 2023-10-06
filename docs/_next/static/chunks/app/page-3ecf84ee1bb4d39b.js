(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[931],{7277:function(e,t,l){Promise.resolve().then(l.bind(l,7026))},7026:function(e,t,l){"use strict";l.r(t),l.d(t,{default:function(){return H}});var a=l(5777),o=l(7017),r=l(628),n=l(7336),s=l(2891),i=l(5945),c=l(7510),d=l(774);function u(e){let{show:t}=e;return(0,a.jsx)("div",{className:"w-screen h-screen fixed backdrop-blur-sm z-10 flex flex-col items-center justify-center ".concat(t?"block":"hidden"),children:(0,a.jsxs)("div",{className:"w-96 p-4 space-y-2 rounded-md shadow-md ".concat((0,d.ff)("bg-white","bg-gray-900")),children:[(0,a.jsx)("h1",{className:"font-bold text-lg",children:"Drag & Drop an SVG to Upload"}),(0,a.jsx)("p",{children:"Drop a compatible SVG anywhere to begin separating its colors."})]})})}var f=l(3029),h=l(1295),p=l(5744),g=l(6951);function m(e){let{color:t,name:l,active:o,toggleColor:r,disabled:n=!1}=e,s=(0,i.useCallback)(()=>r(t),[t,r]),c=n?"#cbd5e1":t;return(0,a.jsx)(h.u,{label:l,children:(0,a.jsx)("button",{className:"rounded-full bg-transparent transition-all m-1 focus:outline w-8 h-8 ".concat(n?"":"hover:scale-110"),style:{borderWidth:o?"0.2rem":"1rem",borderColor:c,outlineColor:c},onClick:s,disabled:n})})}function x(e){let{colors:t,toggleColor:l,disabled:o}=e,r=[...t].map(e=>{let[t,[r,n]]=e;return(0,a.jsx)(m,{color:t,name:r,toggleColor:l,active:n,disabled:o},t)});return(0,a.jsx)("div",{className:"flex flex-wrap justify-center",children:r})}var w=l(1584),b=l(1122),y=l(7216),j=l(8572);let v=[["#f15060","bright red"],["#ff48b0","fluorescent pink"],["#ffe800","yellow"],["#00a95c","green"],["#0078bf","blue"],["#000000","black"]],C=[["#00ffff","cyan"],["#ff00ff","magenta"],["#ffff00","yellow"],["#000000","black"]];function S(e){let{colors:t,setPallette:l,addColor:o}=e;(0,i.useEffect)(()=>l(v),[l]);let[r,n]=(0,i.useState)(""),s=(0,i.useCallback)(e=>n(e.target.value),[n]),[c,d]=(0,i.useState)("#000000"),u=(0,i.useCallback)(e=>d(e.target.value),[d]),p=(0,i.useCallback)(()=>o(c,r),[c,r,o]),g=r&&!t.has(c),m=r?t.has(c)?"can only add unique colors":void 0:"must name added colors";return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(w.B,{children:[(0,a.jsx)(b.I,{placeholder:"Color Name",value:r,onChange:s}),(0,a.jsx)(b.I,{type:"color",style:{borderRadius:0,borderLeft:0,width:"8rem"},value:c,onChange:u}),(0,a.jsx)(y.xW,{style:{padding:0},children:(0,a.jsx)(h.u,{label:m,children:(0,a.jsx)(f.z,{style:{borderTopLeftRadius:0,borderBottomLeftRadius:0},isDisabled:!g,onClick:p,children:"Add"})})})]}),(0,a.jsxs)(j.P,{placeholder:"Select Pallette",onChange:e=>{let t=e.target.value;"none"===t?l([]):"riso"===t?l(v):"cmyk"===t&&l(C)},children:[(0,a.jsx)("option",{value:"none",children:"None"}),(0,a.jsx)("option",{value:"riso",children:"Risograph"}),(0,a.jsx)("option",{value:"cmyk",children:"CMYK"})]})]})}function k(e){let{children:t}=e;return(0,a.jsx)("h2",{className:"font-bold text-lg",children:t})}function N(e){let{colors:t,modifyColors:l,increments:o,setIncrements:r,download:n,isDownloading:s,showRaw:c,setShowRaw:d,rendering:u}=e,m=t.size?void 0:"must select at least one color to export",w=(0,i.useCallback)(()=>d(!0),[d]),b=(0,i.useCallback)(()=>d(!1),[d]),y=(0,i.useCallback)(e=>l({action:"toggle",color:e}),[l]),j=(0,i.useCallback)(e=>l({action:"set",colors:e}),[l]),v=(0,i.useCallback)((e,t)=>l({action:"add",color:e,name:t}),[l]),C=[...t.values()].some(e=>{let[,t]=e;return t});return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(f.z,{className:"w-full",isDisabled:!C,onMouseDown:w,onMouseUp:b,children:"Toggle Original"}),(0,a.jsx)(h.u,{label:m,children:(0,a.jsx)(f.z,{className:"w-full",isDisabled:!C,onClick:n,leftIcon:(0,a.jsx)(g.ZJh,{}),isLoading:s,children:"Export Separation"})}),(0,a.jsx)(k,{children:"Colors"}),(0,a.jsx)("p",{children:"Click a color to toggle its use in the separation"}),(0,a.jsx)(x,{colors:t,toggleColor:y,disabled:u}),(0,a.jsx)(k,{children:"Pallette"}),(0,a.jsx)("p",{children:"Add new colors or reset to a pallette"}),(0,a.jsx)(S,{setPallette:j,colors:t,addColor:v}),(0,a.jsx)(k,{children:"Dicretizations"}),(0,a.jsx)("p",{children:"Drag the slider to change the number of dicrete opacities, this produces a more posterized appearance."}),(0,a.jsx)("div",{className:"px-4",children:(0,a.jsxs)(p.iR,{defaultValue:o,onChangeEnd:r,min:0,max:7,step:1,isDisabled:u,children:[(0,a.jsx)(p.Uj,{children:(0,a.jsx)(p.Ms,{})}),(0,a.jsx)(p.gs,{})]})})]})}var D=l(8905);function E(e){let{helpDisabled:t,toggleHelp:l}=e;return(0,a.jsxs)("div",{className:"flex justify-center space-x-2",children:[(0,a.jsx)(h.u,{label:"show help",children:(0,a.jsx)(D.h,{"aria-label":"show help information",icon:(0,a.jsx)(g.DAO,{}),isDisabled:t,onClick:l})}),(0,a.jsx)("a",{href:"https://github.com/hafaio/color-separation",target:"_blank",rel:"noreferrer",children:(0,a.jsx)(D.h,{"aria-label":"view source on github",icon:(0,a.jsx)(g.hJX,{})})})]})}function P(e){let{closeable:t}=e,l=t?(0,a.jsx)("p",{className:"pt-4 pb-4",children:"Click the info button below to hide this information."}):null;return(0,a.jsxs)("div",{className:"flex flex-col justify-between flex-grow",children:[(0,a.jsxs)("div",{className:"space-y-1 flex-grow",children:[(0,a.jsx)("p",{children:"Separate an SVG into spot colors; useful for risograph printing. Currently this assumes a naive subtractive color model, that works reasonably, but could probably be improved."}),(0,a.jsxs)("ol",{className:"list-decimal ml-4",children:[(0,a.jsx)("li",{children:"Upload your SVG by clicking above or dropping it anywhere."}),(0,a.jsx)("li",{children:"Customize your color pallette by adding colors available."}),(0,a.jsx)("li",{children:"Select different colors and losses to check our your decomposition."}),(0,a.jsx)("li",{children:"Click export to download an individual SVG for each layer."})]})]}),l]})}var I=l(2065),M=l(7865),R=l(6406);l(3902);let G=(0,I.B1)({config:{initialColorMode:"system",useSystemColorMode:!0}},(0,M.A)({colorScheme:"gray"}));function V(e){let{children:t}=e;return(0,a.jsx)(R.x,{theme:G,children:t})}function B(e){let{onFile:t,loading:l=!1}=e,o=(0,i.useRef)(null);return(0,a.jsxs)("div",{children:[(0,a.jsx)("input",{ref:o,type:"file",accept:"image/svg+xml, image/png, image/jpeg",onChange:e=>{var l;let a=null===(l=e.target.files)||void 0===l?void 0:l[0];a&&t(a)},className:"hidden"}),(0,a.jsx)(f.z,{className:"w-full",isLoading:l,onClick:()=>{var e;null===(e=o.current)||void 0===e||e.click()},leftIcon:(0,a.jsx)(g.Gq2,{}),children:"Upload"})]})}async function z(e){let t=await fetch(e);return await t.blob()}function A(e){let t=new FileReader;return new Promise(l=>{t.addEventListener("load",()=>l(t.result)),t.readAsDataURL(e)})}async function L(e,t,l){if("image/svg+xml"===e.type)return e;let a=await createImageBitmap(e);if(a.width<=t&&a.height<=l)return e;let o=a.width*l,r=a.height*t,[n,s]=o>r?[t,r/a.width]:[o/a.height,l],i=new OffscreenCanvas(n,s),c=i.getContext("2d");return c.drawImage(a,0,0,n,s),await i.convertToBlob()}var O=l(2133);async function*_(e,t,a){let o=new Set;for await(let t of e)o.add(t.formatHex());let n=new Uint8ClampedArray(3*t.length);for(let[e,l]of t.entries()){let{r:t,g:a,b:o}=l.rgb();n.set([t,a,o],3*e)}let s={colors:o,pool:n,increments:a},i=new Worker(l.tu(new URL(l.p+l.u(620),l.b))),c=await new Promise(e=>{i.addEventListener("message",t=>e(t.data)),i.postMessage(s,{transfer:[n.buffer]})});if("err"===c.typ)throw Error(c.err);if("success"!==c.typ)throw Error("unreachable");let{prevs:d,opacs:u}=c,f=0;for(let e of o){let[l,a,o]=d.slice(3*f,(f+1)*3),n=[...u.slice(f*t.length,(f+1)*t.length)];yield[e,r.B8(l,a,o),n],f++}}let U=["fill","stroke","stopColor"];async function*Z(e){if("image/png"===e.type||"image/jpeg"===e.type){let t=await createImageBitmap(e),l=new OffscreenCanvas(t.width,t.height),a=l.getContext("2d");a.drawImage(t,0,0);let{data:o}=a.getImageData(0,0,t.width,t.height,{colorSpace:"srgb"});for(let e=0;e<o.length;e+=4){let[t,l,a]=o.slice(e,e+3);yield r.B8(t,l,a)}}else if("image/svg+xml"===e.type){let n=await e.text(),s=new DOMParser,i=s.parseFromString(n,e.type);for(let e of i.querySelectorAll("*")){var t,l,a,o;if(e instanceof SVGStyleElement){for(let o of null!==(l=null===(t=e.sheet)||void 0===t?void 0:t.cssRules)&&void 0!==l?l:[])if(o instanceof CSSStyleRule)for(let e of U){let t=r.ZP(null===(a=o.style)||void 0===a?void 0:a[e]);t&&(yield t)}}else if(e instanceof SVGImageElement){let t=await z(e.href.baseVal);for await(let e of Z(t))yield e}else if(e instanceof SVGElement)for(let t of U){let l=r.ZP(null===(o=e.style)||void 0===o?void 0:o[t]);l&&(yield l)}}}else throw Error("unhandled url type: ".concat(e.type))}async function F(e,t){if("image/png"===e.type||"image/jpeg"===e.type){let l=await createImageBitmap(e),a=new OffscreenCanvas(l.width,l.height),o=a.getContext("2d");o.drawImage(l,0,0);let n=o.getImageData(0,0,l.width,l.height,{colorSpace:"srgb"});for(let e=0;e<n.data.length;e+=4){let[l,a,o]=n.data.slice(e,e+3),{r:s,g:i,b:c}=t(r.B8(l,a,o)).rgb();n.data.set([s,i,c],e)}return o.putImageData(n,0,0),await a.convertToBlob()}if("image/svg+xml"===e.type){let n=await e.text(),s=new DOMParser,i=s.parseFromString(n,e.type),c=[];for(let e of i.querySelectorAll("*"))if(e instanceof SVGStyleElement){var l,a,o;let n=[...null!==(a=null===(l=e.sheet)||void 0===l?void 0:l.cssRules)&&void 0!==a?a:[]];for(let e of n)if(e instanceof CSSStyleRule)for(let l of U){let a=r.ZP(null===(o=e.style)||void 0===o?void 0:o[l]);a&&(e.style[l]=t(a).toString())}e.textContent=n.map(e=>e.cssText).join("\n")}else if(e instanceof SVGImageElement)c.push((async()=>{let l=await z(e.href.baseVal),a=await F(l,t),o=await A(a);e.setAttribute("href",o)})());else if(e instanceof SVGElement)for(let l of U){let a=r.ZP(e.style[l]);a&&(e.style[l]=t(a).toString())}await Promise.all(c);let d=new XMLSerializer,u=d.serializeToString(i);return new Blob([u],{type:"image/svg+xml"})}throw Error("unhandled url type: ".concat(e.type))}async function T(e,t,l){let a=new Map;for await(let[o,r]of _(Z(e),t,l))a.set(o,r);return await F(e,e=>a.get(e.formatHex()).copy({opacity:e.opacity}))}async function q(e,t,l){let a=new Map;for await(let[o,,r]of _(Z(e),t,l))a.set(o,r);return await Promise.all(t.map((t,l)=>F(e,e=>{let t=a.get(e.formatHex())[l],o=O.MA((1-t)*100);return o.copy({opacity:e.opacity})})))}function H(){let[e,t]=(0,i.useState)(!1),[l,d]=(0,i.useState)(!1),[f,h]=(0,i.useState)(!1),[p,g]=(0,i.useState)(!1),m=(0,i.useCallback)(()=>d(!l),[l,d]),x=(0,o.p)(),w=(0,i.useRef)(null),[b,y]=(0,i.useState)(),[j,v]=(0,i.useReducer)((e,t)=>{if("set"===t.action)return new Map(t.colors.map(e=>{let[t,l]=e;return[t,[l,!1]]}));if("add"===t.action){let l=new Map(e);return l.set(t.color,[t.name,!1]),l}if("toggle"===t.action){let l=new Map(e),[a,o]=l.get(t.color);return l.set(t.color,[a,!o]),l}if("clear"===t.action)return new Map([...e].map(e=>{let[t,[l]]=e;return[t,[l,!1]]}));throw Error("unreachable")},new Map),[C,S]=(0,i.useState)(),[k,D]=(0,i.useState)(0);(0,i.useEffect)(()=>{b&&[...j.values()].some(e=>{let[,t]=e;return t})?(async()=>{try{h(!0);let e=[];for(let[t,[,l]]of j)l&&e.push(r.ZP(t));let t=await z(b.preview),l=await T(t,e,k),a=await A(l);S(a)}catch(e){console.error(e),S(void 0),x({title:"Couldn't separate image",status:"error",position:"bottom-left"})}finally{h(!1)}})():S(void 0)},[j,k,b,S,x]);let I=(0,i.useCallback)(async()=>{if(b)try{g(!0);let e=b.raw.name,t=e.slice(0,e.lastIndexOf("."))||e,l=[],a=[];for(let[e,[t,o]]of j)o&&(l.push(r.ZP(e)),a.push(t));let o=await q(b.raw,l,k);for(let[e,l]of a.entries()){let a=o[e],r=(0,s.extension)(a.type);(0,n.saveAs)(a,"".concat(t,"_").concat(l.replace(" ","_"),".").concat(r))}}catch(e){console.error(e),x({title:"Couldn't separate image",status:"error",position:"bottom-left"})}finally{g(!1)}},[b,j,x,k]),M=(0,i.useCallback)(async e=>{try{y(null),d(!1),v({action:"clear"});let{clientWidth:t,clientHeight:l}=w.current,a=await L(e,t,l),o=await A(a);y({raw:e,preview:o})}catch(e){console.error(e),x({title:"Couldn't load file",status:"error",position:"bottom-left"}),y(void 0)}},[y,d,x]),R=b&&!l?(0,a.jsx)(N,{colors:j,modifyColors:v,increments:k,setIncrements:D,download:I,isDownloading:p,showRaw:e,setShowRaw:t,rendering:f}):(0,a.jsx)(P,{closeable:!!b}),G=e?null==b?void 0:b.preview:null!=C?C:null==b?void 0:b.preview,O=G?(0,a.jsx)("img",{src:G,alt:"rendered separation",className:"h-full w-full object-contain"}):null,_=(0,i.useCallback)((e,t)=>{let[l]=e;l&&M(l),t.length&&x({title:"Dropped file was not an SVG, PNG, or JPEG",status:"error",position:"bottom-left"})},[M,x]),{getRootProps:U,getInputProps:Z,isDragActive:F}=(0,c.uI)({onDrop:_,accept:{"image/svg+xml":[],"image/png":[],"image/jpeg":[]},multiple:!1,noClick:!0});return(0,a.jsx)(V,{children:(0,a.jsxs)("div",{...U({className:"h-screen w-screen flex flex-row"}),children:[(0,a.jsx)("input",{...Z()}),(0,a.jsx)(u,{show:F}),(0,a.jsxs)("div",{className:"w-72 h-full p-2 overflow-y-auto flex flex-col flex-shrink-0 justify-between",children:[(0,a.jsxs)("div",{className:"space-y-2 flex-grow flex flex-col",children:[(0,a.jsx)("h1",{className:"font-bold text-xl text-center",children:"Spot Color Separator"}),(0,a.jsx)(B,{onFile:M,loading:null===b}),R]}),(0,a.jsx)(E,{helpDisabled:!b,toggleHelp:m})]}),(0,a.jsx)("div",{className:"h-full w-full overflow-auto",ref:w,children:O})]})})}},3902:function(){}},function(e){e.O(0,[139,495,986,670,744],function(){return e(e.s=7277)}),_N_E=e.O()}]);