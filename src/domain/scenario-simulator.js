import { parseMessage } from './intent.js';
import { decideEscalation } from './escalation.js';
import {
  createCase,
  transitionCase,
  CASE_STATES,
  buildProviderEscalation
} from './case.js';
import { composeClientReply } from './reply.js';
import {
  classifyProviderReply,
  buildClientUpdate
} from './provider-reply.js';
import { createApproval } from './approval.js';
import {
  planIncidentAction,
  materializeIncident,
  markIncidentEscalated,
  applyProviderIncidentUpdate
} from './incident-coordinator.js';
import {
  buildConsolidatedProviderEscalation,
  buildIncidentClientUpdates
} from './incident-intelligence.js';
import {
  interpretIncidentProviderReply
} from './incident-provider-reply.js';
import {
  evaluateIncidentHealth,
  decideIncidentLifecycle
} from './incident-health.js';
import { buildCommandCenter } from './command-center.js';

function buildCaseFromInput(input, index = 0) {
  const parsed = parseMessage(input.clientMessage);
  let record = createCase({
    caseId:input.caseId || `OPS-SCENARIO-${index + 1}`,
    accountId:input.accountId || 'ACCOUNT-DEMO',
    clientChannelId:input.clientChannelId || 'CLIENT-DEMO',
    providerChannelId:input.providerChannelId || 'PROVIDER-DEMO',
    reference:parsed.reference,
    intent:parsed.intent,
    clientMessage:input.clientMessage
  });

  const createdAt=input.createdAt || record.createdAt;
  record={
    ...record,
    createdAt,
    updatedAt:createdAt
  };

  record=transitionCase(record, CASE_STATES.LOOKUP, {
    lookupSnapshot:input.record || null,
    updatedAt:createdAt
  });

  return { parsed, record };
}

export function simulateSingleCaseScenario(scenario) {
  const now=new Date(scenario.now);
  const { parsed, record:baseCase }=buildCaseFromInput(scenario,0);
  let caseRecord=baseCase;

  const decision=decideEscalation({
    parsed,
    record:scenario.record || null,
    metrics:scenario.metrics || null,
    thresholds:scenario.thresholds || {},
    now
  });

  const initialReply=composeClientReply(parsed, scenario.record || null);
  const approvals=[];

  if (decision.action === 'ESCALATE_PROVIDER') {
    caseRecord=transitionCase(caseRecord, CASE_STATES.NEEDS_PROVIDER, {
      providerEscalatedAt:scenario.providerEscalatedAt || scenario.now
    });

    const draft=buildProviderEscalation(caseRecord);
    approvals.push(createApproval({
      approvalId:`APR-${caseRecord.caseId}-PROVIDER`,
      caseId:caseRecord.caseId,
      kind:'PROVIDER_ESCALATION',
      proposedText:draft,
      metadata:{scenarioId:scenario.id}
    }));
  } else if (decision.action === 'REPLY_LOCAL') {
    caseRecord=transitionCase(caseRecord, CASE_STATES.RESOLVED_LOCALLY, {
      clientReply:initialReply
    });
  }

  let providerReply=null;
  let providerClientUpdate=null;

  if (scenario.providerReply) {
    providerReply=classifyProviderReply(scenario.providerReply);
    providerClientUpdate=buildClientUpdate(caseRecord, providerReply);

    caseRecord=transitionCase(caseRecord, CASE_STATES.CLIENT_UPDATE_READY, {
      providerReply,
      clientReply:providerClientUpdate
    });

    approvals.push(createApproval({
      approvalId:`APR-${caseRecord.caseId}-CLIENT`,
      caseId:caseRecord.caseId,
      kind:'CLIENT_REPLY',
      proposedText:providerClientUpdate.message,
      metadata:{scenarioId:scenario.id}
    }));
  }

  const commandCenter=buildCommandCenter({
    cases:[caseRecord],
    incidents:[],
    approvals,
    now
  });

  return {
    id:scenario.id,
    kind:'SINGLE_CASE',
    parsed,
    decision,
    initialReply,
    providerReply,
    providerClientUpdate,
    caseRecord,
    approvals,
    commandCenter
  };
}

export function simulateIncidentScenario(scenario) {
  const now=new Date(scenario.now);
  const cases=[];
  const approvals=[];
  let incident=null;
  let lastPlan=null;

  for (const [index,input] of scenario.cases.entries()) {
    const built=buildCaseFromInput({
      ...input,
      accountId:input.accountId || scenario.accountId,
      providerChannelId:input.providerChannelId || scenario.providerChannelId
    },index);

    let caseRecord=transitionCase(built.record, CASE_STATES.NEEDS_PROVIDER);

    const plan=planIncidentAction({
      incomingCase:caseRecord,
      openCases:cases,
      incidents:incident ? [incident] : [],
      now,
      windowMinutes:scenario.windowMinutes || 10,
      minCases:scenario.minCases || 3
    });

    lastPlan=plan;

    if (plan.action === 'CREATE_COMMON_INCIDENT') {
      incident=materializeIncident(plan.candidate,{
        incidentId:scenario.incidentId || 'INC-SCENARIO-1',
        summary:scenario.incidentSummary || 'Common queue delay'
      });

      cases.forEach((existing,idx)=>{
        if (incident.affectedCaseIds.includes(existing.caseId)) {
          cases[idx]={...existing,linkedIncidentId:incident.incidentId};
        }
      });

      caseRecord={...caseRecord,linkedIncidentId:incident.incidentId};

      const draft=buildConsolidatedProviderEscalation(
        incident,
        [...cases,caseRecord],
        {now}
      );

      incident=markIncidentEscalated(incident,{
        at:scenario.incidentEscalatedAt || scenario.now,
        draft
      });

      approvals.push(createApproval({
        approvalId:`APR-${incident.incidentId}-PROVIDER`,
        caseId:null,
        kind:'PROVIDER_ESCALATION',
        proposedText:draft,
        metadata:{
          scenarioId:scenario.id,
          incidentId:incident.incidentId
        }
      }));
    } else if (plan.action === 'LINK_EXISTING_INCIDENT') {
      caseRecord={...caseRecord,linkedIncidentId:plan.incident.incidentId};
      incident={
        ...incident,
        affectedCaseIds:[...new Set([...(incident.affectedCaseIds || []),caseRecord.caseId])],
        relatedReferences:[...new Set([...(incident.relatedReferences || []),caseRecord.reference].filter(Boolean))]
      };
    }

    cases.push(caseRecord);
  }

  let providerInterpretation=null;
  let health=null;
  let lifecycle=null;
  let clientUpdates=[];

  if (incident && scenario.providerIncidentReply) {
    providerInterpretation=interpretIncidentProviderReply(
      scenario.providerIncidentReply,
      [incident],
      {
        providerChannelId:scenario.providerChannelId,
        quotedIncidentId:scenario.quotedIncidentId || incident.incidentId
      }
    );

    health=evaluateIncidentHealth({
      metrics:scenario.healthMetrics || {}
    });

    lifecycle=decideIncidentLifecycle({
      incident,
      providerInterpretation,
      health
    });

    incident=applyProviderIncidentUpdate(incident,{
      update:providerInterpretation.parsed.originalMessage,
      state:lifecycle.nextState,
      at:scenario.providerUpdatedAt || scenario.now
    });

    clientUpdates=buildIncidentClientUpdates(
      incident,
      cases,
      {providerUpdate:scenario.providerIncidentReply}
    );

    for (const update of clientUpdates) {
      approvals.push(createApproval({
        approvalId:`APR-${incident.incidentId}-CLIENT-${update.clientChannelId}`,
        caseId:update.caseIds[0] || null,
        kind:'CLIENT_REPLY',
        proposedText:update.message,
        metadata:{
          scenarioId:scenario.id,
          incidentId:incident.incidentId,
          affectedCaseIds:update.caseIds
        }
      }));
    }
  }

  const commandCenter=buildCommandCenter({
    cases,
    incidents:incident ? [incident] : [],
    approvals,
    now
  });

  return {
    id:scenario.id,
    kind:'INCIDENT_CLUSTER',
    lastPlan,
    cases,
    incident,
    providerInterpretation,
    health,
    lifecycle,
    clientUpdates,
    approvals,
    commandCenter
  };
}

export function simulateScenario(scenario) {
  if (scenario.kind === 'SINGLE_CASE') return simulateSingleCaseScenario(scenario);
  if (scenario.kind === 'INCIDENT_CLUSTER') return simulateIncidentScenario(scenario);
  throw new Error(`Unsupported scenario kind: ${scenario.kind}`);
}

function readPath(obj, path) {
  return String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((value,key)=>value == null ? undefined : value[key],obj);
}

export function evaluateScenarioExpectations(result, expectations = []) {
  return expectations.map(expectation=>{
    const actual=readPath(result,expectation.path);
    let passed=false;

    if ('equals' in expectation) {
      passed=actual === expectation.equals;
    } else if ('includes' in expectation) {
      passed=Array.isArray(actual)
        ? actual.includes(expectation.includes)
        : String(actual ?? '').includes(String(expectation.includes));
    } else if ('min' in expectation) {
      passed=Number(actual) >= Number(expectation.min);
    }

    return {
      ...expectation,
      actual,
      passed
    };
  });
}

export function runScenarioSuite(scenarios = []) {
  const results=scenarios.map(scenario=>{
    const result=simulateScenario(scenario);
    const checks=evaluateScenarioExpectations(result,scenario.expect || []);
    return {
      scenarioId:scenario.id,
      title:scenario.title,
      passed:checks.every(x=>x.passed),
      checks,
      result
    };
  });

  return {
    passed:results.every(x=>x.passed),
    total:results.length,
    passedCount:results.filter(x=>x.passed).length,
    failedCount:results.filter(x=>!x.passed).length,
    results
  };
}
