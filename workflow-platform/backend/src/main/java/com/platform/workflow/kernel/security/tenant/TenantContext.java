package com.platform.workflow.kernel.security.tenant;

import java.util.UUID;

/**
 * Thread-local holder for the current tenant context.
 *
 * <p>Set by {@link TenantContextFilter} on every request.
 * All repository queries must filter by {@code TenantContext.require()}.
 *
 * <p>Never store a reference to this across threads. Use per-request.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(UUID tenantId) {
        CURRENT.set(tenantId);
    }

    public static UUID get() {
        return CURRENT.get();
    }

    /**
     * Returns the current tenant or throws — use in any code that MUST have a tenant.
     */
    public static UUID require() {
        UUID id = CURRENT.get();
        if (id == null) throw new IllegalStateException("No tenant in context — request not properly authenticated");
        return id;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
