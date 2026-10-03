import assert from 'node:assert/strict';
import {
  evaluateIncidentHealth,
  decideIncidentLifecycle
} from '../src/domain/incident-health.js';

{
  const health=evaluateIncidentHealth({
    metrics:{
      pendingCount:0,
      oldestPendingMinutes:0,
      recentSuccessCount:20,
      newComplaintCount:0
    }
  });
  assert.equal(health.state,'CLEAR');
}

{
  const health=evaluateIncidentHealth({
    metrics:{
      pendingCount:5,
      oldestPendingMinutes:3,
      recentSuccessCount:10,
      newComplaintCount:1
    }
  });
  assert.equal(health.state,'RECOVERING');
}

{
  const incident={state:'OPEN'};
  const lifecycle=decideIncidentLifecycle({
    incident,
    providerInterpretation:{
      update:{nextState:'RESOLVED'}
    },
    health:{state:'DEGRADED'}
  });

  assert.equal(lifecycle.nextState,'MITIGATING');
  assert.match(lifecycle.reason,/do not yet support closure/i);
}

{
  const incident={state:'RECOVERING'};
  const lifecycle=decideIncidentLifecycle({
    incident,
    providerInterpretation:{
      update:{nextState:'RESOLVED'}
    },
    health:{state:'CLEAR'}
  });

  assert.equal(lifecycle.nextState,'RESOLVED');
  assert.equal(lifecycle.confidence,'HIGH');
}

{
  const incident={state:'MITIGATING'};
  const lifecycle=decideIncidentLifecycle({
    incident,
    humanOverride:{state:'RESOLVED'}
  });

  assert.equal(lifecycle.nextState,'RESOLVED');
  assert.equal(lifecycle.confidence,'HUMAN');
}

console.log('incident health tests passed');
