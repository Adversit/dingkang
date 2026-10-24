'use client';
import {CSSProperties} from 'react';
import {HEROES,FACTION_COLOR} from './data';

/** Full-body transparent battle actor. Portraits remain only in compact UI. */
export default function Character({id,className='',mirrored=false,priority=false}:{id:number;className?:string;mirrored?:boolean;priority?:boolean}){
 const hero=HEROES[id];
 return <div className={`character ${className} ${mirrored?'character-mirrored':''}`} style={{'--faction':FACTION_COLOR[hero.faction],'--idle-delay':`${-(id%7)*.43}s`} as CSSProperties}>
  <img className="character-sprite" src={`/assets/yunque-sanguo/art/characters/hero-${id}.webp`} alt={`${hero.name}全身战斗角色`} draggable={false} loading={priority?'eager':'lazy'} decoding="async"/>
 </div>;
}
