'use client';

import {useId,useRef,useState} from 'react';
import {FileText,LoaderCircle} from 'lucide-react';

export type BackupPasteInputProps = {
  /** Run the same parseBackup → prepareBackupPreview flow used by file import.
   * Resolve after opening its preview; reject with a user-facing error on failure.
   * This callback must not write storage or automatically confirm the preview.
   */
  onSubmitRaw: (text: string) => void | Promise<void>;
  disabled?: boolean;
  busy?: boolean;
  disabledReason?: string;
  className?: string;
};

const MAX_BACKUP_BYTES = 34 * 1024 * 1024;

/** Mount with key={session.userId} so an account change clears pasted data. */
export default function BackupPasteInput({onSubmitRaw,disabled=false,busy=false,disabledReason,className}:BackupPasteInputProps) {
  const id=useId(),inFlight=useRef(false);
  const [raw,setRaw]=useState(''),[submitting,setSubmitting]=useState(false),[error,setError]=useState('');
  const pending=busy||submitting,unavailable=disabled||pending;
  const helpId=`${id}-help`,errorId=`${id}-error`;

  async function preview() {
    if(unavailable||inFlight.current)return;
    if(!raw.trim()){setError('请先粘贴 JSON 存档。');return;}
    if(new TextEncoder().encode(raw).byteLength>MAX_BACKUP_BYTES){setError('粘贴内容超过 34 MiB，请分批导入。');return;}
    inFlight.current=true;setSubmitting(true);setError('');
    try {await onSubmitRaw(raw);}
    catch(cause) {setError(cause instanceof Error?cause.message:'暂时无法解析这份存档，请检查内容后重试。');}
    finally {inFlight.current=false;setSubmitting(false);}
  }

  return <section className={['hub-backup-paste',className].filter(Boolean).join(' ')} aria-busy={pending}>
    <div className="hub-backup-paste-heading">
      <label htmlFor={id}>粘贴 JSON 存档</label>
      <p id={helpId}>粘贴导出的 JSON 内容，解析后查看预览，再确认导入。</p>
    </div>
    <textarea
      id={id}
      className="hub-backup-paste-textarea"
      rows={12}
      style={{width:'100%',minHeight:240,resize:'vertical'}}
      value={raw}
      onChange={event=>{setRaw(event.target.value);setError('');}}
      placeholder="在这里粘贴完整的 JSON 存档…"
      disabled={unavailable}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      aria-invalid={!!error}
      aria-describedby={[helpId,error?errorId:''].filter(Boolean).join(' ')}
    />
    {error&&<p id={errorId} className="hub-import-warning" role="alert">{error}</p>}
    {disabled&&disabledReason&&<p className="hub-backup-paste-status" role="status">{disabledReason}</p>}
    <div className="hub-backup-paste-actions">
      <button type="button" className="hub-button" disabled={unavailable||!raw} onClick={()=>{setRaw('');setError('');}}>清空内容</button>
      <button type="button" className="hub-button primary" disabled={unavailable||!raw.trim()} onClick={()=>void preview()}>
        {pending?<LoaderCircle size={16} className="hub-spin"/>:<FileText size={16}/>}
        {pending?'正在解析':'解析并预览'}
      </button>
    </div>
  </section>;
}
