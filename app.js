const CSV_URL = './data.csv';
const VALID_USER = 'digicides', VALID_PASS = 'coro@cpc';
const overlay = document.getElementById('loginOverlay');
const LS_KEY = 'cpc_login_ok';

// ===== Login / Logout =====
if(localStorage.getItem(LS_KEY)==='1') overlay.style.display='none';
document.getElementById('loginForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(u.value===VALID_USER && p.value===VALID_PASS){
    localStorage.setItem(LS_KEY,'1'); overlay.style.display='none';
  } else err.textContent='Invalid credentials';
});
document.getElementById('logoutBtn').addEventListener('click',()=>{
  localStorage.removeItem(LS_KEY); location.reload();
});

// ===== CSV + Charts =====
let RAW=[], FILTERS={state:'',district:'',retailer:'',product:'',qtyMin:0,status:'',dateFrom:'',dateTo:''};
const charts={};

function parseProducts(s){const map=new Map();if(!s)return map;s.split(',').forEach(raw=>{const m=raw.match(/^(.+?)\\s*-\\s*qty\\s*(\\d+)/i);if(m){map.set(m[1].trim(),(map.get(m[1].trim())||0)+Number(m[2]))}});return map;}
function toDateKey(dt){if(!dt)return'';const d=new Date(dt);if(isNaN(d))return'';return d.toISOString().slice(0,10);}
function palette(n){const base=['#3b82f6','#f59e0b','#10b981','#a78bfa','#f472b6','#fbbf24','#60a5fa','#34d399','#f87171'];return Array.from({length:n},(_,i)=>base[i%base.length]);}

function makeChart(id,type,data,opts){const ctx=document.getElementById(id).getContext('2d');if(charts[id]){charts[id].data=data;charts[id].options=opts;charts[id].update();}else{charts[id]=new Chart(ctx,{type,data,options:opts});}}

function applyFilters(rows){
  return rows.filter(r=>{
    if(FILTERS.state && r.State!==FILTERS.state) return false;
    if(FILTERS.district && r.District!==FILTERS.district) return false;
    if(FILTERS.retailer && r['Retailer Name']!==FILTERS.retailer) return false;
    if(FILTERS.status && r['Submission Status']!==FILTERS.status) return false;
    if(FILTERS.dateFrom && new Date(r['Scan Date'])<new Date(FILTERS.dateFrom)) return false;
    if(FILTERS.dateTo && new Date(r['Scan Date'])>new Date(FILTERS.dateTo)) return false;
    if(FILTERS.product || FILTERS.qtyMin>0){
      const m=parseProducts(r['Cart Items']);
      if(FILTERS.product){if(!m.has(FILTERS.product)||m.get(FILTERS.product)<FILTERS.qtyMin)return false;}
      else {let ok=false;for(const v of m.values()){if(v>=FILTERS.qtyMin)ok=true;}if(!ok)return false;}
    }
    return true;
  });
}

function updateKpis(rows){
  const total=rows.length;
  const yes=rows.filter(r=>/^yes$/i.test(r['Submission Status'])).length;
  const pending=rows.filter(r=>/^pending$/i.test(r['Submission Status'])).length;
  const no=rows.filter(r=>/^no$/i.test(r['Submission Status'])).length;
  document.getElementById('kpi-total').textContent=`Scans: ${total}`;
  document.getElementById('kpi-yes').textContent=`Approved: ${yes}`;
  document.getElementById('kpi-pending').textContent=`Pending: ${pending}`;
  document.getElementById('kpiTotalBig').textContent=total;
  document.getElementById('kpiMeta').textContent=`${yes} Yes • ${no} No • ${pending} Pending`;
}

function buildCounts(rows,key){const m=new Map();for(const r of rows){const k=r[key];if(k)m.set(k,(m.get(k)||0)+1);}return [...m.entries()].sort((a,b)=>b[1]-a[1]);}

function renderCharts(rows){
  // Status
  const sYes=rows.filter(r=>/^yes$/i.test(r['Submission Status'])).length;
  const sNo=rows.filter(r=>/^no$/i.test(r['Submission Status'])).length;
  const sPending=rows.filter(r=>/^pending$/i.test(r['Submission Status'])).length;
  makeChart('statusChart','doughnut',{labels:['Yes','No','Pending'],datasets:[{data:[sYes,sNo,sPending],backgroundColor:palette(3)}]},{plugins:{legend:{labels:{color:'#64748b'}}},cutout:'65%'});

  // Trend
  const trendMap=new Map();for(const r of rows){const k=toDateKey(r['Scan Date']);if(k)trendMap.set(k,(trendMap.get(k)||0)+1);}
  const trend=[...trendMap.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  makeChart('trendChart','line',{labels:trend.map(x=>x[0]),datasets:[{data:trend.map(x=>x[1]),borderWidth:2,tension:.3,borderColor:'#3b82f6'}]},{plugins:{legend:{display:false}}});
