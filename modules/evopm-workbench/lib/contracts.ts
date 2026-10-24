export type Mode = 'manual' | 'sample' | 'live' | 'replay' | 'degraded';
export type Product = {version?:number;id:string;name:string;description:string;users:string;goal:string;repository:string;metric:string;mode:Mode;createdAt:string};
export type Signal = {id:string;productId:string;text:string;source:string;sourceId:string;userKey:string;occurredAt:string;redacted:boolean;dedupeKey:string;mode:Mode;createdAt:string};
export type Cluster = {id:string;productId:string;title:string;signalIds:string[];status:'active'|'discarded'|'linked';reason:string;duplicateOf?:string;mode:Mode};
export type EvidenceLink = {signalId:string;relation:'supports'|'contradicts'|'insufficient';note:string};
export type Requirement = {id:string;productId:string;clusterId:string;title:string;story:string;scope:string;acceptance:string;links:EvidenceLink[];quality:{score:number;checks:{label:string;pass:boolean}[];missing:string[]};score:{impact:number;confidence:number;effort:number;priority:number};critic:string;decision:'draft'|'needs_evidence'|'approved'|'rejected';decisionNote:string;version:number;mode:Mode};
export type Plan = {productVersion?:number;id:string;productId:string;requirementId:string;title:string;goal:string;nonGoals:string;scope:string;risks:string;acceptance:string;rollback:string;baseCommit:string;budget:string;version:number;inputVersion:number;mode:Mode};
export type Approval = {id:string;productId:string;planId:string;planVersion:number;inputVersion:number;baseCommit:string;decision:'approved'|'rejected';note:string;actor:string;createdAt:string};
export type Run = {id:string;productId:string;mode:Mode;status:'completed'|'failed'|'waiting';model:string;inputVersion:string;promptVersion:string;attempt:number;budget:string;createdAt:string;durationMs:number;steps:{id:string;name:string;status:'completed'|'failed'|'waiting';message:string;checkpoint:string}[];rawResult?:string};
export type Job = {inputVersion?:number;approvalId?:string;id:string;productId:string;planId:string;planVersion:number;baseCommit:string;status:'blocked'|'exported'|'submitted'|'failed';reason:string;createdAt:string};
export type Evaluation = {planVersion?:number;inputVersion?:number;baseCommit?:string;approvalId?:string;id:string;productId:string;planId:string;commit:string;kind:'ci'|'evaluation';status:'passed'|'failed'|'pending';url:string;note:string;mode:Mode;createdAt:string};
export type Release = {planVersion?:number;approvalId?:string;id:string;productId:string;planId:string;commit:string;url:string;note:string;createdAt:string};
export type Outcome = {releaseId?:string;commit?:string;planVersion?:number;id:string;productId:string;planId:string;metric:string;before:number;after:number;unit:string;beforeWindow:string;afterWindow:string;sampleSize:number;source:string;confounders:string;createdAt:string};
export type Audit = {id:string;productId:string;action:string;detail:string;createdAt:string};
export type State = {products:Product[];signals:Signal[];clusters:Cluster[];requirements:Requirement[];plans:Plan[];approvals:Approval[];runs:Run[];jobs:Job[];evaluations:Evaluation[];releases:Release[];outcomes:Outcome[];audit:Audit[]};
export type Snapshot = {state:State;revision:number;user:{name:string};connections:{model:boolean;engine:boolean;runner:boolean;github:boolean};notice?:string};
export type Action =
 | {type:'product.create';name:string;description?:string;users?:string;goal?:string;repository?:string;metric?:string}
 | {type:'product.update';productId:string;name:string;description?:string;users?:string;goal?:string;repository?:string;metric?:string}
 | {type:'sample.load'}
 | {type:'signals.import';productId:string;items:{text:string;source?:string;sourceId?:string;userKey?:string;occurredAt?:string;redacted?:boolean}[]}
 | {type:'cluster.create';productId:string;title:string;signalIds:string[]}
 | {type:'cluster.merge';productId:string;clusterIds:string[];title:string}
 | {type:'cluster.split';productId:string;clusterId:string;signalIds:string[];title:string}
 | {type:'cluster.discard';productId:string;clusterId:string;reason:string;duplicateOf?:string}
 | {type:'requirement.create';productId:string;clusterId:string;title:string;story:string;scope:string;acceptance:string;links:EvidenceLink[];impact:number;confidence:number;effort:number;critic:string}
 | {type:'requirement.update';productId:string;requirementId:string;title:string;story:string;scope:string;acceptance:string;links:EvidenceLink[];impact:number;confidence:number;effort:number;critic:string}
 | {type:'requirement.decide';productId:string;requirementId:string;decision:'approved'|'rejected'|'needs_evidence';note:string}
 | {type:'plan.create';productId:string;requirementId:string;title:string;goal:string;nonGoals:string;scope:string;risks:string;acceptance:string;rollback:string;baseCommit:string;budget:string}
 | {type:'plan.update';productId:string;planId:string;title:string;goal:string;nonGoals:string;scope:string;risks:string;acceptance:string;rollback:string;baseCommit:string;budget:string}
 | {type:'plan.approve';productId:string;planId:string;decision:'approved'|'rejected';note:string}
 | {type:'job.export';productId:string;planId:string}
 | {type:'run.analyze';productId:string;clusterId:string}
 | {type:'run.import';productId:string;clusterId:string;result:unknown}
 | {type:'evaluation.record';productId:string;planId:string;commit:string;kind:'ci'|'evaluation';status:'passed'|'failed'|'pending';url:string;note:string}
 | {type:'release.record';productId:string;planId:string;commit:string;url:string;note:string}
 | {type:'outcome.record';productId:string;planId:string;metric:string;before:number;after:number;unit:string;beforeWindow:string;afterWindow:string;sampleSize:number;source:string;confounders:string};
