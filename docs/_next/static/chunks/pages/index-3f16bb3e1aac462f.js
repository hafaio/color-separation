(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[405],{3074:function(e,l,t){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return t(4077)}])},4077:function(e,l,t){"use strict";t.r(l),t.d(l,{default:function(){return z}});var o=t(1874),r=t(2816),n=t(3843),a=t(1908),s=t(5998),i=t(5530),c=t(1541),d=t(2160),u=t(9611),f=t.n(u),h=t(9953),m=t(4085);function p(e,l,t){let o=e.get(l);if(void 0!==o)return o;{let r=t(l);return e.set(l,r),r}}function x(e){let l;if(l=e.match(/^#([0-9a-fA-F]{6})$/)){let[,t]=l;return"#".concat(t.toLowerCase())}if(l=e.match(/^#([0-9a-fA-F]{3})$/)){let[,[o,r,n]]=l;return"#".concat(o).concat(o).concat(r).concat(r).concat(n).concat(n).toLowerCase()}if(l=e.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/)){let[,a,s,i,c]=l;return g([a,s,i].map(e=>parseInt(e,16)/255),parseInt(c,16)/255)}if(l=e.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)){let[,d,u,f]=l;return j([parseInt(d)/255,parseInt(u)/255,parseInt(f)/255])}if(l=e.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([-+\d.eE]+)\s*\)$/)){let[,h,m,p,x]=l;return g([h,m,p].map(e=>parseInt(e)/255),parseFloat(x))}throw Error("invalid color format: '".concat(e,"'"))}function g(e,l){return j(e.map(e=>(e-1)*l+1))}function j(e){let l=e.map(e=>Math.round(255*e).toString(16).padStart(2,"0")).join("");return"#".concat(l)}var b=t(6011),v=t(5630);function w(e){return[void 0,void 0,void 0].map((l,t)=>1-parseInt(e.slice(2*t+1,2*t+3),16)/255)}function C(e,l){let t=0;for(let[o,r]of e.entries())t+=r*l[o];return t}function y(e){let{onFile:l,loading:t=!1}=e,n=e=>{var t;let o=null===(t=e.target.files)||void 0===t?void 0:t[0];o&&l(o)},a=(0,h.useRef)(null),s=()=>{var e;null===(e=a.current)||void 0===e||e.click()};return(0,o.jsxs)("div",{children:[(0,o.jsx)("input",{ref:a,type:"file",accept:"image/svg+xml",onChange:n,className:"hidden"}),(0,o.jsx)(r.zx,{className:"w-full",isLoading:t,onClick:s,leftIcon:(0,o.jsx)(m.Gq2,{}),children:"Upload"})]})}function k(e){let{color:l,name:t,active:r,toggleColor:a}=e,s=(0,h.useCallback)(()=>a(l),[l,a]);return(0,o.jsx)(n.u,{label:t,children:(0,o.jsx)("button",{className:"rounded-full bg-transparent transition-all m-1 focus:outline hover:scale-110",style:{width:"2rem",height:"2rem",borderWidth:r?"0.2rem":"1rem",borderColor:l,outlineColor:l},onClick:s})})}let S=[["#f15060","bright red"],["#ff48b0","fluorescent pink"],["#ffe800","yellow"],["#00a95c","green"],["#0078bf","blue"],["#000000","black"]],N=[["#00ffff","cyan"],["#ff00ff","magenta"],["#ffff00","yellow"],["#000000","black"]];function M(e){let{colors:l,setPallette:t,addColor:i}=e,c=e=>{let l=e.target.value;"none"===l?t([]):"riso"===l?t(S):"cmyk"===l&&t(N)};(0,h.useEffect)(()=>t(S),[t]);let[d,u]=(0,h.useState)(""),f=(0,h.useCallback)(e=>u(e.target.value),[u]),[m,p]=(0,h.useState)("#000000"),x=(0,h.useCallback)(e=>p(e.target.value),[p]),g=(0,h.useCallback)(()=>i(m,d),[m,d,i]),j=d&&!l.has(m),b=d?l.has(m)?"can only add unique colors":void 0:"must name added colors";return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsxs)(a.BZ,{children:[(0,o.jsx)(a.II,{placeholder:"Color Name",value:d,onChange:f}),(0,o.jsx)(a.II,{type:"color",style:{borderRadius:0,borderLeft:0,width:"8rem"},value:m,onChange:x}),(0,o.jsx)(a.xW,{style:{padding:0},children:(0,o.jsx)(n.u,{label:b,children:(0,o.jsx)(r.zx,{style:{borderTopLeftRadius:0,borderBottomLeftRadius:0},isDisabled:!j,onClick:g,children:"Add"})})})]}),(0,o.jsxs)(s.Ph,{placeholder:"Select Pallette",onChange:c,children:[(0,o.jsx)("option",{value:"none",children:"None"}),(0,o.jsx)("option",{value:"riso",children:"Risograph"}),(0,o.jsx)("option",{value:"cmyk",children:"CMYK"})]})]})}function I(e){let{colors:l,toggleColor:t}=e,r=[...l].map(e=>{let[l,[r,n]]=e;return(0,o.jsx)(k,{color:l,name:r,toggleColor:t,active:n},l)});return(0,o.jsx)("div",{className:"flex flex-wrap justify-center",children:r})}function E(e){let{children:l}=e;return(0,o.jsx)("h2",{className:"font-bold text-lg",children:l})}function F(e){let{colors:l,modifyColors:t,quadratic:a,toggleQuadratic:s,download:c,showRaw:d,setShowRaw:u,fit:f,toggleFit:p}=e,x=l.size?void 0:"must select at least one color to export",g=(0,h.useCallback)(()=>u(!0),[u]),j=(0,h.useCallback)(()=>u(!1),[u]),b=(0,h.useCallback)(e=>t({action:"toggle",color:e}),[t]),v=(0,h.useCallback)(e=>t({action:"set",colors:e}),[t]),w=(0,h.useCallback)((e,l)=>t({action:"add",color:e,name:l}),[t]),C=[...l.values()].some(e=>{let[,l]=e;return l});return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(r.zx,{className:"w-full",isDisabled:!C,onMouseDown:g,onMouseUp:j,children:"Toggle Original"}),(0,o.jsx)(n.u,{label:x,children:(0,o.jsx)(r.zx,{className:"w-full",isDisabled:!C,onClick:c,leftIcon:(0,o.jsx)(m.ZJh,{}),children:"Export Separation"})}),(0,o.jsx)(E,{children:"Colors"}),(0,o.jsx)("p",{children:"Click a color to toggle its use in the separation"}),(0,o.jsx)(I,{colors:l,toggleColor:b}),(0,o.jsx)(E,{children:"Pallette"}),(0,o.jsx)("p",{children:"Add new colors or reset to a pallette"}),(0,o.jsx)(M,{setPallette:v,addColor:w,colors:l}),(0,o.jsxs)("div",{className:"flex flex-row justify-between items-center",children:[(0,o.jsx)("label",{htmlFor:"quadratic",children:(0,o.jsx)(E,{children:"Quadratic Loss"})}),(0,o.jsx)(i.r,{id:"quadratic",isChecked:a,onChange:s,colorScheme:"gray"})]}),(0,o.jsxs)("div",{className:"flex flex-row justify-between items-center",children:[(0,o.jsx)("label",{htmlFor:"image-fit",children:(0,o.jsx)(E,{children:"Fit Image"})}),(0,o.jsx)(i.r,{id:"image-fit",colorScheme:"gray",isChecked:f,onChange:p})]})]})}function _(e){let{closeable:l}=e,t=l?(0,o.jsx)("p",{className:"pt-4 pb-4",children:"Click the info button below to hide this information."}):null;return(0,o.jsxs)("div",{className:"flex flex-col justify-between flex-grow",children:[(0,o.jsxs)("div",{className:"space-y-1 flex-grow",children:[(0,o.jsx)("p",{children:"Separate an SVG into spot colors; useful for risograph printing. Currently this assumes a naive color model, and printing on white."}),(0,o.jsxs)("ol",{className:"list-decimal ml-4",children:[(0,o.jsxs)("li",{children:["Upload your svg above. Your SVG can contain opacity, but"," ",(0,o.jsx)("span",{className:"italic",children:"must not"})," contain overlapping elements, embedded bitmaps, or gradients."]}),(0,o.jsx)("li",{children:"Customize your color pallette by adding colors available."}),(0,o.jsx)("li",{children:"Select different colors and losses to check our your decomposition."}),(0,o.jsx)("li",{children:"Click export to download an individual SVG for each layer."})]})]}),t]})}function z(){let[e,l]=(0,h.useReducer)(e=>!e,!0),[t,a]=(0,h.useState)(!1),[s,i]=(0,h.useState)(!1),u=(0,h.useCallback)(()=>i(!s),[s,i]),g=(0,c.pm)(),[k,S]=(0,h.useState)(),[N,M]=(0,h.useState)(),[I,E]=(0,h.useReducer)((e,l)=>{if("set"===l.action)return new Map(l.colors.map(e=>{let[l,t]=e;return[l,[t,!1]]}));if("add"===l.action){let t=new Map(e);return t.set(l.color,[l.name,!1]),t}{let o=new Map(e),[r,n]=o.get(l.color);return o.set(l.color,[r,!n]),o}},new Map),[[z,R],A]=(0,h.useState)([void 0,new Map]),[P,L]=(0,h.useReducer)(e=>!e,!0);(0,h.useEffect)(()=>{if(N){if([...I.values()].some(e=>{let[,l]=e;return l})){let e=[];for(let[l,[,t]]of I)t&&e.push(l);let o=new Map;for(let[r,{fill:n,stroke:a}]of N.elems){let{opacities:s,color:i}=function(e,l){let{quadratic:t=!0}=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},o=w(e),r=l.map(w),{error:n,opacities:a}=t?function(e,l){let t=l.map(e=>1e-4*e.reduce((e,l)=>e+(1-l)/3,0)),o=[,...l.map((e,o)=>[,...l.map((l,r)=>C(e,l)+(o===r?t[o]:0))])],r=[,...l.map(l=>C(l,e))],n=[,...l.map((e,t)=>[,...l.map((e,l)=>t===l?1:0),...l.map((e,l)=>t===l?-1:0)])],a=[,...l.map(()=>0),...l.map(()=>-1)],{solution:[,...s],value:[,i],message:c,...d}=(0,v.solveQP)(o,r,n,a),u=C(e,e),f=s.reduce((e,l)=>e+1e-4*l*l,0);if(!c)return{error:Math.sqrt(Math.max(2*i+u-f,0))/3,opacities:s.map(e=>Math.min(Math.max(0,e),1))};throw Error(c)}(o,r):function(e,l){let t=l.map(e=>1e-4*e.reduce((e,l)=>e+(1-l)/3,0)),o={},r={};for(let[n,a]of t.entries())r["mix ".concat(n)]={error:a};for(let[s,i]of e.entries()){let c="up ".concat(s);o[c]={max:i};let d="dn ".concat(s);o[d]={min:i};let u="slack ".concat(s);for(let[f,h]of(r[u]={error:1,[c]:-1,[d]:1},l.entries())){let m=h[s],p="mix ".concat(f);r[p][c]=m,r[p][d]=m}}let{result:x,feasible:g,bounded:j,...v}=b.Solve.call({},{optimize:"error",opType:"min",constraints:o,variables:r});if(g&&j){var w;let C=l.map((e,l)=>null!==(w=v["mix ".concat(l)])&&void 0!==w?w:0),y=C.reduce((e,l,o)=>e+t[o]*l,0);return{error:(x-y)/3,opacities:C}}throw Error("couldn't find bounded feasible solution")}(o,r),s=[0,0,0];for(let[i,c]of r.entries()){let d=a[i];for(let[u,f]of c.entries())s[u]+=f*d}return{error:n,opacities:a,color:j(s.map(e=>1-e))}}(r,e,{quadratic:P});for(let c of n)c.style.fill=i;for(let d of a)d.style.stroke=i;o.set(r,s)}let u=new XMLSerializer,f=u.serializeToString(N.doc);A(["data:image/svg+xml,".concat(encodeURIComponent(f)),o])}else{var h;for(let[m,{fill:p,stroke:x}]of null!==(h=null==N?void 0:N.elems)&&void 0!==h?h:[]){for(let g of p)g.style.fill=m;for(let y of x)y.style.stroke=m}A([void 0,new Map])}}else A([void 0,new Map])},[I,P,N,A]);let G=(0,h.useCallback)(()=>{if(N&&R.size&&k){let e=k.slice(0,k.lastIndexOf("."))||k,l=new XMLSerializer,t=0;for(let[o,[r,n]]of I)if(n){for(let[a,{fill:s,stroke:i}]of N.elems){let c=R.get(a)[t],u=Math.round(255*(1-c)).toString(16),f="#".concat(u).concat(u).concat(u);for(let h of s)h.style.fill=f;for(let m of i)m.style.stroke=f}let p=l.serializeToString(N.doc),x=new Blob([p],{type:"image/svg+xml"});(0,d.saveAs)(x,"".concat(e,"_").concat(r.replace(" ","_"),".svg")),t++}}},[N,R,I,k]),q=(0,h.useCallback)(async e=>{let l,t;S(e.name),M(null),i(!1);try{let o=await e.text(),r=new DOMParser,n=r.parseFromString(o,"image/svg+xml");(t=document.createElement("div")).style.display="none";let a=t.attachShadow({mode:"open"});for(let s of n.children)a.appendChild(s);document.documentElement.appendChild(t);let c=new Map;for(let d of a.querySelectorAll("*"))if(d instanceof SVGElement){let{fill:u,stroke:f}=getComputedStyle(d);if(u&&"none"!==u)try{let h=x(u),m=p(c,h,()=>({fill:[],stroke:[]})).fill;m.push(d)}catch(j){console.error("problem parsing color",j),l="Problem parsing colors in SVG",d.style.fill="none"}if(f&&"none"!==f)try{let b=x(f),v=p(c,b,()=>({fill:[],stroke:[]})).stroke;v.push(d)}catch(w){console.error("problem parsing color",w),l="Problem parsing colors in SVG",d.style.stroke="none"}}for(let C of a.children)n.appendChild(C);M({raw:"data:image/svg+xml,".concat(encodeURIComponent(o)),doc:n,elems:c})}catch(y){console.error(y),l="Problem loading SVG",M(void 0)}finally{try{t&&document.documentElement.removeChild(t)}catch(k){}}l&&g({title:l,status:"error",position:"bottom-left"})},[M,S,i,g]),D=N&&!s?(0,o.jsx)(F,{colors:I,modifyColors:E,quadratic:P,toggleQuadratic:L,download:G,showRaw:t,setShowRaw:a,fit:e,toggleFit:l}):(0,o.jsx)(_,{closeable:!!N}),T=t?null==N?void 0:N.raw:null!=z?z:null==N?void 0:N.raw,U=T?(0,o.jsx)("img",{src:T,alt:"rendered separation",className:"h-full w-full ".concat(e?"object-contain":"object-cover")}):null;return(0,o.jsxs)("div",{className:"h-screen w-screen flex flex-row",children:[(0,o.jsx)(f(),{children:(0,o.jsx)("title",{children:"Spot Color Separation"})}),(0,o.jsxs)("div",{className:"w-72 h-full p-2 overflow-y-auto flex flex-col flex-shrink-0 justify-between",children:[(0,o.jsxs)("div",{className:"space-y-2 flex-grow flex flex-col",children:[(0,o.jsx)("h1",{className:"font-bold text-xl text-center",children:"Spot Color Separator"}),(0,o.jsx)(y,{onFile:q,loading:null===N}),D]}),(0,o.jsxs)("div",{className:"flex justify-center space-x-2",children:[(0,o.jsx)(n.u,{label:"show help",children:(0,o.jsx)(r.hU,{"aria-label":"show help information",icon:(0,o.jsx)(m.DAO,{}),isDisabled:!N,onClick:u})}),(0,o.jsx)("a",{href:"https://github.com/hafaio/color-separation",target:"_blank",rel:"noreferrer",children:(0,o.jsx)(r.hU,{"aria-label":"view source on github",icon:(0,o.jsx)(m.hJX,{})})})]})]}),(0,o.jsx)("div",{className:"h-full w-full overflow-auto",children:U})]})}},3281:function(){},1805:function(){}},function(e){e.O(0,[219,591,774,888,179],function(){return e(e.s=3074)}),_N_E=e.O()}]);