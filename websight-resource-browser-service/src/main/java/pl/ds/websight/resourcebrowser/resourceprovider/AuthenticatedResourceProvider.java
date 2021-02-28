package pl.ds.websight.resourcebrowser.resourceprovider;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.LoginException;
import org.apache.sling.api.resource.PersistenceException;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.spi.resource.provider.ResolveContext;
import org.apache.sling.spi.resource.provider.ResourceContext;
import org.apache.sling.spi.resource.provider.ResourceProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.service.impl.ResourceBrowserServiceImpl.ResourceProviderStorageItem;

import javax.jcr.Session;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class AuthenticatedResourceProvider implements Comparable<AuthenticatedResourceProvider> {

    private static final Logger LOG = LoggerFactory.getLogger(AuthenticatedResourceProvider.class);

    private final ResourceProvider<Object> resourceProvider;

    private final ResolveContext<Object> resolveContext;

    private final ResourceProviderInfo info;

    private final Resource rootResource;

    public AuthenticatedResourceProvider(ResourceProviderStorageItem resourceProviderStorageItem, ResourceResolver resourceResolver) {
        this.resourceProvider = resourceProviderStorageItem.getResourceProvider();
        this.info = resourceProviderStorageItem.getInfo();
        this.resolveContext = authenticate(resourceResolver, info.getAuthenticate());
        this.rootResource = getResource(null, info.getRoot());
    }

    private ResolveContext<Object> authenticate(ResourceResolver resourceResolver, String authenticate) {
        Object providerState = null;
        try {
            Map<String, Object> authenticationInfo = new HashMap<>();
            authenticationInfo.put(ResourceProvider.AUTH_CLONE, true);
            authenticationInfo.put(ResourceProvider.PROPERTY_AUTHENTICATE, authenticate);
            authenticationInfo.put("user.jcr.session", resourceResolver.adaptTo(Session.class));
            providerState = resourceProvider.authenticate(authenticationInfo);
        } catch (LoginException e) {
            LOG.warn("Could not authenticate resource provider", e);
        }
        return new BasicResolveContext<>(resourceResolver, providerState);
    }

    public void copyResource(String source, String destination) throws PersistenceException {
        if (StringUtils.isNotBlank(source) && StringUtils.isNotBlank(destination)) {
            resourceProvider.copy(resolveContext, source, destination);
        }
    }

    public Resource createResource(Resource parent, String name, Map<String, Object> properties) throws PersistenceException {
        if (parent != null) {
            return resourceProvider.create(resolveContext, StringUtils.appendIfMissing(parent.getPath(), "/") + name, properties);
        }
        return null;
    }

    public void removeResource(Resource parent, String name) throws PersistenceException {
        if (parent != null) {
            Resource resourceToRemove = parent.getChild(name);
            if (resourceToRemove != null) {
                resourceProvider.delete(resolveContext, resourceToRemove);
            }
        }
    }

    public Resource getResource(Resource parent, String path) {
        try {
            return resourceProvider.getResource(resolveContext, path, ResourceContext.EMPTY_CONTEXT, parent);
        } catch (Exception e) {
            LOG.warn("Could not get resource {} from {}", path, info.getName(), e);
        }
        return null;
    }

    public Iterator<Resource> listChildren(Resource parent) {
        try {
            return resourceProvider.listChildren(resolveContext, parent);
        } catch (Exception e) {
            LOG.warn("Could not list children of {} from {}", parent.getPath(), info.getName(), e);
        }
        return null;
    }

    public void commit() throws PersistenceException {
        if (resourceProvider.hasChanges(resolveContext)) {
            resourceProvider.commit(resolveContext);
        }
    }

    public Resource getRootResource() {
        return rootResource;
    }

    @Override
    @SuppressWarnings("java:S1210")
    public int compareTo(AuthenticatedResourceProvider other) {
        return this.info.compareTo(other.getInfo());
    }

    public ResourceProviderInfo getInfo() {
        return info;
    }

}
