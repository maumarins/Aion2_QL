import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CheckCircle2, Clock3, Download, ExternalLink, Feather, Flame, History, ListChecks, Map, Maximize2, Minimize2, Palette, Plus, Save, Settings2, Swords, TentTree, TimerReset, Upload, Volume2 } from "lucide-react";

type Tab = "hoje" | "mapa" | "historico" | "config";
type Task = { id: string; label: string; category: "Diária" | "Semanal"; done: boolean };
type EventItem = { id: string; name: string; time: string; enabled: boolean; alertMinutes: number };
type Log = { id: string; at: string; title: string; kind: string };
type Counter = { done: number; total: number };
type Region = { feathers: Counter; dungeons: Counter; camps: Counter };
type Profile = { nick: string; greeting: string; accent: string; alertVolume: number; note: string; tasks: Task[]; events: EventItem[]; history: Log[]; regions: Record<string, Region> };

const regionNames = ["Vertron", "Poeta", "Eltnen", "Ishalgen", "Altgard", "Morheim", "Reshanta A", "Reshanta B"];
const baseTasks: Task[] = [
  { id: "dungeon", label: "Dungeon diária", category: "Diária", done: false },
  { id: "shugo", label: "Shugo", category: "Diária", done: false },
  { id: "boss", label: "2× World Boss", category: "Diária", done: false },
  { id: "festival", label: "Festival / evento diário", category: "Diária", done: false },
  { id: "guild", label: "Contribuição da guilda", category: "Semanal", done: false },
  { id: "city", label: "Missões semanais da cidade", category: "Semanal", done: false }
];
const baseEvents: EventItem[] = [
  { id: "wb16", name: "World Boss", time: "16:00", enabled: true, alertMinutes: 10 },
  { id: "shugo18", name: "Shugo", time: "18:00", enabled: true, alertMinutes: 10 },
  { id: "guild2030", name: "Guild Event", time: "20:30", enabled: true, alertMinutes: 15 },
  { id: "wb22", name: "World Boss", time: "22:00", enabled: true, alertMinutes: 10 }
];
const blankRegions = () => Object.fromEntries(regionNames.map(name => [name, { feathers:{done:0,total:0}, dungeons:{done:0,total:0}, camps:{done:0,total:0} }]));
const makeProfile = (nick: string): Profile => ({ nick, greeting: "Boa noite", accent: "#a92f51", alertVolume: .65, note: "Comprar poções e conferir o leilão antes da dungeon.", tasks: baseTasks, events: baseEvents, history: [], regions: blankRegions() });
const key = (nick: string) => `questlogg-desktop:${nick.trim().toLowerCase()}`;
const load = (nick: string): Profile => { try { return { ...makeProfile(nick), ...JSON.parse(localStorage.getItem(key(nick)) || "{}") }; } catch { return makeProfile(nick); } };
const isTauri = () => "__TAURI_INTERNALS__" in window;
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const formatRemaining = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; };
const nextOccurrence = (time: string, now = new Date()) => { const [h,m] = time.split(":").map(Number); const d = new Date(now); d.setHours(h,m,0,0); if (d <= now) d.setDate(d.getDate()+1); return d; };

export default function App() {
  const [tab, setTab] = useState<Tab>("hoje");
  const [profile, setProfile] = useState<Profile>(() => load(localStorage.getItem("questlogg-active-nick") || "Vykas"));
  const [nickDraft, setNickDraft] = useState(profile.nick);
  const [now, setNow] = useState(new Date());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => localStorage.getItem("questlogg-onboarded") !== "yes");
  const [welcomeNick, setWelcomeNick] = useState(profile.nick === "Vykas" ? "" : profile.nick);
  const [welcomeAccent, setWelcomeAccent] = useState(profile.accent);
  const [welcomeVolume, setWelcomeVolume] = useState(profile.alertVolume);
  const [alertStatus, setAlertStatus] = useState("");
  const notified = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { localStorage.setItem(key(profile.nick), JSON.stringify(profile)); localStorage.setItem("questlogg-active-nick", profile.nick); document.documentElement.style.setProperty("--user-accent", profile.accent); }, [profile]);
  useEffect(() => {
    profile.events.filter(e => e.enabled).forEach(event => {
      const target = nextOccurrence(event.time, now); const diff = target.getTime() - now.getTime();
      const alertAt = event.alertMinutes * 60 * 1000; const noticeKey = `${event.id}-${target.toDateString()}`;
      if (diff <= alertAt && diff > alertAt - 1500 && !notified.current.has(noticeKey)) { notified.current.add(noticeKey); void triggerAlert(`${event.name} em ${event.alertMinutes} minutos`, `Horário previsto: ${event.time}`, profile.alertVolume); }
    });
  }, [now, profile.events, profile.alertVolume]);

  const totals = useMemo(() => Object.values(profile.regions).reduce((a,r) => ({ feathers:{done:a.feathers.done+r.feathers.done,total:a.feathers.total+r.feathers.total}, dungeons:{done:a.dungeons.done+r.dungeons.done,total:a.dungeons.total+r.dungeons.total}, camps:{done:a.camps.done+r.camps.done,total:a.camps.total+r.camps.total} }), {feathers:{done:0,total:0},dungeons:{done:0,total:0},camps:{done:0,total:0}}), [profile.regions]);
  const daily = profile.tasks.filter(t => t.category === "Diária");
  const toggleTask = (id: string) => setProfile(p => { const t = p.tasks.find(x => x.id === id)!; const done = !t.done; return { ...p, tasks:p.tasks.map(x => x.id === id ? {...x,done}:x), history:done ? [{id:uid(),at:new Date().toISOString(),title:t.label,kind:t.category},...p.history].slice(0,100):p.history }; });
  const changeCounter = (region:string,type:keyof Region,field:keyof Counter,value:number) => setProfile(p => ({...p,regions:{...p.regions,[region]:{...p.regions[region],[type]:{...p.regions[region][type],[field]:Math.max(0,value||0)}}}}));
  const switchProfile = () => { const nick=nickDraft.trim(); if(nick) setProfile(load(nick)); };
  const saveBackup = () => { const blob=new Blob([JSON.stringify(profile,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=`questlogg-${profile.nick}.json`;a.click();URL.revokeObjectURL(url); };
  const importBackup = async (file?:File) => { if(!file)return; try { const data=JSON.parse(await file.text()) as Profile; if(!data.nick||!Array.isArray(data.tasks)) throw new Error(); setProfile(data);setNickDraft(data.nick); } catch { alert("Este arquivo não é um backup válido do QuestLogg."); } };
  const testAlert = async (volume = profile.alertVolume) => { playAlert(volume); const sent=await notify("Lembrete do QuestLogg",profile.note); setAlertStatus(sent?"Som reproduzido e notificação enviada.":"Som reproduzido. Ative as notificações do Windows para ver o aviso."); window.setTimeout(()=>setAlertStatus(""),5000); };
  const finishWelcome = () => { const nick=welcomeNick.trim()||"Vykas"; const next={...load(nick),nick,accent:welcomeAccent,alertVolume:welcomeVolume}; setProfile(next);setNickDraft(nick);localStorage.setItem("questlogg-onboarded","yes");setShowWelcome(false); };

  return <main>
    <div className="crimson-aura" />
    {showWelcome&&<div className="onboarding-backdrop"><section className="onboarding"><span className="brand-mark"><Flame size={17}/></span><p className="eyebrow">PRIMEIRO ACESSO</p><h1>Faça o QuestLogg ser seu.</h1><p>Estas preferências ficam salvas apenas neste computador e podem ser alteradas depois.</p><label>Seu nome ou nick<input autoFocus placeholder="Ex.: Mauricio" value={welcomeNick} onChange={e=>setWelcomeNick(e.target.value)}/></label><div className="welcome-options"><label>Cor do tema<input type="color" value={welcomeAccent} onChange={e=>{setWelcomeAccent(e.target.value);document.documentElement.style.setProperty("--user-accent",e.target.value)}}/></label><label>Volume dos alertas <b>{Math.round(welcomeVolume*100)}%</b><input type="range" min="0" max="1" step="0.05" value={welcomeVolume} onChange={e=>setWelcomeVolume(Number(e.target.value))}/></label></div><div className="onboarding-actions"><button className="secondary" onClick={()=>playAlert(welcomeVolume)}><Volume2/>Ouvir teste</button><button onClick={finishWelcome}>Começar <Flame/></button></div></section></div>}
    <header className="topbar">
      <button className="brand" onClick={()=>setTab("hoje")}><span className="brand-mark"><Flame size={17}/></span><span><b>QUEST</b>LOGG</span></button>
      <nav>{([ ["hoje",<ListChecks/>,"Hoje"], ["mapa",<Map/>,"Mapa"], ["historico",<History/>,"Histórico"], ["config",<Settings2/>,"Ajustes"] ] as [Tab,React.ReactElement,string][]).map(([id,icon,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{icon}<span>{label}</span></button>)}</nav>
      <div className="window-actions"><button title="Modo compacto" onClick={compactWindow}><Minimize2/></button><button title="Tela cheia" onClick={toggleFullscreen}><Maximize2/></button><span>{profile.nick}</span></div>
    </header>

    {tab==="hoje" && <section className="page-shell">
      <div className="welcome"><div><p className="eyebrow">{now.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"short"}).toUpperCase()}</p><h1>{profile.greeting}, <em>{profile.nick}.</em></h1><p>Sua rotina de Atreia está pronta.</p></div><span className="server-pill">● AION 2 GLOBAL <b>AMERICAS</b></span></div>
      <div className="summary-grid"><Summary icon={<Feather/>} label="Penas" c={totals.feathers}/><Summary icon={<Swords/>} label="Dungeons" c={totals.dungeons}/><Summary icon={<TentTree/>} label="Acampamentos" c={totals.camps}/></div>
      <div className="dashboard-grid">
        <article className="panel"><Heading eyebrow="PRÓXIMAS HORAS" title="Eventos de hoje" icon={<Clock3/>}/><div className="events">{profile.events.filter(e=>e.enabled).sort((a,b)=>nextOccurrence(a.time,now).getTime()-nextOccurrence(b.time,now).getTime()).map((e,i)=>{const left=nextOccurrence(e.time,now).getTime()-now.getTime();return <div className={i===0?"event next":"event"} key={e.id}><time>{e.time}</time><i/><strong>{e.name}{i===0&&<small>PRÓXIMO</small>}</strong><code>{formatRemaining(left)}</code></div>})}</div></article>
        <article className="panel"><Heading eyebrow="CHECKLIST" title="Seus objetivos" icon={<CheckCircle2/>}/><div className="tasks">{daily.map(t=><label className={t.done?"done":""} key={t.id}><input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)}/><span>{t.label}</span></label>)}</div><p className="progress-copy">{daily.filter(t=>t.done).length}/{daily.length} objetivos concluídos hoje</p></article>
        <article className="panel note"><Heading eyebrow="LEMBRETE" title="Quando eu entrar" icon={<BellRing/>}/><textarea value={profile.note} onChange={e=>setProfile(p=>({...p,note:e.target.value}))}/><button onClick={()=>void testAlert()}><Volume2/>Testar alerta</button>{alertStatus&&<p className="alert-status">{alertStatus}</p>}</article>
      </div>
    </section>}

    {tab==="mapa" && <section className="map-page"><div className="section-title"><div><p className="eyebrow">EXPLORAÇÃO • {profile.nick}</p><h1>Mapa de Atreia</h1><p>Marque penas, dungeons e acampamentos por região.</p></div><button onClick={openMap}>Abrir mapa separado <ExternalLink/></button></div><div className="region-grid">{regionNames.map(name=><RegionCard key={name} name={name} value={profile.regions[name]} change={changeCounter}/>)}</div><div className="map-frame">{!mapLoaded&&<div className="map-loading"><Map/><b>Carregando QuestLog.gg…</b><small>Se o provedor impedir a incorporação, use “Abrir mapa separado”.</small></div>}<iframe title="Mapa AION 2 — QuestLog.gg" src="https://questlog.gg/aion-2/en/map" onLoad={()=>setMapLoaded(true)}/></div><p className="credit">Mapa e dados externos: QuestLog.gg. Seu progresso permanece salvo localmente.</p></section>}

    {tab==="historico" && <section className="page-shell"><div className="section-title"><div><p className="eyebrow">ATIVIDADES CONCLUÍDAS</p><h1>Histórico de {profile.nick}</h1></div></div><div className="history-grid">{profile.history.length?profile.history.map(x=><article className="history-card" key={x.id}><time>{new Date(x.at).toLocaleString("pt-BR")}</time><History/><h3>{x.title}</h3><b>{x.kind}</b></article>):<div className="empty">Marque uma tarefa como concluída para iniciar o histórico.</div>}</div></section>}

    {tab==="config" && <section className="settings-page"><div className="section-title"><div><p className="eyebrow">PERSONALIZAÇÃO</p><h1>Perfil e alarmes</h1></div></div><div className="settings-grid">
      <article className="panel form"><Heading eyebrow="PERFIL LOCAL" title="Jogador" icon={<Palette/>}/><label>Nick<div className="inline"><input value={nickDraft} onChange={e=>setNickDraft(e.target.value)}/><button onClick={switchProfile}><Save/>Abrir perfil</button></div></label><label>Saudação<input value={profile.greeting} onChange={e=>setProfile(p=>({...p,greeting:e.target.value}))}/></label><label>Gradiente<input type="color" value={profile.accent} onChange={e=>setProfile(p=>({...p,accent:e.target.value}))}/></label><label>Volume dos alertas <b>{Math.round(profile.alertVolume*100)}%</b><input type="range" min="0" max="1" step="0.05" value={profile.alertVolume} onChange={e=>setProfile(p=>({...p,alertVolume:Number(e.target.value)}))}/></label><button onClick={()=>void testAlert()}><Volume2/>Testar som e notificação</button>{alertStatus&&<p className="alert-status">{alertStatus}</p>}<div className="inline"><button onClick={saveBackup}><Download/>Exportar backup</button><button onClick={()=>fileInput.current?.click()}><Upload/>Importar</button><input hidden ref={fileInput} type="file" accept="application/json" onChange={e=>importBackup(e.target.files?.[0])}/></div></article>
      <article className="panel form"><Heading eyebrow="HORÁRIOS EDITÁVEIS" title="Eventos e alertas" icon={<TimerReset/>}/>{profile.events.map(e=><div className="event-editor" key={e.id}><input type="checkbox" checked={e.enabled} onChange={x=>setProfile(p=>({...p,events:p.events.map(v=>v.id===e.id?{...v,enabled:x.target.checked}:v)}))}/><input value={e.name} onChange={x=>setProfile(p=>({...p,events:p.events.map(v=>v.id===e.id?{...v,name:x.target.value}:v)}))}/><input type="time" value={e.time} onChange={x=>setProfile(p=>({...p,events:p.events.map(v=>v.id===e.id?{...v,time:x.target.value}:v)}))}/><select value={e.alertMinutes} onChange={x=>setProfile(p=>({...p,events:p.events.map(v=>v.id===e.id?{...v,alertMinutes:Number(x.target.value)}:v)}))}>{[5,10,15,30].map(n=><option key={n} value={n}>{n} min</option>)}</select></div>)}<button onClick={()=>setProfile(p=>({...p,events:[...p.events,{id:uid(),name:"Novo evento",time:"20:00",enabled:true,alertMinutes:10}]}))}><Plus/>Adicionar evento</button><p className="hint">Horários provisórios e totalmente editáveis para ajustarmos aos servidores SA.</p></article>
    </div></section>}
  </main>;
}

function playAlert(volume:number){ if(volume<=0)return; try { const ctx=new AudioContext(); const gain=ctx.createGain(); gain.connect(ctx.destination); const start=ctx.currentTime; gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.22),start+.02); gain.gain.exponentialRampToValueAtTime(.0001,start+.75); [659.25,783.99].forEach((frequency,index)=>{const oscillator=ctx.createOscillator();oscillator.type="sine";oscillator.frequency.value=frequency;oscillator.connect(gain);oscillator.start(start+index*.16);oscillator.stop(start+.72);});window.setTimeout(()=>void ctx.close(),1000); } catch { /* audio is optional */ } }
async function notify(title:string,body:string){ try { if(isTauri()){ const api=await import("@tauri-apps/plugin-notification"); let ok=await api.isPermissionGranted(); if(!ok) ok=(await api.requestPermission())==="granted"; if(ok){api.sendNotification({title,body});return true;} } else if("Notification" in window){ if(Notification.permission==="default") await Notification.requestPermission(); if(Notification.permission==="granted"){new Notification(title,{body});return true;} } } catch { /* notification is optional */ } return false; }
async function triggerAlert(title:string,body:string,volume:number){playAlert(volume);await notify(title,body);}
async function toggleFullscreen(){ if(!isTauri()) return document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen(); const {getCurrentWindow}=await import("@tauri-apps/api/window"); const w=getCurrentWindow(); await w.setFullscreen(!(await w.isFullscreen())); }
async function compactWindow(){ if(!isTauri())return; const {getCurrentWindow,LogicalSize}=await import("@tauri-apps/api/window"); const w=getCurrentWindow();await w.setFullscreen(false);await w.setSize(new LogicalSize(780,720));await w.center(); }
async function openMap(){ if(isTauri()){ const {openUrl}=await import("@tauri-apps/plugin-opener");await openUrl("https://questlog.gg/aion-2/en/map"); } else window.open("https://questlog.gg/aion-2/en/map","_blank"); }
function Heading({eyebrow,title,icon}:{eyebrow:string,title:string,icon:React.ReactNode}){return <div className="panel-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{icon}</div>}
function Summary({icon,label,c}:{icon:React.ReactNode,label:string,c:Counter}){return <article className="summary-card"><span>{icon}</span><div><small>{label}</small><strong>{c.done}/{c.total||"—"}</strong></div></article>}
function RegionCard({name,value,change}:{name:string,value:Region,change:(r:string,t:keyof Region,f:keyof Counter,v:number)=>void}){const rows:[keyof Region,string,React.ReactNode][]=[["feathers","Penas",<Feather/>],["dungeons","Dungeons",<Swords/>],["camps","Acampamentos",<TentTree/>]];return <article className="region-card"><header><b>{name}</b><small>{rows.some(([t])=>!value[t].total||value[t].done<value[t].total)?"EM ABERTO":"COMPLETO"}</small></header>{rows.map(([t,label,icon])=><div className="counter" key={t}><span>{icon}{label}</span><button onClick={()=>change(name,t,"done",Math.min(value[t].total||999,value[t].done+1))}>+1</button><input type="number" min="0" value={value[t].done} onChange={e=>change(name,t,"done",Number(e.target.value))}/><i>/</i><input type="number" min="0" placeholder="total" value={value[t].total||""} onChange={e=>change(name,t,"total",Number(e.target.value))}/></div>)}</article>}
