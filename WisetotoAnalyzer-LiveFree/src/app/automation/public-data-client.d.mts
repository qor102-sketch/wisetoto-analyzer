export type PublicFeedName="history"|"health"|"collection"|"research";
export type PublicProjection<T>={data:T;transport:"cdn"|"legacy"};
export const PUBLIC_FEEDS:Readonly<Record<PublicFeedName,{
 readonly path:string;readonly legacy:string|null;
 readonly schema:string;readonly maxRecords:number|null;
}>>;
export function loadPublicProjection<T=unknown>(
 name:PublicFeedName,options?:{
  fetchFn?:typeof fetch;
  timeoutMs?:number;
 }):Promise<PublicProjection<T>>;
