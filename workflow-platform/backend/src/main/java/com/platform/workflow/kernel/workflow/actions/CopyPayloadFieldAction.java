package com.platform.workflow.kernel.workflow.actions;

import com.platform.workflow.kernel.workflow.engine.ExecutionContext;
import com.platform.workflow.kernel.workflow.spi.WorkflowActionExecutor;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Built-in action: copy a value from one payload key to another.
 *
 * <p>Config: {@code {"from": "lostReason", "to": "lostReason"}}
 *
 * <p>Use case: the caller sends {@code lostReason} in the request payload.
 * This action ensures it is surfaced in the execution context so the
 * EntityAdapter can persist it to the domain entity's {@code lostReason} field.
 *
 * <p>Can also be used to rename or alias payload keys between condition
 * evaluation and EntityAdapter persistence.
 */
@Component
public class CopyPayloadFieldAction implements WorkflowActionExecutor {

    @Override
    public String actionType() {
        return "copy_payload_field";
    }

    @Override
    public void execute(Map<String, Object> config, ExecutionContext context, Map<String, Object> entity) {
        String from = (String) config.get("from");
        String to   = (String) config.get("to");
        Object val  = context.payloadGet(from);
        if (val != null) {
            context.payloadPut(to, val);
        }
    }
}
