// @ts-check

/**
 * @param {{generatedAt:string,gateA:string,gateB:string,dist:{totalBytes:number,budgetBytes:number,fileCount:number,artifactSha256:string}}} input
 */
export function buildLocalRcReport(input) {
  if (input.gateA !== 'pass' || input.gateB !== 'pass') {
    throw new Error(`LOCAL_RC_GATE_INCOMPLETE: A=${input.gateA} B=${input.gateB}`);
  }
  if (input.dist.totalBytes > input.dist.budgetBytes || !/^[0-9a-f]{64}$/.test(input.dist.artifactSha256)) {
    throw new Error('LOCAL_RC_DIST_INVALID');
  }
  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    candidateStatus: 'pass',
    serverRuntimeRequired: false,
    gates: { A: { status: 'pass', evidence: 'release:verify' }, B: { status: 'pass', evidence: 'release-evidence/browser-smoke-v1.json' } },
    automatedChecks: { tests: { status: 'pass', evidence: 'release:verify' }, productionBundle: 'pass', distValidation: { status: 'pass', ...input.dist } },
    artifact: { directory: 'dist', entryPoint: 'index.html', previewCommand: 'npm run preview' },
    deployment: { attempted: false, rightsGateRequired: true },
  };
}
