// Schedule-category-local upstream circuit. A Naver football outage
// should not prevent independently queryable basketball or baseball results.
import {scheduleUrls,kstDate} from "./naver-fast-final.mjs";
export function naverOutageGroup(fixture){
 const url=scheduleUrls(fixture)[0];
 const category=url?new URL(url).searchParams.get("upperCategoryId"):"unknown";
 return String(category)+":"+kstDate(fixture.startMs);
}
