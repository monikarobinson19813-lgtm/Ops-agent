function money(amount) {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat('en-IN', {
    style:'currency',
    currency:'INR',
    maximumFractionDigits:2
  }).format(Number(amount));
}

export function composeClientReply(parsed, record) {
  if (!parsed?.shouldRespond) {
    return { message:null, reviewRequired:false };
  }

  if (!record && parsed.requiresReference) {
    return {
      message:'Unable to confirm this reference in the authorised scope. Please recheck the reference.',
      reviewRequired:true
    };
  }

  if (parsed.intent === 'BULK_PENDING') {
    return {
      message:'Checking current pending count, oldest pending age and recent processing movement before responding.',
      reviewRequired:true
    };
  }

  if (parsed.intent === 'ROUTE_HEALTH') {
    return {
      message:'Checking current route/provider health and recent processing movement before responding.',
      reviewRequired:true
    };
  }

  const status = String(record?.status || 'UNKNOWN').toUpperCase();
  const amount = money(record?.amount);

  if (parsed.intent === 'TRACE_LOOKUP') {
    return {
      message:record?.traceId
        ? `Checked. ${amount ? amount + ' | ' : ''}${status}. Trace ID: ${record.traceId}.`
        : `Checked. Current status is ${status}; trace ID is not available yet.`,
      reviewRequired:!record?.traceId
    };
  }

  if (parsed.intent === 'BENEFICIARY_NOT_RECEIVED') {
    return {
      message:status === 'SUCCESS' && record?.traceId
        ? `Checked. Showing SUCCESS from our side. Trace ID: ${record.traceId}. Beneficiary non-receipt still needs tracing; receipt is not being assumed from system status alone.`
        : `Checked. Current status is ${status}. Keeping this for review before advising on beneficiary non-receipt.`,
      reviewRequired:true
    };
  }

  if (parsed.intent === 'FAILURE_REASON') {
    if (status === 'FAILED') {
      const reason = record?.failureReason || record?.providerResponse || 'Failure reason is not available on the current result.';
      return {
        message:`Checked. ${amount ? amount + ' | ' : ''}FAILED. Reason: ${reason}`,
        reviewRequired:false
      };
    }

    return {
      message:`Checked. Current status is ${status}. No confirmed FAILED state is showing.`,
      reviewRequired:true
    };
  }

  if (parsed.intent === 'PROOF_REQUEST') {
    return {
      message:'Transaction located. Proof should be shared only after review and redaction.',
      reviewRequired:true
    };
  }

  if (parsed.intent === 'TRANSACTION_STATUS') {
    if (status === 'SUCCESS') {
      return {
        message:`Checked. ${amount ? amount + ' | ' : ''}SUCCESS${record?.traceId ? ` | Trace ID: ${record.traceId}` : ''}.`,
        reviewRequired:false
      };
    }

    if (status === 'FAILED') {
      const reason = record?.failureReason || record?.providerResponse;
      return {
        message:`Checked. ${amount ? amount + ' | ' : ''}FAILED${reason ? ` | ${reason}` : ''}.`,
        reviewRequired:false
      };
    }

    if (['PROCESSING','PENDING','QUEUED'].includes(status)) {
      return {
        message:`Checked. ${amount ? amount + ' | ' : ''}${status}. Still in process; no retry recommendation is being made automatically.`,
        reviewRequired:false
      };
    }
  }

  return {
    message:`Reference located. Current status: ${status}. Review required before replying.`,
    reviewRequired:true
  };
}
