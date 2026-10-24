export const EXPRESSION_LABELS = ['平静','眨眼','微笑','开心','倾听','思考','安慰','惊讶','俏皮','招手','回应 · 开口','回应 · 收口'] as const;
export type AvatarMode='listen'|'solve'|'light';
export function expressionFor({busy,partial,typing,mode,reply}:{busy:boolean;partial:boolean;typing:boolean;mode:AvatarMode;reply:string}):number {
 if(busy)return partial?10:5;
 if(typing)return 4;
 // This selects a visual response from the assistant's words; it never infers
 // the user's mental state or creates a fact/memory.
 if(/难过|失落|辛苦|难受|委屈|痛苦|紧急|危险|不容易/.test(reply))return 6;
 if(/开心|太好了|恭喜|好消息|好棒/.test(reply))return 2;
 return mode==='solve'?5:mode==='light'?2:0;
}
