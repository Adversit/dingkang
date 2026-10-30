'use client';

import {useEffect,useRef,useState,type ChangeEvent,type CSSProperties} from 'react';
import {BookOpen,Layers,Heart,Gamepad2,Search,Star,ArrowUpRight,ArrowRight,ChevronLeft,CloudCheck,CloudOff,LoaderCircle,RefreshCw,Upload,Download,File,FileText,Image as ImageIcon,Music2,ShieldCheck,X,Code2,Radar,Microscope,Lightbulb,ChartNoAxesCombined,LampDesk,House,Wind,Sparkles,Swords,Mail,Moon,Flag,Clock3,ExternalLink,Check,AlertCircle,FolderOpen,SlidersHorizontal,Maximize2,Minimize2,LogOut,Grid2X2,Menu} from 'lucide-react';
import {modules,categories,moduleById,type HubModule,type ModuleCategory} from '@/lib/hub/catalog';
import {hubThemes,defaultAppearance,parseAppearance,themeById,themeVariables,moduleArtwork,categoryPresentation,parseThemeId,appearanceForRoute,buildHubUrl,type HubThemeId,type HubAppearance} from '@/lib/hub/theme';
import {GAME_IMPORT_METADATA} from '@/lib/hub/legacy-import';
import {parseBackup,prepareBackupPreview,type BackupPreview} from '@/lib/hub/backup-preview';
import HubStoragePanel,{flushHubModule} from '@/components/HubStoragePanel';
import {findModuleStorage,hubStorageMode,cancelHubModuleLeave} from '@/lib/hub/storage-panel';
import {installNavigationModal} from '@/lib/hub/navigation-focus';
import {moduleNavigationAction} from '@/lib/hub/module-navigation';
import {canFocusHubSearch,installImmersiveViewport} from '@/components/hub-viewport';
import BackupPasteInput from '@/components/BackupPasteInput';
import KineticScene from '@/components/KineticScene';
import KineticBackdrop from '@/components/KineticBackdrop';
import KineticMotion from '@/components/KineticMotion';
import CozyBaseScene from '@/components/CozyBaseScene';

type Session={authenticated:boolean;userId?:string;displayName?:string};
type Stored={values:Record<string,string>;revision:number;updatedAt?:string};
type FileItem={id:string;name:string;size:number;mimeType:string;createdAt:string};
type PreferencePatch={favorites?:string[];recents?:string[];appearance?:HubAppearance};
type Health='checking'|'ready'|'unavailable'|'signed-out';
type CatalogView={section:string;search:string;scrollY:number};
const icons:Record<string,typeof BookOpen>={book:BookOpen,layers:Layers,heart:Heart,game:Gamepad2,radar:Radar,research:Microscope,idea:Lightbulb,evolve:ChartNoAxesCombined,code:Code2,lamp:LampDesk,home:House,wind:Wind,sparkles:Sparkles,swords:Swords,mail:Mail,moon:Moon,flag:Flag};
const parseList=(raw?:string):string[]=>{try{const value:unknown=JSON.parse(raw||'[]');return Array.isArray(value)?[...new Set(value.filter((item):item is string=>typeof item==='string'&&!!moduleById(item)))]:[];}catch{return [];}};
const sizeLabel=(size=0)=>size<1024?size+' B':size<1024*1024?(size/1024).toFixed(1)+' KB':(size/1024/1024).toFixed(1)+' MB';
const friendly=(error:unknown)=>error instanceof Error?error.message:'操作暂时没有完成，请重试。';
const moduleUrl=(module:HubModule|null,style:HubThemeId|null,search='')=>buildHubUrl(module?.id||null,style,search);
async function result<T=Stored>(response:Response):Promise<T>{
  const data=await response.json().catch(()=>({})) as {error?:string|{message?:string};message?:string};
  if(!response.ok)throw Error(response.status===401?'请先登录私人空间。':response.status===409?'另一处更新了这份数据，请重新连接后再试。':typeof data.error==='string'?data.error:data.error?.message||data.message||'操作暂时没有完成，请重试。');
  return data as T;
}
function AppIcon({module,size=23}:{module:HubModule;size?:number}){
  const Icon=icons[module.icon]||Layers;
  return <span className="hub-app-icon"><Icon size={size} strokeWidth={1.65}/></span>;
}

export default function Hub(){
  const [section,setSection]=useState('all'),[search,setSearch]=useState(''),[open,setOpen]=useState<HubModule|null>(null),[sidebarOpen,setSidebarOpen]=useState(false),[mobileNavigation,setMobileNavigation]=useState(false);
  const [cozyDirectoryOpen,setCozyDirectoryOpen]=useState(false),[catalogRequest,setCatalogRequest]=useState(0);
  const [session,setSession]=useState<Session|null>(null),[favorites,setFavorites]=useState<string[]>([]),[recents,setRecents]=useState<string[]>([]);
  const [appearance,setAppearance]=useState<HubAppearance>(defaultAppearance),[reducedMotion,setReducedMotion]=useState(true),[pageVisible,setPageVisible]=useState(true);
  const [saving,setSaving]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState('');
  const [health,setHealth]=useState<Health>('checking'),[healthError,setHealthError]=useState('');
  const [files,setFiles]=useState<FileItem[]>([]),[filesMore,setFilesMore]=useState(false),[fileError,setFileError]=useState(''),[fileLoading,setFileLoading]=useState(false),[uploading,setUploading]=useState(false);
  const [backup,setBackup]=useState<BackupPreview[]|null>(null),[backupWarnings,setBackupWarnings]=useState<string[]>([]),[legacyGame,setLegacyGame]=useState('auto'),[readingBackup,setReadingBackup]=useState(false),[importing,setImporting]=useState(false);
  const [frameLoading,setFrameLoading]=useState(false),[navigating,setNavigating]=useState(false),[fullscreen,setFullscreen]=useState(false),[canFullscreen,setCanFullscreen]=useState(false);
  const [moduleToolsOpen,setModuleToolsOpen]=useState(false);
  const [legacyNovelPage,setLegacyNovelPage]=useState(false);
  const readyRef=useRef(false);readyRef.current=ready;
  const explicitTheme=useRef<HubThemeId|null>(null),routeSearch=useRef('');
  const cozyRoom=useRef<ModuleCategory|null>(null),catalogFocusRequested=useRef(false);
  const catalogViewRef=useRef({section,search});catalogViewRef.current={section,search};
  const catalogReturn=useRef<CatalogView|null>(null),pendingCatalogScroll=useRef<number|null>(null);
  const stored=useRef<Stored>({values:{},revision:0}),sessionRef=useRef<Session|null>(null),preferencesReady=useRef(false);
  const preferenceSaveError=useRef<string|null>(null);
  const queue=useRef(Promise.resolve()),pendingSaves=useRef(0),favRef=useRef<string[]>([]),recentRef=useRef<string[]>([]),appearanceRef=useRef<HubAppearance>(defaultAppearance);
  const openRef=useRef<HubModule|null>(null),navigationLock=useRef(false),acceptedUrl=useRef('/'),initializationId=useRef(0);
  const backupOwner=useRef<string|undefined>(undefined),previewLock=useRef(false),importLock=useRef(false);
  const frameRef=useRef<HTMLIFrameElement>(null),shellRef=useRef<HTMLDivElement>(null),searchRef=useRef<HTMLInputElement>(null);
  const sidebarRef=useRef<HTMLElement>(null),sidebarTriggerRef=useRef<HTMLButtonElement>(null);
  const moduleToolsRef=useRef<HTMLElement>(null),moduleToolsButtonRef=useRef<HTMLButtonElement>(null),moduleBackRef=useRef<HTMLButtonElement>(null);
  const uploadRef=useRef<HTMLInputElement>(null),importRef=useRef<HTMLInputElement>(null),settingsRef=useRef<HTMLDialogElement>(null),backupDialogRef=useRef<HTMLDialogElement>(null);
  const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  function notify(message:string){setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),4200);}
  function assertOwner(owner:string|undefined){if(!owner||owner!==sessionRef.current?.userId||!sessionRef.current?.authenticated)throw Error('账号已变化，请重新连接后再试。');}
  function clearAccountState(){
    stored.current={values:{},revision:0};preferenceSaveError.current=null;favRef.current=[];recentRef.current=[];appearanceRef.current={...defaultAppearance};
    setFavorites([]);setRecents([]);setAppearance(appearanceForRoute(defaultAppearance,explicitTheme.current));setFiles([]);setFilesMore(false);setFileError('');setBackup(null);
  }
  async function loadPreferences(){
    const owner=sessionRef.current?.userId;assertOwner(owner);
    const data=await result<Stored>(await fetch('/api/hub/state/hub-preferences',{cache:'no-store',headers:{'X-Hub-User-Id':owner!}}));assertOwner(owner);
    stored.current=data;const fav=parseList(data.values.favorites),recent=parseList(data.values.recents),look=parseAppearance(data.values.appearance);
    favRef.current=fav;recentRef.current=recent;appearanceRef.current=look;
    setFavorites(fav);setRecents(recent);setAppearance(appearanceForRoute(look,explicitTheme.current));preferencesReady.current=true;preferenceSaveError.current=null;
  }
  async function checkHealth(){
    const owner=sessionRef.current?.userId;setHealth('checking');setHealthError('');
    try{
      assertOwner(owner);const response=await fetch('/api/hub/health',{cache:'no-store',headers:{'X-Hub-User-Id':owner!}});
      const data=await response.json() as {ok?:boolean;database?:string;storage?:string};assertOwner(owner);
      if(!response.ok||!data.ok)throw Error(data.database==='unavailable'?'云端存档暂时无法连接，请稍后重试。':data.storage==='unavailable'?'文件空间暂时无法连接，请稍后重试。':'暂时无法确认保存服务，请重新连接。');
      setHealth('ready');
    }catch(cause){if(owner===sessionRef.current?.userId){setHealth('unavailable');setHealthError(friendly(cause));}}
  }
  async function initialize(){
    const attempt=++initializationId.current;setError('');setReady(false);setHealth('checking');setHealthError('');preferencesReady.current=false;
    await queue.current;
    try{
      const data=await result<Session>(await fetch('/api/hub/session',{cache:'no-store'}));
      if(attempt!==initializationId.current)return;
      if(data.userId!==sessionRef.current?.userId)clearAccountState();
      setSession(data);sessionRef.current=data;
      if(data.authenticated){const checks=await Promise.allSettled([loadPreferences(),checkHealth()]);if(checks[0].status==='rejected')throw checks[0].reason;}
      else{clearAccountState();setHealth('signed-out');}
      if(attempt===initializationId.current)setReady(true);
    }catch(cause){if(attempt===initializationId.current){setError(friendly(cause));setHealth('unavailable');setReady(true);}}
  }
  function persist(patch:PreferencePatch){
    if(!readyRef.current||importLock.current)return;
    if(sessionRef.current?.authenticated&&!preferencesReady.current){notify('尚未读取当前偏好，请重新连接后再试。');return;}
    if(patch.favorites){favRef.current=patch.favorites;setFavorites(patch.favorites);}
    if(patch.recents){recentRef.current=patch.recents;setRecents(patch.recents);}
    if(patch.appearance){appearanceRef.current=patch.appearance;setAppearance(appearanceForRoute(patch.appearance,explicitTheme.current));}
    const owner=sessionRef.current?.userId;
    if(!sessionRef.current?.authenticated){notify('登录后会保存你的收藏、最近使用和外观。');return;}
    pendingSaves.current++;setSaving(true);
    queue.current=queue.current.catch(()=>{}).then(async()=>{
      assertOwner(owner);
      const next={...stored.current.values,favorites:JSON.stringify(favRef.current),recents:JSON.stringify(recentRef.current),appearance:JSON.stringify(appearanceRef.current)};
      const data=await result<Stored>(await fetch('/api/hub/state/hub-preferences',{method:'PUT',headers:{'Content-Type':'application/json','X-Hub-User-Id':owner!},body:JSON.stringify({values:next,expectedRevision:stored.current.revision})}));
      assertOwner(owner);stored.current=data;preferenceSaveError.current=null;
    }).catch(cause=>{if(owner===sessionRef.current?.userId){preferenceSaveError.current=friendly(cause);setError(preferenceSaveError.current);}}).finally(()=>{pendingSaves.current--;if(!pendingSaves.current)setSaving(false);});
  }
  async function navigateTo(target:HubModule|null,nextSection?:string,mode:'push'|'pop'='push',nextTheme:HubThemeId|null=explicitTheme.current||appearanceRef.current.theme,nextSearch=routeSearch.current){
    if(navigationLock.current){if(mode==='pop')history.replaceState({},'',acceptedUrl.current);return false;}
    navigationLock.current=true;setNavigating(true);
    try{
      const previous=openRef.current;
      if(previous&&previous.id!==target?.id)await flushHubModule(frameRef.current?.contentWindow??null,previous.id,window.location.origin);
      if(target&&!previous){catalogReturn.current={...catalogViewRef.current,scrollY:pendingCatalogScroll.current??Math.max(0,window.scrollY)};pendingCatalogScroll.current=null;}
      const returning=!target&&previous&&catalogReturn.current&&(!nextSection||(mode==='pop'&&nextSection===catalogReturn.current.section))?catalogReturn.current:null;
      openRef.current=target;setOpen(target);setFrameLoading(!!target&&target.id!==previous?.id);
      if(previous?.id!==target?.id)setModuleToolsOpen(false);
      if(returning){setSection(returning.section);setSearch(returning.search);pendingCatalogScroll.current=returning.scrollY;}
      else if(nextSection){setSection(nextSection);setSearch('');pendingCatalogScroll.current=null;}
      const url=moduleUrl(target,nextTheme,nextSearch);
      const destinationSection=returning?.section||nextSection||catalogViewRef.current.section;
      if(mode==='push')history.pushState({hubSection:destinationSection},'',url);
      else if(location.pathname+location.search!==url)history.replaceState({hubSection:destinationSection},'',url);
      acceptedUrl.current=url;routeSearch.current=new URL(url,location.origin).search;explicitTheme.current=nextTheme;
      setAppearance(appearanceForRoute(appearanceRef.current,nextTheme));setSidebarOpen(false);
      if(target&&target.id!==previous?.id)persist({recents:[target.id,...recentRef.current.filter(id=>id!==target.id)].slice(0,8)});
      return true;
    }catch(cause){cancelHubModuleLeave(frameRef.current?.contentWindow??null,window.location.origin);if((cause as {name?:string})?.name!=='AbortError'){setError(friendly(cause));if(openRef.current)setModuleToolsOpen(true);}if(mode==='pop')history.replaceState({},'',acceptedUrl.current);return false;}
    finally{navigationLock.current=false;setNavigating(false);}
  }
  async function leaveFor(url:string){
    if(navigationLock.current)return;navigationLock.current=true;setNavigating(true);
    try{const current=openRef.current;if(current)await flushHubModule(frameRef.current?.contentWindow??null,current.id,location.origin);await queue.current;if(preferenceSaveError.current)throw Error('偏好尚未保存，暂时无法离开。'+preferenceSaveError.current);location.assign(url);}
    catch(cause){cancelHubModuleLeave(frameRef.current?.contentWindow??null,window.location.origin);if((cause as {name?:string})?.name!=='AbortError'){setError(friendly(cause));if(openRef.current)setModuleToolsOpen(true);}}
    // Cancelling a browser beforeunload prompt leaves this document alive;
    // location.assign does not reject or throw to tell us it was cancelled.
    finally{navigationLock.current=false;setNavigating(false);}
  }
  function closeModuleTools(){
    // A native export dialog must remain visible until its own close action runs.
    const dialog=moduleToolsRef.current?.querySelector<HTMLDialogElement>('dialog[open]');
    if(dialog){dialog.focus({preventScroll:true});return;}
    setModuleToolsOpen(false);
    if(moduleToolsButtonRef.current)moduleToolsButtonRef.current.focus({preventScroll:true});
    else if(openRef.current?.id==='novel-studio'){
      try{const control=frameRef.current?.contentDocument?.querySelector<HTMLElement>('[data-studio-action="hub"]');if(control){control.focus({preventScroll:true});return;}}catch{}
      frameRef.current?.focus({preventScroll:true});
    }
  }
  function toggleModuleTools(){if(moduleToolsOpen)closeModuleTools();else setModuleToolsOpen(true);}
  function changeTheme(id:HubThemeId){
    if(!readyRef.current||navigationLock.current||importLock.current)return;
    explicitTheme.current=id;
    const url=moduleUrl(openRef.current,id,routeSearch.current);
    history.replaceState({...history.state},'',url);acceptedUrl.current=url;routeSearch.current=new URL(url,location.origin).search;
    setAppearance(appearanceForRoute(appearanceRef.current,id));setSidebarOpen(false);
    persist({appearance:{...appearanceRef.current,theme:id}});
  }
  function rememberCozyRoom(room:ModuleCategory|null){cozyRoom.current=room;}
  function exploreCatalog(){
    if((explicitTheme.current||appearanceRef.current.theme)==='cozy')setCozyDirectoryOpen(true);
    catalogFocusRequested.current=true;setCatalogRequest(current=>current+1);
  }
  function launch(module:HubModule){void navigateTo(module);}
  function selectSection(next:string){void navigateTo(null,next);}
  function toggleFavorite(id:string){persist({favorites:favRef.current.includes(id)?favRef.current.filter(item=>item!==id):[...favRef.current,id]});}

  useEffect(()=>{
    const initialUrl=new URL(location.href),initial=initialUrl.searchParams.get('app'),selected=initial?moduleById(initial)||null:null;
    explicitTheme.current=parseThemeId(initialUrl.searchParams.get('style'));routeSearch.current=initialUrl.search;
    setAppearance(appearanceForRoute(appearanceRef.current,explicitTheme.current));
    openRef.current=selected;setOpen(selected);setFrameLoading(!!selected);acceptedUrl.current=location.pathname+location.search;
    void initialize();
    const pop=(event:PopStateEvent)=>{const url=new URL(location.href),id=url.searchParams.get('app');void navigateTo(id?moduleById(id)||null:null,event.state?.hubSection||'all','pop',parseThemeId(url.searchParams.get('style')),url.search);};
    const unload=(event:BeforeUnloadEvent)=>{if(pendingSaves.current||preferenceSaveError.current){event.preventDefault();event.returnValue='';return;}const current=openRef.current;if(!current||hubStorageMode(current.id,frameRef.current?.contentWindow)==='native')return;const found=findModuleStorage(frameRef.current?.contentWindow??null,current.id,location.origin);if(found&&found.bridge.status.state!=='saved'){event.preventDefault();event.returnValue='';}};
    const motion=matchMedia('(prefers-reduced-motion: reduce)'),syncMotion=()=>setReducedMotion(motion.matches),visibility=()=>setPageVisible(!document.hidden),syncFullscreen=()=>setFullscreen(!!document.fullscreenElement);
    syncMotion();visibility();setCanFullscreen(!!document.fullscreenEnabled);
    addEventListener('popstate',pop);addEventListener('beforeunload',unload);motion.addEventListener('change',syncMotion);
    document.addEventListener('visibilitychange',visibility);document.addEventListener('fullscreenchange',syncFullscreen);
    return()=>{removeEventListener('popstate',pop);removeEventListener('beforeunload',unload);motion.removeEventListener('change',syncMotion);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('fullscreenchange',syncFullscreen);if(toastTimer.current)clearTimeout(toastTimer.current);};
  },[]);
  useEffect(()=>{
    const shortcut=(event:KeyboardEvent)=>{if(!open&&section!=='data'&&canFocusHubSearch(event)){event.preventDefault();exploreCatalog();}};
    addEventListener('keydown',shortcut);return()=>removeEventListener('keydown',shortcut);
  },[open,section]);
  useEffect(()=>{
    if(!catalogFocusRequested.current||open||section==='data'||!searchRef.current)return;
    catalogFocusRequested.current=false;
    document.getElementById('hub-catalog')?.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});
    searchRef.current.focus({preventScroll:true});
  },[catalogRequest,cozyDirectoryOpen,open,section,reducedMotion]);
  useEffect(()=>{
    if(open||pendingCatalogScroll.current===null)return;
    const top=pendingCatalogScroll.current,frame=requestAnimationFrame(()=>{if(!openRef.current){window.scrollTo({top,behavior:'instant'});pendingCatalogScroll.current=null;}});
    return()=>cancelAnimationFrame(frame);
  },[open,section,search]);
  useEffect(()=>{
    const media=matchMedia('(max-width: 900px)'),sync=()=>{setMobileNavigation(media.matches);if(!media.matches)setSidebarOpen(false);};
    sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);
  },[]);
  useEffect(()=>{
    if(!sidebarOpen||!mobileNavigation||appearance.theme!=='classic'||open||!sidebarRef.current)return;
    return installNavigationModal(sidebarRef.current,sidebarTriggerRef.current,()=>setSidebarOpen(false));
  },[sidebarOpen,mobileNavigation,appearance.theme,open]);
  useEffect(()=>{if(moduleToolsOpen)moduleBackRef.current?.focus({preventScroll:true});},[moduleToolsOpen]);
  useEffect(()=>{
    const message=(event:MessageEvent)=>{
      const action=moduleNavigationAction(event,frameRef.current?.contentWindow??null,window.location.origin,openRef.current?.id??null);
      if(action==='hub:open-menu')setModuleToolsOpen(true);
      else if(action==='hub:return')void navigateTo(null);
    };
    addEventListener('message',message);return()=>removeEventListener('message',message);
  },[]);
  useEffect(()=>{
    if(open&&shellRef.current)return installImmersiveViewport(shellRef.current);
  },[Boolean(open)]);
  useEffect(()=>{
    if(!open&&document.fullscreenElement===shellRef.current)void document.exitFullscreen().catch(()=>{});
  },[open]);
  useEffect(()=>{if(backup&&!backupDialogRef.current?.open)backupDialogRef.current?.showModal();else if(!backup)backupDialogRef.current?.close();},[backup]);

  async function loadFiles(){
    const owner=sessionRef.current?.userId;setFileLoading(true);setFileError('');
    try{assertOwner(owner);const data=await result<{files:FileItem[];hasMore:boolean}>(await fetch('/api/hub/files',{cache:'no-store',headers:{'X-Hub-User-Id':owner!}}));assertOwner(owner);setFiles(data.files||[]);setFilesMore(data.hasMore===true);}
    catch(cause){if(owner===sessionRef.current?.userId)setFileError(friendly(cause));}finally{setFileLoading(false);}
  }
  async function refreshData(){await Promise.allSettled([loadFiles(),checkHealth()]);}
  useEffect(()=>{if(section==='data'&&session?.authenticated)void loadFiles();},[section,session?.userId]);
  async function upload(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(file.size>25*1024*1024){setError('每个文件最多 25 MB，请选择较小的文件。');return;}
    if(!file.size){setError('这个文件是空的，请重新选择。');return;}
    setUploading(true);const owner=sessionRef.current?.userId;
    try{assertOwner(owner);const body=new FormData();body.append('file',file);body.append('moduleId','hub-preferences');await result(await fetch('/api/hub/files',{method:'POST',body,headers:{'X-Hub-User-Id':owner!}}));assertOwner(owner);await loadFiles();notify('文件已保存。');}
    catch(cause){setError(friendly(cause));}finally{setUploading(false);}
  }
  async function exportBackup(){
    const owner=sessionRef.current?.userId;
    try{assertOwner(owner);const response=await fetch('/api/hub/export',{cache:'no-store',headers:{'X-Hub-User-Id':owner!}});if(!response.ok){await result(response);return;}const blob=await response.blob();assertOwner(owner);const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='工作空间-存档备份-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('存档备份已导出。');}
    catch(cause){setError(friendly(cause));}
  }
  async function previewBackupRaw(raw:string){
    if(previewLock.current||importLock.current)throw Error('正在处理另一份存档，请稍后再试。');
    previewLock.current=true;setReadingBackup(true);setBackup(null);
    try{
      if(new TextEncoder().encode(raw).byteLength>34*1024*1024)throw Error('备份文件超过 34 MiB，请分批导入。');
      let data:unknown;try{data=JSON.parse(raw);}catch{throw Error('备份不是有效的 JSON，请检查后重新选择。');}
      const parsed=parseBackup(data,legacyGame==='auto'?undefined:legacyGame),owner=sessionRef.current?.userId;assertOwner(owner);
      await queue.current;assertOwner(owner);if(preferenceSaveError.current)throw Error('工作空间偏好尚未保存，请重新连接后再导入。'+preferenceSaveError.current);
      const preview=await prepareBackupPreview(parsed.entries,async id=>{const value=await result<Stored>(await fetch('/api/hub/state/'+encodeURIComponent(id),{cache:'no-store',headers:{'X-Hub-User-Id':owner!}}));assertOwner(owner);return value;});
      assertOwner(owner);backupOwner.current=owner;setBackupWarnings(parsed.warnings);setBackup(preview);
    }finally{previewLock.current=false;setReadingBackup(false);}
  }
  async function readBackup(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{if(file.size>34*1024*1024)throw Error('备份文件超过 34 MiB，请分批导入。');await previewBackupRaw(await file.text());}
    catch(cause){setError(friendly(cause));}
  }
  async function importBackup(){
    if(!backup||importLock.current)return;importLock.current=true;setImporting(true);let completed=0,importedPreferences=false;
    try{
      const owner=backupOwner.current;assertOwner(owner);await queue.current;assertOwner(owner);if(preferenceSaveError.current)throw Error('工作空间偏好尚未保存，请重新连接后再导入。'+preferenceSaveError.current);
      for(const item of backup){
        assertOwner(owner);await result<Stored>(await fetch('/api/hub/import',{method:'POST',headers:{'Content-Type':'application/json','X-Hub-User-Id':owner!},body:JSON.stringify({moduleId:item.moduleId,values:item.mergedValues,expectedRevision:item.expectedRevision})}));assertOwner(owner);completed++;if(item.moduleId==='hub-preferences')importedPreferences=true;
      }
      setBackup(null);if(importedPreferences)await loadPreferences();notify('已导入 '+completed+' 项存档。');
    }catch(cause){
      let recoveryNote='';
      if(importedPreferences){try{assertOwner(backupOwner.current);await loadPreferences();}catch{preferencesReady.current=false;recoveryNote=' 工作空间偏好需要重新连接后才能继续保存。';}}
      setError('已完成 '+completed+' 项。'+friendly(cause)+' 请取消并重新选择备份以更新预览。'+recoveryNote);setBackup(current=>current?.slice(completed)||null);
    }
    finally{importLock.current=false;setImporting(false);}
  }
  async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await shellRef.current?.requestFullscreen();}catch{setError('当前浏览器无法进入全屏，请使用新窗口打开。');setModuleToolsOpen(true);}}

  const theme=themeById(appearance.theme),moving=appearance.motion&&!reducedMotion&&pageVisible&&!open&&theme.motion.supported;
  const query=search.trim().toLowerCase(),activeCategory=categories.find(category=>category.id===section);
  const visible=modules.filter(module=>(section==='all'||module.category===section||section==='favorites'&&favorites.includes(module.id))&&(!query||(module.name+module.subtitle+module.description).toLowerCase().includes(query)));
  const recentModules=recents.map(moduleById).filter(Boolean) as HubModule[];
  const hasIssue=!!(error||healthError||fileError);
  const status=!ready||health==='checking'?'正在连接':saving?'正在保存偏好':hasIssue?'连接需要留意':session?.authenticated&&health==='ready'?'私人空间已连接':session?.authenticated?'保存服务待确认':'尚未登录';
  const controlsDisabled=!ready||navigating||importing;
  const showHero=!open&&section==='all'&&!query;
  const cozyHome=!open&&theme.id==='cozy'&&section==='all';
  const sceneProps={motion:moving,recentModules,onLaunch:launch,onExplore:exploreCatalog,onSelectCategory:selectSection,onOpenData:()=>selectSection('data'),disabled:controlsDisabled};

  return <div ref={shellRef} className={'hub-shell theme-'+theme.id+(open?' module-open':'')+(open?.id==='novel-studio'&&!legacyNovelPage?' module-native-navigation':'')+(cozyHome?' cozy-space-open':'')+(cozyHome&&cozyDirectoryOpen?' cozy-directory-open':'')} style={themeVariables(theme) as CSSProperties} data-motion={moving?'on':'off'}>
    <a className="hub-skip" href="#hub-main">跳到主要内容</a>
    {theme.id==='kinetic'&&!open&&<><KineticBackdrop motion={moving} view={section}/><KineticMotion motion={moving} viewKey={section+'|'+search+'|'+favorites.join(',')}/><div className="hub-kinetic-progress" aria-hidden="true"/></>}
    {theme.id==='classic'&&<>
      {sidebarOpen&&<button className="hub-sidebar-scrim" aria-label="关闭导航" onClick={()=>setSidebarOpen(false)}/>}
      <aside ref={sidebarRef} id="hub-sidebar" className={'hub-sidebar '+(sidebarOpen?'is-open':'')} aria-label="工作空间导航" role={mobileNavigation&&sidebarOpen?'dialog':undefined} aria-modal={mobileNavigation&&sidebarOpen?true:undefined} tabIndex={-1}>
        <button className="hub-sidebar-close hub-icon-button" onClick={()=>setSidebarOpen(false)} aria-label="关闭导航"><X size={22}/></button>
        <button className="hub-sidebar-brand" onClick={()=>selectSection('all')} disabled={navigating}><span className="hub-classic-mark" aria-hidden="true"><i/><i/><i/><i/></span><span>丁康的工作空间</span></button>
        <nav><button className={section==='all'&&!open?'active':''} onClick={()=>selectSection('all')} disabled={navigating}><Grid2X2 size={21}/>全部应用<span>{modules.length}</span></button><button className={section==='favorites'&&!open?'active':''} onClick={()=>selectSection('favorites')} disabled={navigating}><Star size={21}/>我的收藏</button>{categories.map(category=>{const Icon=icons[category.icon];return <button key={category.id} className={section===category.id&&!open?'active':''} onClick={()=>selectSection(category.id)} disabled={navigating}><Icon size={21}/>{category.name}</button>;})}</nav>
        <div className="hub-sidebar-rule"/><button className={'hub-sidebar-data '+(section==='data'&&!open?'active':'')} onClick={()=>selectSection('data')} disabled={navigating}><FolderOpen size={21}/>数据中心</button>
        <div className="hub-sidebar-bottom"><ShieldCheck size={21}/><div><strong>{session?.displayName||'私人空间'}</strong>{!session?.authenticated&&<p>登录后保存个人偏好</p>}</div></div>
      </aside>
    </>}
    <header className="hub-header">
      {theme.id==='classic'&&<button ref={sidebarTriggerRef} className="hub-classic-menu hub-icon-button" onClick={()=>setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen?'关闭导航':'打开导航'} aria-expanded={sidebarOpen} aria-controls="hub-sidebar"><Menu size={23}/></button>}
      {theme.id==='classic'&&<div className="hub-classic-breadcrumb"><span>工作空间</span><span>/</span><strong>{open?.name|| (section==='data'?'数据中心':section==='favorites'?'我的收藏':activeCategory?.name||'全部应用')}</strong></div>}
      <button className="hub-brand" onClick={()=>selectSection('all')} disabled={navigating} aria-label="丁康的工作空间，返回工作台"><span className="hub-brand-sign" aria-hidden="true"/><span>丁康<span className="hub-brand-divider">/</span><span className="hub-brand-name">{theme.identity}</span></span></button>
      <nav className="hub-primary-nav" aria-label="主导航">
        <button className={section!=='data'&&section!=='favorites'&&!open?'active':''} onClick={()=>selectSection('all')} disabled={navigating}>{theme.id==='cozy'?'基地':'工作台'}</button>
        <button className={section==='favorites'&&!open?'active':''} onClick={()=>selectSection('favorites')} disabled={navigating}>收藏</button>
        <button className={section==='data'&&!open?'active':''} onClick={()=>selectSection('data')} disabled={navigating}>数据中心</button>
      </nav>
      <div className="hub-header-actions">
        <span className={'hub-connection '+(hasIssue?'warning':'')} title={status}>{!ready||saving||health==='checking'?<LoaderCircle size={17} className="hub-spin"/>:health==='ready'&&!hasIssue?<CloudCheck size={17}/>:<CloudOff size={17}/>}<span>{status}</span></span>
        <button className="hub-icon-button" onClick={()=>settingsRef.current?.showModal()} aria-label="外观与账号" title="外观与账号"><SlidersHorizontal size={21}/></button>
      </div>
    </header>
    <div className="hub-style-bar"><div className="hub-style-switcher" role="group" aria-label="选择工作空间风格">{hubThemes.map(item=><button key={item.id} aria-pressed={appearance.theme===item.id} aria-label={'切换为'+item.name} disabled={!ready||navigating||importing||readingBackup} onClick={()=>changeTheme(item.id)}>{item.id==='classic'?<Grid2X2 size={17}/>:item.id==='night-harbor'?<Moon size={17}/>:item.id==='kinetic'?<Sparkles size={17}/>:<House size={17}/>}<span>{{classic:'经典','night-harbor':'夜航',kinetic:'动态',cozy:'基地'}[item.id]}</span></button>)}</div></div>

    {!open&&(error||healthError)&&<div className="hub-error" role="alert"><AlertCircle size={21}/><p>{error||healthError}</p><button onClick={()=>void initialize()} disabled={!ready}><RefreshCw size={16}/>重新连接</button>{error&&<button className="hub-icon-button" onClick={()=>setError('')} aria-label="关闭提示"><X size={18}/></button>}</div>}

    <main id="hub-main">
      {open?<div className="hub-app-stage">
        {(open.id!=='novel-studio'||legacyNovelPage)&&<button ref={moduleToolsButtonRef} type="button" className={'hub-module-launcher'+(hasIssue?' has-issue':'')} onClick={toggleModuleTools} aria-label={moduleToolsOpen?'收起工作台菜单':hasIssue?'打开工作台菜单，连接需要留意':'打开工作台菜单'} aria-expanded={moduleToolsOpen} aria-controls="hub-module-tools" title="工作台菜单"><Menu size={21}/>{hasIssue&&<span className="hub-module-alert-dot" aria-hidden="true"/>}</button>}
        <section ref={moduleToolsRef} id="hub-module-tools" className="hub-module-tools" hidden={!moduleToolsOpen} aria-label="工作台菜单" onKeyDown={event=>{if(event.key==='Escape'&&!(event.target as HTMLElement).closest('dialog[open]')){event.preventDefault();event.stopPropagation();closeModuleTools();}}}>
          <div className="hub-module-tools-heading"><div><h1>{open.id==='novel-studio'?'工作空间':open.name}</h1></div><button className="hub-icon-button" onClick={closeModuleTools} aria-label="收起工作台菜单"><X size={21}/></button></div>
          <button ref={moduleBackRef} className="hub-module-return" onClick={()=>void navigateTo(null)} disabled={navigating}>{navigating?<LoaderCircle size={20} className="hub-spin"/>:<ChevronLeft size={21}/>}<span>{theme.id==='cozy'?(cozyRoom.current?'返回房间':'返回基地'):'返回工作台'}</span></button>
          <div className="hub-module-controls">
            <button onClick={()=>settingsRef.current?.showModal()}><SlidersHorizontal size={19}/>外观与账号</button>
            {canFullscreen&&<button onClick={()=>void toggleFullscreen()}>{fullscreen?<Minimize2 size={19}/>:<Maximize2 size={19}/>}<span>{fullscreen?'退出浏览器全屏':'浏览器全屏'}</span></button>}
            <a href={moduleUrl(open,appearance.theme,routeSearch.current)} target="_blank" rel="noopener noreferrer"><ExternalLink size={19}/>新窗口打开</a>
            <button onClick={()=>void navigateTo(null,'data')} disabled={navigating}><FolderOpen size={19}/>文件与存档</button>
          </div>
          <div className="hub-module-preferences"><span className={'hub-connection '+(hasIssue?'warning':'')} role="status">{!ready||saving||health==='checking'?<LoaderCircle size={17} className="hub-spin"/>:health==='ready'&&!hasIssue?<CloudCheck size={17}/>:<CloudOff size={17}/>}<span>{status}</span></span></div>
          {(error||healthError)&&<div className="hub-error hub-module-error" role="alert"><AlertCircle size={20}/><p>{error||healthError}</p><button onClick={()=>void initialize()} disabled={!ready}><RefreshCw size={16}/>重新连接</button>{error&&<button className="hub-icon-button" onClick={()=>setError('')} aria-label="关闭提示"><X size={18}/></button>}</div>}
          <HubStoragePanel key={open.id} moduleId={open.id} iframeRef={frameRef} className="hub-module-storage"/>
        </section>
        <div className="hub-frame-wrap">{frameLoading&&<div className="hub-frame-loading" role="status"><LoaderCircle size={28} className="hub-spin"/><p>正在打开{open.name}…</p></div>}<iframe key={open.id} ref={frameRef} src={open.path} title={open.name} allow="fullscreen; clipboard-write; autoplay" onLoad={()=>{setFrameLoading(false);setLegacyNovelPage(openRef.current?.id==='novel-studio'&&hubStorageMode('novel-studio',frameRef.current?.contentWindow)==='bridge');}}/></div>
      </div>:<>
        {showHero&&theme.id==='classic'&&<section className="hub-classic-welcome hub-content"><div><h1>今天，从这里继续。</h1></div>{recentModules.length>0&&<div className="hub-classic-recents"><h2>最近使用</h2><div>{recentModules.slice(0,3).map(module=><button key={module.id} disabled={controlsDisabled} onClick={()=>launch(module)}><AppIcon module={module}/><span><strong>{module.name}</strong></span><ArrowUpRight size={20}/></button>)}</div></div>}</section>}
        {showHero&&theme.id==='kinetic'&&<KineticScene {...sceneProps} motionEnabled={appearance.motion} reducedMotion={reducedMotion} onToggleMotion={()=>persist({appearance:{...appearanceRef.current,motion:!appearanceRef.current.motion}})}/>}
        {cozyHome&&<div className="hub-cozy-space"><CozyBaseScene {...sceneProps} initialRoom={cozyRoom.current} onRoomChange={rememberCozyRoom}/></div>}
        {showHero&&theme.id==='night-harbor'&&<section className="hub-hero" aria-labelledby="hero-title">
          {theme.scene.src&&<div className="hub-scene" aria-hidden="true"><img src={theme.scene.src} alt="" style={{objectPosition:theme.scene.position}} fetchPriority="high"/><div className="hub-scene-shade"/></div>}
          <div className="hub-hero-copy"><h1 id="hero-title">好奇不熄，<br/>继续创造。</h1><button className="hub-hero-link" onClick={exploreCatalog}>打开应用目录<ArrowRight size={21}/></button></div>
          {recentModules.length>0?<div className="hub-continue"><h2><Clock3 size={18}/>接着上次</h2>{recentModules.slice(0,3).map(module=><button key={module.id} onClick={()=>launch(module)} disabled={controlsDisabled}><AppIcon module={module} size={21}/><span>{module.name}</span><ArrowUpRight size={21}/></button>)}</div>:null}
        </section>}

        {section==='data'?<div className="hub-content hub-data-content">
          <div className="hub-page-heading"><div><h1>数据中心</h1></div><button className="hub-button" onClick={()=>void refreshData()} disabled={fileLoading||!session?.authenticated}><RefreshCw size={18} className={fileLoading?'hub-spin':''}/>刷新</button></div>
          {!session?.authenticated&&<div className="hub-signin-callout"><ShieldCheck size={26}/><div><h2>登录你的私人空间</h2><p>文件和应用存档会归属于你的账号。</p></div><button className="hub-button primary" onClick={()=>void leaveFor('/signin-with-chatgpt?return_to=/')}>登录</button></div>}
          <section className="hub-files" aria-labelledby="files-title">
            <div className="hub-section-heading"><div><h2 id="files-title">我的文件 <span className="hub-count">{files.length}{filesMore?'+':''}</span></h2><p>每个文件最多 25 MB。知证中的论文附件仍在知证内管理。</p></div><button className="hub-button primary" onClick={()=>uploadRef.current?.click()} disabled={!session?.authenticated||uploading}>{uploading?<LoaderCircle size={18} className="hub-spin"/>:<Upload size={18}/>} {uploading?'正在上传':'上传文件'}</button><input type="file" hidden ref={uploadRef} onChange={upload}/></div>
            {fileLoading?<div className="hub-empty"><LoaderCircle size={28} className="hub-spin"/><p>正在读取文件…</p></div>:fileError?<div className="hub-empty" role="alert"><CloudOff size={32}/><h3>暂时无法读取文件</h3><p>{fileError}</p><button className="hub-button" onClick={()=>void loadFiles()}>重试</button></div>:files.length?<div className="hub-file-list"><div className="hub-file-header"><span>文件名称</span><span>大小</span><span>保存时间</span><span/></div>{files.map(file=>{const Icon=file.mimeType?.startsWith('image/')?ImageIcon:file.mimeType?.startsWith('audio/')?Music2:file.mimeType?.includes('pdf')?FileText:File;return <div className="hub-file-row" key={file.id}><span><Icon size={23}/><strong title={file.name}>{file.name}</strong></span><span>{sizeLabel(file.size)}</span><span>{file.createdAt?new Date(file.createdAt).toLocaleDateString('zh-CN'):'—'}</span><a className="hub-icon-button" href={'/api/hub/files/'+encodeURIComponent(file.id)} download={file.name} title={'下载'+file.name} aria-label={'下载'+file.name}><Download size={21}/></a></div>;})}</div>:<div className="hub-empty"><FolderOpen size={42} strokeWidth={1.3}/><h3>留一个位置，放重要的东西。</h3><p>文档、图片和其他资料，上传后可以在不同设备取用。</p></div>}
            {filesMore&&!fileLoading&&!fileError&&<p className="hub-file-limit" role="status">当前显示最近 {files.length} 个文件，较早的文件仍保留在空间中。</p>}
          </section>
          <section className="hub-backup" aria-labelledby="backup-section-title">
            <div className="hub-backup-intro"><div><h2 id="backup-section-title">应用存档</h2><p>导出已同步的应用存档和工作空间偏好。导入前，先核对内容。</p><p className="hub-scope-note">不包含应用内业务记录、附件或历史版本。论文、账单和对话等记录，在对应应用内管理。</p></div><button className="hub-button" disabled={!session?.authenticated} onClick={()=>void exportBackup()}><Download size={18}/>导出云端存档</button></div>
            <div className="hub-import-toolbar"><label>旧游戏存档来源<select value={legacyGame} onChange={event=>setLegacyGame(event.target.value)} disabled={readingBackup||importing}><option value="auto">自动识别</option>{GAME_IMPORT_METADATA.map(game=><option key={game.moduleId} value={game.moduleId}>{game.title}</option>)}</select></label><button className="hub-button primary" disabled={!session?.authenticated||readingBackup||importing} onClick={()=>importRef.current?.click()}>{readingBackup?<LoaderCircle size={18} className="hub-spin"/>:<Upload size={18}/>} {readingBackup?'正在读取':'选择备份文件'}</button><input ref={importRef} type="file" accept=".json,application/json" hidden onChange={readBackup}/></div>
            <details className="hub-paste-disclosure"><summary>或粘贴 JSON 存档</summary><BackupPasteInput key={session?.userId||'signed-out'} onSubmitRaw={previewBackupRaw} disabled={!session?.authenticated||!ready||!preferencesReady.current||importing} busy={readingBackup} disabledReason={!session?.authenticated?'请先登录私人空间。':undefined}/></details>
          </section>
        </div>:<>
          {cozyHome&&cozyDirectoryOpen&&<div className="hub-cozy-directory-toggle hub-content"><button className="hub-button" aria-expanded={cozyDirectoryOpen} aria-controls="hub-catalog" onClick={()=>setCozyDirectoryOpen(false)}><Search size={19}/>收起列表</button><span>全部 {modules.length} 个应用</span></div>}
          <div className="hub-content hub-catalog" id="hub-catalog" hidden={cozyHome&&!cozyDirectoryOpen}>
          <div className="hub-catalog-heading"><div><h2>{section==='favorites'?'我的收藏':activeCategory?.name||'应用目录'}</h2></div><label className="hub-search"><Search size={21}/><input ref={searchRef} aria-label="搜索应用" placeholder="找一个应用" value={search} onChange={event=>setSearch(event.target.value)}/>{search?<button onClick={()=>setSearch('')} aria-label="清除搜索"><X size={19}/></button>:<kbd>/</kbd>}</label></div>
          {section!=='favorites'&&<nav className="hub-category-filter" aria-label="应用分类"><button className={section==='all'?'active':''} onClick={()=>selectSection('all')}>全部</button>{categories.map(category=><button key={category.id} className={section===category.id?'active':''} onClick={()=>selectSection(category.id)}>{category.name}</button>)}</nav>}
          {visible.length===0?<div className="hub-empty hub-no-apps">{section==='favorites'?<Star size={38}/>:<Search size={38}/>}<h3>{query?'没有找到这个应用':'还没有收藏应用'}</h3><p>{query?'试试名称，例如“知证”或“三国”。':'应用旁的星标，会把它留在这里。'}</p><button className="hub-button" onClick={()=>selectSection('all')}>查看全部应用</button></div>:categories.filter(category=>visible.some(module=>module.category===category.id)).map(category=>{
            const presentation=categoryPresentation[category.id],scenic=theme.id!=='classic'&&(category.id==='games'||category.id==='life');
            return <section className={'hub-collection '+(scenic?'scenic':'editorial')} data-category={category.id} key={category.id} aria-labelledby={'category-'+category.id}>
              <div className="hub-collection-heading"><h3 id={'category-'+category.id}>{theme.id==='classic'?category.name:presentation.title}</h3></div>
              <div className={scenic?'hub-art-grid':'hub-editorial-grid'}>{visible.filter(module=>module.category===category.id).map(module=>{
                const art=moduleArtwork[module.id];
                return <article className={'hub-application '+(art?'has-art':'type-art')} key={module.id}>
                  <button className="hub-app-launch" onClick={()=>launch(module)} disabled={controlsDisabled}>
                    {theme.id==='kinetic'&&!scenic&&<div className={'hub-kinetic-glyph glyph-'+module.category} aria-hidden="true"><i/><i/><i/><i/><span><AppIcon module={module} size={35}/></span></div>}
                    {scenic&&<div className="hub-artwork">{art?<img src={art.src} alt={art.label} loading="lazy" style={{objectPosition:art.position}}/>:<div className={'hub-art-type art-'+module.id}><AppIcon module={module} size={48}/><span>{module.id==='yourwar-battle-forge'?'YourWar':module.name}</span></div>}<span className="hub-open-mark" aria-hidden="true"><ArrowUpRight size={26}/></span></div>}
                    <div className="hub-app-copy">{!scenic&&<AppIcon module={module} size={27}/>}<div><h4>{module.name}</h4></div></div>
                  </button>
                  <button className={'hub-favorite '+(favorites.includes(module.id)?'selected':'')} onClick={()=>toggleFavorite(module.id)} disabled={!ready||importing} aria-label={(favorites.includes(module.id)?'取消收藏':'收藏')+module.name} title={favorites.includes(module.id)?'取消收藏':'收藏'} aria-pressed={favorites.includes(module.id)}><Star size={20} fill={favorites.includes(module.id)?'currentColor':'none'}/></button>
                </article>;
              })}</div>
            </section>;
          })}
          </div>
        </>}
        <footer className="hub-footer"><span className="hub-footer-name">丁康 · {theme.identity}</span><button onClick={()=>selectSection('data')}>管理文件与存档<ArrowUpRight size={18}/></button></footer>
      </>}
    </main>

    {toast&&<div className="hub-toast" role="status"><Check size={20}/>{toast}</div>}

    <dialog ref={settingsRef} className="hub-dialog hub-settings" aria-labelledby="appearance-title">
      <div className="hub-dialog-heading"><h2 id="appearance-title">外观与账号</h2><button className="hub-icon-button" onClick={()=>settingsRef.current?.close()} aria-label="关闭外观设置"><X size={22}/></button></div>
      <div className="hub-theme-options" role="group" aria-label="工作空间外观">{hubThemes.map(item=><div className="hub-theme-option" key={item.id}><button className={appearance.theme===item.id?'selected':''} aria-pressed={appearance.theme===item.id} disabled={!ready||importing||readingBackup||navigating} onClick={()=>changeTheme(item.id)}><span className={'hub-theme-preview preview-'+item.id}>{item.scene.src&&<img src={item.scene.src} alt=""/>}<span/><span/></span><strong>{item.name}{appearance.theme===item.id&&<Check size={18}/>}</strong></button><a className="hub-style-link" href={buildHubUrl(null,item.id,routeSearch.current)} target="_blank" rel="noopener noreferrer">独立打开<ArrowUpRight size={15}/></a></div>)}</div>
      <div className="hub-motion-control"><div><h3>场景动效</h3>{(reducedMotion||!theme.motion.supported)&&<p>{reducedMotion?'已遵循系统的减少动效设置。':'经典工作台不使用场景动效。'}</p>}</div><button className="hub-switch" role="switch" aria-checked={appearance.motion&&!reducedMotion&&theme.motion.supported} aria-label="场景动效" disabled={!ready||reducedMotion||!theme.motion.supported||importing||navigating} onClick={()=>persist({appearance:{...appearanceRef.current,motion:!appearanceRef.current.motion}})}><span/></button></div>
      <div className="hub-settings-account"><div><ShieldCheck size={21}/><span><strong>{session?.displayName||'私人空间'}</strong><small>{session?.authenticated?'外观随账号保存':'登录后保存外观与应用偏好'}</small></span></div><button className="hub-button" disabled={navigating} onClick={()=>{settingsRef.current?.close();void leaveFor(session?.authenticated?'/signout-with-chatgpt?return_to=/':'/signin-with-chatgpt?return_to=/');}}>{session?.authenticated?<LogOut size={18}/>:<ArrowUpRight size={18}/>} {session?.authenticated?'退出':'登录'}</button></div>
    </dialog>

    <dialog ref={backupDialogRef} className="hub-dialog hub-import-dialog" aria-labelledby="backup-title" onCancel={event=>{if(importing)event.preventDefault();else setBackup(null);}}>
      {backup&&<><div className="hub-dialog-heading"><h2 id="backup-title">确认这份存档</h2><button className="hub-icon-button" disabled={importing} onClick={()=>setBackup(null)} aria-label="关闭"><X size={22}/></button></div><p>包含 {backup.length} 项应用数据。同名记录使用备份内容，其他记录会保留。</p><div className="hub-import-list">{backup.map(item=><div key={item.moduleId}><span>{item.moduleId==='hub-preferences'?'工作空间偏好':moduleById(item.moduleId)?.name}</span><small>{Object.keys(item.values).length} 项记录</small></div>)}</div>{backupWarnings.map((warning,index)=><p className="hub-import-warning" key={index}>{warning}</p>)}{error&&<p className="hub-import-warning" role="alert">{error}</p>}<p className="hub-import-note">建议先导出当前存档。预览后若存档更新，对应应用会停止导入；此前已成功导入的应用会保留。</p><div className="hub-dialog-actions"><button className="hub-button" disabled={importing} onClick={()=>setBackup(null)}>取消</button><button className="hub-button primary" disabled={importing} onClick={()=>void importBackup()}>{importing&&<LoaderCircle size={18} className="hub-spin"/>}{importing?'正在导入':'确认导入'}</button></div></>}
    </dialog>
  </div>;
}
