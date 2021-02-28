package pl.ds.websight.resourcebrowser.service.impl;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.api.ResourceContentProvider;
import pl.ds.websight.resourcebrowser.resourceprovider.AuthenticatedResourceProvider;
import pl.ds.websight.resourcebrowser.util.ResourceBrowserUtil;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Component(service = ResourceContentService.class)
public class ResourceContentService {

    private static final Logger LOG = LoggerFactory.getLogger(ResourceContentService.class);

    private final Map<String, ResourceContentProvider> contentProvidersByProviderClassName = new HashMap<>();

    @Reference
    private DefaultResourceContentProvider defaultResourceContentProvider;

    public InputStream getContent(Map.Entry<AuthenticatedResourceProvider, Resource> resourceVariant) {
        if (resourceVariant != null) {
            return getContentProvider(resourceVariant).getContent(resourceVariant.getValue());
        }
        return null;
    }

    public String getSourcePath(Map.Entry<AuthenticatedResourceProvider, Resource> resourceVariant) {
        if (resourceVariant != null) {
            return getContentProvider(resourceVariant).getSourcePath(resourceVariant.getValue());
        }
        return null;
    }

    public String getMimeType(Map.Entry<AuthenticatedResourceProvider, Resource> resourceVariant) {
        if (resourceVariant != null) {
            return getContentProvider(resourceVariant).getMimeType(resourceVariant.getValue());
        }
        return null;
    }

    public boolean hasContent(Map.Entry<AuthenticatedResourceProvider, Resource> resourceVariant) {
        if (resourceVariant != null) {
            return getContentProvider(resourceVariant).hasContent(resourceVariant.getValue());
        }
        return false;
    }

    private ResourceContentProvider getContentProvider(Map.Entry<AuthenticatedResourceProvider, Resource> resourceVariant) {
        String resourceProviderName = resourceVariant.getKey().getInfo().getName();
        return contentProvidersByProviderClassName.getOrDefault(resourceProviderName, defaultResourceContentProvider);
    }

    @Reference(service = ResourceContentProvider.class, cardinality = ReferenceCardinality.MULTIPLE, policy = ReferencePolicy.DYNAMIC)
    protected synchronized void bindDataProvider(ResourceContentProvider dataProvider, Map<String, Object> properties) {
        String handledProviderClassName = (String) properties.get(ResourceBrowserUtil.SERVICE_PROPERTY_PROVIDER);
        if (StringUtils.isNotBlank(handledProviderClassName)) {
            LOG.error("Binding {}", dataProvider.getClass().getName());
            contentProvidersByProviderClassName.put(handledProviderClassName, dataProvider);
        }
    }

    protected synchronized void unbindDataProvider(ResourceContentProvider dataProvider, Map<String, Object> properties) {
        String handledProviderClassName = (String) properties.get(ResourceBrowserUtil.SERVICE_PROPERTY_PROVIDER);
        if (StringUtils.isNotBlank(handledProviderClassName)) {
            LOG.error("Unbinding {}", dataProvider.getClass().getName());
            contentProvidersByProviderClassName.remove(handledProviderClassName, dataProvider);
        }
    }

}
