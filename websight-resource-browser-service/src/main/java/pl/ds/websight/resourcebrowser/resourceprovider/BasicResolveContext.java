package pl.ds.websight.resourcebrowser.resourceprovider;

import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.spi.resource.provider.ResolveContext;
import org.apache.sling.spi.resource.provider.ResourceProvider;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public class BasicResolveContext<T> implements ResolveContext<T> {

    private final ResourceResolver resourceResolver;
    private final T providerState;

    public BasicResolveContext(ResourceResolver resourceResolver, T providerState) {
        this.resourceResolver = resourceResolver;
        this.providerState = providerState;
    }

    @NotNull
    @Override
    public ResourceResolver getResourceResolver() {
        return resourceResolver;
    }

    @Nullable
    @Override
    public T getProviderState() {
        return providerState;
    }

    @Nullable
    @Override
    public ResolveContext<T> getParentResolveContext() {
        return null;
    }

    @Nullable
    @Override
    public ResourceProvider<T> getParentResourceProvider() {
        return null;
    }

}
