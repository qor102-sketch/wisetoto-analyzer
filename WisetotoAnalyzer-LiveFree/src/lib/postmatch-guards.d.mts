export type CheckResult={ok:boolean;reason:string|null};
export declare function scorePlausibility(sport:unknown,home:unknown,away:unknown):CheckResult;
export declare function finalStatusProof(root:unknown):{ok:boolean;evidence:string};
export declare function validateFinalResult(args:{sport:unknown;homeScore:unknown;awayScore:unknown;sourceFinal:boolean}):CheckResult;
export declare function positiveValueCandidate(pick:unknown):boolean;
