const { createVisionAI } = require('./visionAI');

(async () => {
  const visionAI = createVisionAI();
  const sampleInput = `
  function yXt(s,o){let e;try{e=new URL(s)}catch{return s}e.searchParams.set("client_id",Ctr),e.searchParams.set("client_version",o.version);let t=o.copilotVersions?.runtime;return t?e.searchParams.set("copilot_runtime_version",t):e.searchParams.delete("copilot_runtime_version"),e.toString()}function ktr(s){return typeof s=="object"&&s!==null}function F8o(s){if(!ktr(s)||s.error_code!==Olt)return;let o=Oe(s.client_version)?s.client_version:void 0,e=Oe(s.minimum_client_version)?s.minimum_client_version:void 0;return{errorCode:Olt,...o?{clientVersion:o}:{},...e?{minimumClientVersion:e}:{}}}`;

  const report = visionAI.analyzeCodePaste(sampleInput);
  console.log(JSON.stringify(report, null, 2));
})();
