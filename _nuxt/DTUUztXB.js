import{_ as U,r as p,J as L,K as R,o as V,v as b,x as a,y as v,L as O,M as T,N as i,t as _,O as M}from"./maorzbmM.js";import{U as z}from"./BIbqvuFE.js";import{P as H}from"./C4YHeYHv.js";import{P as J}from"./ClhTlj9r.js";import{S as K}from"./DvOOLRGX.js";import{r as c}from"./CB_jOHdl.js";import"./DqVirlQw.js";const j={class:"voter-dashboard"},q={class:"title-container"},G={class:"polls-container"},Q=["onClick"],W={class:"poll-title"},X={class:"poll-info"},Y={__name:"index",setup(Z){const P=z.abi,x="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",E=H.abi,A="0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",y=K.abi,D="0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",u=J.abi,f=p({name:"",age:"",isActive:!1}),N=p([]),C=p(!1),{address:m,isConnected:F}=L(),B=R(),$=()=>{c(i,{address:x,abi:P,functionName:"users",args:[m.value]}).then(e=>{Array.isArray(e)?(f.value.name=e[0]||"Unknown",f.value.age=e[1]||"N/A",f.value.isActive=e[3]||!1):console.warn("Unexpected format for voter data:",e)}).catch(e=>{console.error("Error fetching voter data:",e)})},k=e=>{c(i,{address:A,abi:E,functionName:"getPollCount"}).then(s=>{const t=Number(s),n=[];let o=0;t===0&&e([]);for(let r=0;r<t;r++)c(i,{address:A,abi:E,functionName:"allPolls",args:[r]}).then(l=>{n.push(l),o++,o===t&&e(n)}).catch(l=>{console.error(`Error fetching poll address for index ${r}:`,l),o++,o===t&&e(n)})}).catch(s=>{console.error("Error fetching poll count:",s),e([])})},w=(e,s)=>{const t={};c(i,{address:e,abi:u,functionName:"pollTitle"}).then(o=>(t.title=o||"Unknown",c(i,{address:e,abi:u,functionName:"endDate"}))).then(o=>(t.endDate=o?new Date(Number(o)*1e3).toLocaleString():"N/A",c(i,{address:e,abi:u,functionName:"getTotalOptions"}))).then(o=>{const r=Number(o)||0;let l=0,d=0;if(r===0)return t.voterCount=0,n();for(let h=0;h<r;h++)c(i,{address:e,abi:u,functionName:"votingOptions",args:[h]}).then(g=>{l+=Number(g.voteCount||0),d++,d===r&&(t.voterCount=l,n())}).catch(g=>{console.error(`Error fetching vote count for option ${h}:`,g),d++,d===r&&(t.voterCount=l,n())})}).catch(o=>{console.error(`Error fetching poll details for ${e}:`,o),s(null)});function n(){c(i,{address:D,abi:y,functionName:"checkEligibility",args:[e,m.value]}).then(o=>{t.isEligible=o||!1,t.address=e,s(t)}).catch(o=>{console.error(`Error checking eligibility for ${e}:`,o),s(null)})}},I=()=>{C.value=!0,k(e=>{const s=[];let t=0;e.forEach(n=>{w(n,o=>{o&&s.push(o),t+=1,t===e.length&&(N.value=s,C.value=!1)})})})};V(()=>{m.value&&F.value&&($(),I())});const S=e=>{B.push(`/polls/${e}/vote`)};return(e,s)=>(_(),b("div",j,[a("div",q,[a("h1",null,"Hello "+v(f.value.name||"Loading..."),1),s[0]||(s[0]=a("p",null,"Subscribe to a Poll and Vote!",-1))]),a("div",G,[(_(!0),b(O,null,T(N.value,(t,n)=>(_(),b("div",{key:n,class:M(["poll-row",{eligible:t.isEligible}]),onClick:o=>S(t.address)},[a("div",W,v(t.title),1),a("div",X,[a("div",null,"Voters: "+v(t.voterCount),1),a("div",null,"Final Date: "+v(t.endDate),1)])],10,Q))),128))])]))}},ie=U(Y,[["__scopeId","data-v-4656bab5"]]);export{ie as default};