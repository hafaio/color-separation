(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[931],{3281:function(){},1805:function(){},507:function(e,l,t){Promise.resolve().then(t.bind(t,983))},983:function(e,l,t){"use strict";t.r(l),t.d(l,{default:function(){return F}});var o=t(8472),r=t(5631),n=t(7336),a=t(3078),s=t(58),i=t(8906);function c(e){let{show:l}=e;return(0,o.jsx)("div",{className:"w-screen h-screen fixed backdrop-blur-sm z-10 flex flex-col items-center justify-center ".concat(l?"block":"hidden"),children:(0,o.jsxs)("div",{className:"w-96 p-4 space-y-2 rounded-md shadow-md ".concat((0,i.ff)("bg-white","bg-gray-900")),children:[(0,o.jsx)("h1",{className:"font-bold text-lg",children:"Drag & Drop an SVG to Upload"}),(0,o.jsx)("p",{children:"Drop a compatible SVG anywhere to begin separating its colors."})]})})}var d=t(6582),u=t(8486),f=t(4940),h=t(3452),p=t(6531);function x(e){let{color:l,name:t,active:r,toggleColor:n}=e,s=(0,a.useCallback)(()=>n(l),[l,n]);return(0,o.jsx)(u.u,{label:t,children:(0,o.jsx)("button",{className:"rounded-full bg-transparent transition-all m-1 focus:outline hover:scale-110",style:{width:"2rem",height:"2rem",borderWidth:r?"0.2rem":"1rem",borderColor:l,outlineColor:l},onClick:s})})}function m(e){let{colors:l,toggleColor:t}=e,r=[...l].map(e=>{let[l,[r,n]]=e;return(0,o.jsx)(x,{color:l,name:r,toggleColor:t,active:n},l)});return(0,o.jsx)("div",{className:"flex flex-wrap justify-center",children:r})}var g=t(3280),j=t(4808),b=t(1014),v=t(3764);let w=[["#f15060","bright red"],["#ff48b0","fluorescent pink"],["#ffe800","yellow"],["#00a95c","green"],["#0078bf","blue"],["#000000","black"]],C=[["#00ffff","cyan"],["#ff00ff","magenta"],["#ffff00","yellow"],["#000000","black"]];function y(e){let{colors:l,setPallette:t,addColor:r,paperColor:n,setPaperColor:s}=e;(0,a.useEffect)(()=>t(w),[t]);let[i,c]=(0,a.useState)(""),f=(0,a.useCallback)(e=>c(e.target.value),[c]),[h,p]=(0,a.useState)("#000000"),x=(0,a.useCallback)(e=>p(e.target.value),[p]),m=(0,a.useCallback)(e=>s(e.target.value),[s]),y=(0,a.useCallback)(()=>r(h,i),[h,i,r]),S=i&&!l.has(h),k=i?l.has(h)?"can only add unique colors":void 0:"must name added colors";return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsxs)(g.B,{children:[(0,o.jsx)(j.I,{placeholder:"Color Name",value:i,onChange:f}),(0,o.jsx)(j.I,{type:"color",style:{borderRadius:0,borderLeft:0,width:"8rem"},value:h,onChange:x}),(0,o.jsx)(b.xW,{style:{padding:0},children:(0,o.jsx)(u.u,{label:k,children:(0,o.jsx)(d.z,{style:{borderTopLeftRadius:0,borderBottomLeftRadius:0},isDisabled:!S,onClick:y,children:"Add"})})})]}),(0,o.jsxs)(v.P,{placeholder:"Select Pallette",onChange:e=>{let l=e.target.value;"none"===l?t([]):"riso"===l?t(w):"cmyk"===l&&t(C)},children:[(0,o.jsx)("option",{value:"none",children:"None"}),(0,o.jsx)("option",{value:"riso",children:"Risograph"}),(0,o.jsx)("option",{value:"cmyk",children:"CMYK"})]}),(0,o.jsxs)(g.B,{children:[(0,o.jsx)(b.Ui,{children:(0,o.jsx)(u.u,{label:"Set the printed paper color",children:"Paper Color"})}),(0,o.jsx)(j.I,{type:"color",value:n,onChange:m})]})]})}function S(e){let{children:l}=e;return(0,o.jsx)("h2",{className:"font-bold text-lg",children:l})}function k(e){let{colors:l,modifyColors:t,paperColor:r,setPaperColor:n,quadratic:s,toggleQuad:i,usePaper:c,togglePaper:x,increments:g,setIncrements:j,download:b,showRaw:v,setShowRaw:w}=e,C=l.size?void 0:"must select at least one color to export",k=(0,a.useCallback)(()=>w(!0),[w]),N=(0,a.useCallback)(()=>w(!1),[w]),M=(0,a.useCallback)(e=>t({action:"toggle",color:e}),[t]),R=(0,a.useCallback)(e=>t({action:"set",colors:e}),[t]),P=(0,a.useCallback)((e,l)=>t({action:"add",color:e,name:l}),[t]),z=[...l.values()].some(e=>{let[,l]=e;return l});return(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(d.z,{className:"w-full",isDisabled:!z,onMouseDown:k,onMouseUp:N,children:"Toggle Original"}),(0,o.jsx)(u.u,{label:C,children:(0,o.jsx)(d.z,{className:"w-full",isDisabled:!z,onClick:b,leftIcon:(0,o.jsx)(p.ZJh,{}),children:"Export Separation"})}),(0,o.jsx)(S,{children:"Colors"}),(0,o.jsx)("p",{children:"Click a color to toggle its use in the separation"}),(0,o.jsx)(m,{colors:l,toggleColor:M}),(0,o.jsx)(S,{children:"Pallette"}),(0,o.jsx)("p",{children:"Add new colors or reset to a pallette"}),(0,o.jsx)(y,{setPallette:R,colors:l,addColor:P,paperColor:r,setPaperColor:n}),(0,o.jsx)(S,{children:"Dicretizations"}),(0,o.jsx)("p",{children:"Drag the slider to change the number of dicrete opacities"}),(0,o.jsx)("div",{className:"px-4",children:(0,o.jsxs)(f.iR,{defaultValue:g,onChange:j,min:0,max:7,step:1,children:[(0,o.jsx)(f.Uj,{children:(0,o.jsx)(f.Ms,{})}),(0,o.jsx)(f.gs,{})]})}),(0,o.jsx)(u.u,{label:"Toggle for different separation",children:(0,o.jsxs)("div",{className:"flex flex-row justify-between items-baseline",children:[(0,o.jsx)("label",{htmlFor:"quadratic",children:(0,o.jsx)(S,{children:"Quadratic Loss"})}),(0,o.jsx)(h.r,{id:"quadratic",onChange:i,isChecked:s})]})}),(0,o.jsx)(u.u,{label:"Account for paper color when doing separation",children:(0,o.jsxs)("div",{className:"flex flex-row justify-between items-baseline",children:[(0,o.jsx)("label",{htmlFor:"account-paper-color",children:(0,o.jsx)(S,{children:"Account for Paper Color"})}),(0,o.jsx)(h.r,{id:"account-paper-color",onChange:x,isChecked:c})]})})]})}var N=t(7189);function M(e){let{helpDisabled:l,toggleHelp:t}=e;return(0,o.jsxs)("div",{className:"flex justify-center space-x-2",children:[(0,o.jsx)(u.u,{label:"show help",children:(0,o.jsx)(N.h,{"aria-label":"show help information",icon:(0,o.jsx)(p.DAO,{}),isDisabled:l,onClick:t})}),(0,o.jsx)("a",{href:"https://github.com/hafaio/color-separation",target:"_blank",rel:"noreferrer",children:(0,o.jsx)(N.h,{"aria-label":"view source on github",icon:(0,o.jsx)(p.hJX,{})})})]})}function R(e){let{closeable:l}=e,t=l?(0,o.jsx)("p",{className:"pt-4 pb-4",children:"Click the info button below to hide this information."}):null;return(0,o.jsxs)("div",{className:"flex flex-col justify-between flex-grow",children:[(0,o.jsxs)("div",{className:"space-y-1 flex-grow",children:[(0,o.jsx)("p",{children:"Separate an SVG into spot colors; useful for risograph printing. Currently this assumes a naive color model, and printing on white."}),(0,o.jsxs)("ol",{className:"list-decimal ml-4",children:[(0,o.jsxs)("li",{children:["Upload your SVG by clicking above or dropping it anywhere. Your SVG can contain opacity, but ",(0,o.jsx)("span",{className:"italic",children:"must not"})," ","contain overlapping elements, embedded bitmaps, or gradients."]}),(0,o.jsx)("li",{children:"Customize your color pallette by adding colors available."}),(0,o.jsx)("li",{children:"Select different colors and losses to check our your decomposition."}),(0,o.jsx)("li",{children:"Click export to download an individual SVG for each layer."})]})]}),t]})}var P=t(8397),z=t(2968),D=t(1631);t(7313);let E=(0,P.B1)({config:{initialColorMode:"system",useSystemColorMode:!0}},(0,z.A)({colorScheme:"gray"}));function G(e){let{children:l}=e;return(0,o.jsx)(D.x,{theme:E,children:l})}function V(e){let{onFile:l,loading:t=!1}=e,r=(0,a.useRef)(null);return(0,o.jsxs)("div",{children:[(0,o.jsx)("input",{ref:r,type:"file",accept:"image/svg+xml",onChange:e=>{var t;let o=null===(t=e.target.files)||void 0===t?void 0:t[0];o&&l(o)},className:"hidden"}),(0,o.jsx)(d.z,{className:"w-full",isLoading:t,onClick:()=>{var e;null===(e=r.current)||void 0===e||e.click()},leftIcon:(0,o.jsx)(p.Gq2,{}),children:"Upload"})]})}var I=t(6145);function A(e){let l=(0,I.ZP)(e);if(!l)throw Error("invalid css color: ".concat(e));let{r:t,g:o,b:r,opacity:n}=l.rgb(),a=(0,I.B8)((t-255)*n+255,(o-255)*n+255,(r-255)*n+255);return a.formatHex()}let _=["fill","stroke","stopColor"];function q(e,l){for(let a of e.querySelectorAll("*")){var t,o,r,n;if(a instanceof SVGStyleElement){let e=[...null!==(o=null===(t=a.sheet)||void 0===t?void 0:t.cssRules)&&void 0!==o?o:[]];for(let t of e)if(t instanceof CSSStyleRule)for(let e of _)try{let o=A(t.style[e]);t.style[e]=null!==(r=l.get(o))&&void 0!==r?r:""}catch(e){}a.textContent=e.map(e=>e.cssText).join("\n")}else if(a instanceof SVGElement)for(let e of _)try{let t=A(a.style[e]);a.style[e]=null!==(n=l.get(t))&&void 0!==n?n:""}catch(e){}}}var U=t(2213),B=t(8255);function L(e){return[void 0,void 0,void 0].map((l,t)=>1-parseInt(e.slice(2*t+1,2*t+3),16)/255)}function T(e,l){let t=0;for(let[o,r]of e.entries())t+=r*l[o];return t}function F(){let[e,l]=(0,a.useState)(!1),[t,i]=(0,a.useState)(!1),d=(0,a.useCallback)(()=>i(!t),[t,i]),u=(0,r.p)(),[f,h]=(0,a.useState)(),[p,x]=(0,a.useState)(),[m,g]=(0,a.useReducer)((e,l)=>{if("set"===l.action)return new Map(l.colors.map(e=>{let[l,t]=e;return[l,[t,!1]]}));if("add"===l.action){let t=new Map(e);return t.set(l.color,[l.name,!1]),t}{let t=new Map(e),[o,r]=t.get(l.color);return t.set(l.color,[o,!r]),t}},new Map),[j,b]=(0,a.useState)("#ffffff"),[[v,w],C]=(0,a.useState)([void 0,new Map]),[y,S]=(0,a.useReducer)(e=>!e,!1),[N,P]=(0,a.useReducer)(e=>!e,!0),[z,D]=(0,a.useState)(0);(0,a.useEffect)(()=>{if(p&&[...m.values()].some(e=>{let[,l]=e;return l})){let e=[];for(let[l,[,t]]of m)t&&e.push(l);let l=new Map,t=new Map;for(let o of p.colors){let{opacities:r,color:n}=function(e,l){let{quadratic:t=!0,paper:o="#ffffff",increments:r=0,factorPaper:n=!0}=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},a=L(e),s=L(o);n&&(a=a.map((e,l)=>Math.max(e-s[l],0)));let i=l.map(L),{error:c,opacities:d}=t?function(e,l,t){let o=l.map(e=>1e-4*e.reduce((e,l)=>e+(1-l)/3,0)),r=[,...l.map((e,t)=>[,...l.map((l,r)=>T(e,l)+(t===r?o[t]:0))])],n=[,...l.map(l=>T(l,e))],a=[,...l.map((e,t)=>[,...l.map((e,l)=>t===l?1:0),...l.map((e,l)=>t===l?-1:0)])],s=[,...l.map(()=>0),...l.map(()=>-1)],{solution:[,...i],value:[,c],message:d,...u}=(0,B.solveQP)(r,n,a,s),f=T(e,e),h=i.reduce((e,l)=>e+1e-4*l*l,0);if(!d)return{error:Math.sqrt(Math.max(2*c+f-h,0))/3,opacities:i.map(e=>{let l=Math.min(Math.max(0,e),1);return t>0?Math.round(l*t)/t:l})};throw Error(d)}(a,i,r):function(e,l,t){let o=Math.max(t,1),r=l.map(e=>1e-4*e.reduce((e,l)=>e+(1-l)/3,0)),n={},a={},s={};for(let[e,l]of r.entries())a["mix ".concat(e)]={error:l};for(let[t,r]of e.entries()){let e="up ".concat(t);n[e]={max:r};let s="dn ".concat(t);n[s]={min:r};let i="slack ".concat(t);for(let[r,n]of(a[i]={error:1,[e]:-1,[s]:1},l.entries())){let l=n[t],i="mix ".concat(r);a[i][e]=l/o,a[i][s]=l/o}}if(t>0)for(let[e,l]of r.entries())s["mix ".concat(e)]=1;let{result:i,feasible:c,bounded:d,...u}=U.Solve.call({},{optimize:"error",opType:"min",constraints:n,variables:a,ints:s});if(c&&d){var f;let e=l.map((e,l)=>(null!==(f=u["mix ".concat(l)])&&void 0!==f?f:0)/o),t=e.reduce((e,l,t)=>e+r[t]*l,0);return{error:(i-t)/3,opacities:e}}throw Error("couldn't find bounded feasible solution")}(a,i,r),u=[...s];for(let[e,l]of i.entries()){let t=d[e];for(let[e,o]of l.entries())u[e]+=o*t}return{error:c,opacities:d,color:function(e){let[l,t,o]=e.map(e=>255*e);return(0,I.B8)(l,t,o).formatHex()}(u.map(e=>Math.min(e,1)).map(e=>1-e))}}(o,e,{quadratic:y,paper:j,increments:z,factorPaper:N});l.set(o,r),t.set(o,n)}let o=p.doc.cloneNode(!0);q(o,t);let r=new XMLSerializer,n=r.serializeToString(o);C(["data:image/svg+xml,".concat(encodeURIComponent(n)),l])}else C([void 0,new Map])},[m,y,z,p,C,j,N]);let E=(0,a.useCallback)(()=>{if(p&&w.size&&f){let e=f.slice(0,f.lastIndexOf("."))||f,l=new XMLSerializer,t=0;for(let[o,[r,a]]of m)if(a){let o=new Map;for(let e of p.colors){let l=w.get(e)[t],r=Math.round(255*(1-l)).toString(16),n="#".concat(r).concat(r).concat(r);o.set(e,n)}let a=p.doc.cloneNode(!0);q(a,o);let s=l.serializeToString(a),i=new Blob([s],{type:"image/svg+xml"});(0,n.saveAs)(i,"".concat(e,"_").concat(r.replace(" ","_"),".svg")),t++}}},[p,w,m,f]),F=(0,a.useCallback)(async e=>{h(e.name),x(null),i(!1);try{let l=await e.text(),t=new DOMParser,o=t.parseFromString(l,"image/svg+xml"),r=[...function(e){let l=new Set;for(let r of e.querySelectorAll("*"))if(r instanceof SVGStyleElement){var t,o;for(let e of null!==(o=null===(t=r.sheet)||void 0===t?void 0:t.cssRules)&&void 0!==o?o:[])if(e instanceof CSSStyleRule)for(let t of _)try{l.add(A(e.style[t]))}catch(e){}}else if(r instanceof SVGElement)for(let e of _)try{l.add(A(r.style[e]))}catch(e){}return l}(o)];x({raw:"data:image/svg+xml,".concat(encodeURIComponent(l)),doc:o,colors:r})}catch(e){console.error(e),u({title:"Problem loading SVG",status:"error",position:"bottom-left"}),x(void 0)}},[x,h,i,u]),O=p&&!t?(0,o.jsx)(k,{colors:m,modifyColors:g,paperColor:j,setPaperColor:b,quadratic:y,toggleQuad:S,usePaper:N,togglePaper:P,increments:z,setIncrements:D,download:E,showRaw:e,setShowRaw:l}):(0,o.jsx)(R,{closeable:!!p}),H=e?null==p?void 0:p.raw:null!=v?v:null==p?void 0:p.raw,Q=H?(0,o.jsx)("img",{src:H,alt:"rendered separation",className:"h-full w-full object-contain"}):null,X=(0,a.useCallback)((e,l)=>{let[t]=e;t&&F(t),l.length&&u({title:"Dropped file was not an SVG",status:"error",position:"bottom-left"})},[F,u]),{getRootProps:J,getInputProps:W,isDragActive:Y}=(0,s.uI)({onDrop:X,accept:{"image/svg+xml":[]},multiple:!1,noClick:!0});return(0,o.jsx)(G,{children:(0,o.jsxs)("div",{...J({className:"h-screen w-screen flex flex-row"}),children:[(0,o.jsx)("input",{...W()}),(0,o.jsx)(c,{show:Y}),(0,o.jsxs)("div",{className:"w-72 h-full p-2 overflow-y-auto flex flex-col flex-shrink-0 justify-between",children:[(0,o.jsxs)("div",{className:"space-y-2 flex-grow flex flex-col",children:[(0,o.jsx)("h1",{className:"font-bold text-xl text-center",children:"Spot Color Separator"}),(0,o.jsx)(V,{onFile:F,loading:null===p}),O]}),(0,o.jsx)(M,{helpDisabled:!p,toggleHelp:d})]}),(0,o.jsx)("div",{className:"h-full w-full overflow-auto",style:{backgroundColor:j},children:Q})]})})}},7313:function(){}},function(e){e.O(0,[227,513,515,626,744],function(){return e(e.s=507)}),_N_E=e.O()}]);