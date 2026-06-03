package com.platform.workflow.kernel.workflow.engine;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

/**
 * Immutable result returned by {@link WorkflowEngine#applyTransition}.
 * Serialized as the REST response body.
 */
@Getter
@Builder
public class TransitionResult {
    private final boolean    success;
    private final String     fromState;
    private final String     toState;
    private final List<String> actionsRun;
    private final long       durationMs;
    private final UUID       logId;
    private final String     correlationId;
}
