package com.platform.workflow.kernel.workflow.engine;

import lombok.Builder;
import lombok.Getter;

/**
 * A transition visible to the current user from the entity's current state.
 * Used by the UI to render dynamic action buttons.
 */
@Getter
@Builder
public class AvailableTransition {
    private final String key;
    private final String label;
    private final String toState;
    /** "primary" | "danger" | "warning" | null */
    private final String uiVariant;
    /** null if no permission required */
    private final String requiredPermission;
}
