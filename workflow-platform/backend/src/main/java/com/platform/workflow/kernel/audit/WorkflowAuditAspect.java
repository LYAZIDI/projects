package com.platform.workflow.kernel.audit;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.engine.WorkflowException;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * AOP aspect that wraps every call to {@link com.platform.workflow.kernel.workflow.engine.WorkflowEngine#applyTransition}.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Structured logging at entry and exit</li>
 *   <li>Performance timing (logged and micrometer metric already in engine)</li>
 *   <li>Alerting on WorkflowException (permission denied, condition failed)</li>
 *   <li>Catch-all for unexpected errors (re-throws after logging)</li>
 * </ul>
 *
 * <p>This aspect does NOT replace the execution log stored in DB by the engine.
 * It is a complementary observability layer for APM/Datadog/Grafana integration.
 */
@Aspect
@Component
@Slf4j
public class WorkflowAuditAspect {

    @Around("execution(* com.platform.workflow.kernel.workflow.engine.WorkflowEngine.applyTransition(..))")
    public Object auditTransition(ProceedingJoinPoint pjp) throws Throwable {
        ExecutionContext ctx = (ExecutionContext) pjp.getArgs()[0];
        long start = System.currentTimeMillis();

        log.info("[AUDIT] TRANSITION_START entity={}/{} transition={} user={} tenant={} correlationId={}",
            ctx.getEntityType(), ctx.getEntityId(), ctx.getTransitionKey(),
            ctx.getUserId(), ctx.getTenantId(), ctx.getCorrelationId());

        try {
            Object result = pjp.proceed();
            long elapsed = System.currentTimeMillis() - start;

            log.info("[AUDIT] TRANSITION_SUCCESS entity={}/{} transition={} user={} durationMs={}",
                ctx.getEntityType(), ctx.getEntityId(), ctx.getTransitionKey(),
                ctx.getUserId(), elapsed);

            return result;

        } catch (WorkflowException ex) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("[AUDIT] TRANSITION_FAILED code={} entity={}/{} transition={} user={} reason='{}' durationMs={}",
                ex.getCode(), ctx.getEntityType(), ctx.getEntityId(), ctx.getTransitionKey(),
                ctx.getUserId(), ex.getMessage(), elapsed);
            throw ex;

        } catch (Exception ex) {
            long elapsed = System.currentTimeMillis() - start;
            log.error("[AUDIT] TRANSITION_ERROR entity={}/{} transition={} user={} durationMs={} error={}",
                ctx.getEntityType(), ctx.getEntityId(), ctx.getTransitionKey(),
                ctx.getUserId(), elapsed, ex.getMessage(), ex);
            throw ex;
        }
    }
}
