'use client';

import {useEffect,useRef} from 'react';
import {installKineticMotion} from '@/lib/hub/kinetic-motion';

/** Enhances the shared workspace DOM; it never owns navigation or module state. */
export default function KineticMotion({motion,viewKey}:{motion:boolean;viewKey:string}) {
  const marker=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const shell=marker.current?.closest<HTMLElement>('.hub-shell');
    if(!shell)return;
    return installKineticMotion(shell,motion);
  },[motion,viewKey]);
  return <span ref={marker} hidden aria-hidden="true"/>;
}
