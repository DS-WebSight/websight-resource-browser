package pl.ds.websight.resourcebrowser.service.impl;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.spi.resource.provider.ResourceProvider;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.osgi.service.component.annotations.ReferencePolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProviderInfo;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceProvidersControl;
import pl.ds.websight.resourcebrowser.service.ResourceBrowserService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.function.Predicate;

import static java.util.Comparator.comparing;
import static java.util.stream.Collectors.toList;

@Component(service = ResourceBrowserService.class)
public class ResourceBrowserServiceImpl implements ResourceBrowserService {

    private static final Logger LOG = LoggerFactory.getLogger(ResourceBrowserServiceImpl.class);

    private final Map<String, ResourceProviderStorageItem> resourceProviders = new HashMap<>();

    @Override
    public ResourceProvidersControl getResourceProvidersControl(List<String> providerNames, ResourceResolver resourceResolver) {
        List<ResourceProviderStorageItem> requestedProviders = resourceProviders.values().stream()
                .filter(item -> providerNames.contains(item.getInfo().getName()))
                .collect(toList());
        return new ResourceProvidersControl(requestedProviders, resourceResolver);
    }

    @Override
    public List<ResourceProviderInfo> listAvailableProviders() {
        return resourceProviders.values().stream()
                .map(ResourceProviderStorageItem::getInfo)
                .filter(distinctByField(ResourceProviderInfo::getName))
                .sorted(comparing(o -> StringUtils.substringAfterLast(o.getName(), ".")))
                .collect(toList());
    }

    private static <T> Predicate<T> distinctByField(Function<? super T, ?> fieldExtractor) {
        Map<Object, Boolean> seen = new ConcurrentHashMap<>();
        return t -> seen.putIfAbsent(fieldExtractor.apply(t), Boolean.TRUE) == null;
    }

    @Reference(service = ResourceProvider.class, cardinality = ReferenceCardinality.MULTIPLE, policy = ReferencePolicy.DYNAMIC)
    protected synchronized void bindResourceProviders(ResourceProvider<Object> resourceProvider, Map<String, Object> properties) {
        LOG.debug("Binding {}", resourceProvider.getClass().getName());
        String rootPath = (String) properties.get(ResourceProvider.PROPERTY_ROOT);
        if (StringUtils.isNotBlank(rootPath)) {
            resourceProviders.put(rootPath, new ResourceProviderStorageItem(resourceProvider, properties));
        }
    }

    protected synchronized void unbindResourceProviders(ResourceProvider<Object> resourceProvider, Map<String, Object> properties) {
        LOG.debug("Unbinding {}", resourceProvider.getClass().getName());
        String rootPath = (String) properties.get(ResourceProvider.PROPERTY_ROOT);
        resourceProviders.remove(rootPath);
    }

    public static class ResourceProviderStorageItem {

        private final ResourceProvider<Object> resourceProvider;
        private final ResourceProviderInfo info;

        public ResourceProviderStorageItem(ResourceProvider<Object> resourceProvider, Map<String, Object> properties) {
            this.resourceProvider = resourceProvider;
            this.info = new ResourceProviderInfo(resourceProvider.getClass().getName(), properties);
        }

        public ResourceProvider<Object> getResourceProvider() {
            return resourceProvider;
        }

        public ResourceProviderInfo getInfo() {
            return info;
        }

    }

}
