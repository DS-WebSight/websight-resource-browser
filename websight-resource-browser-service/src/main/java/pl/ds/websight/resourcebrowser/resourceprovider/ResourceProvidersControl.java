package pl.ds.websight.resourcebrowser.resourceprovider;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceResolver;
import org.apache.sling.api.resource.ResourceUtil;
import org.apache.sling.api.resource.SyntheticResource;
import org.apache.sling.spi.resource.provider.ResourceProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import pl.ds.websight.resourcebrowser.service.impl.ResourceBrowserServiceImpl.ResourceProviderStorageItem;

import javax.jcr.Node;
import javax.jcr.RepositoryException;
import javax.jcr.nodetype.NodeTypeDefinition;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static java.util.stream.Collectors.toList;

public class ResourceProvidersControl {

    private static final Logger LOG = LoggerFactory.getLogger(ResourceProvidersControl.class);

    private final List<AuthenticatedResourceProvider> authResourceProviders;

    public ResourceProvidersControl(List<ResourceProviderStorageItem> resourceProviders, ResourceResolver resourceResolver) {
        this.authResourceProviders = authenticate(resourceProviders, resourceResolver);
    }

    private static List<AuthenticatedResourceProvider> authenticate(List<ResourceProviderStorageItem> resourceProviders,
            ResourceResolver resourceResolver) {
        return resourceProviders.stream()
                .map(item -> new AuthenticatedResourceProvider(item, resourceResolver))
                .sorted(Comparator.reverseOrder())
                .collect(toList());
    }

    public AuthenticatedResourceProvider getBestMatchingProvider(String path) {
        return streamOfProvidersForPath(path).findFirst().orElse(null);
    }

    public ResourceWrapper getResource(ResourceResolver resourceResolver, String path) {
        ResourceWrapper resource = null;
        List<AuthenticatedResourceProvider> providers = streamOfProvidersForPath(path).collect(toList());
        for (AuthenticatedResourceProvider authProvider : providers) {
            Resource providedResource = authProvider.getResource(null, path);
            if (providedResource != null) {
                if (resource == null) {
                    resource = new ResourceWrapper(providedResource);
                }
                resource.addVariant(authProvider, providedResource);
            }
        }
        if (resource == null && !getProvidersRegisteredBelowPath(path).isEmpty()) {
            Resource linkResource = new SyntheticResource(resourceResolver, path, ResourceProvider.RESOURCE_TYPE_SYNTHETIC);
            resource = new ResourceWrapper(linkResource);
        }
        return resource;
    }

    public List<ResourceWrapper> listChildren(ResourceWrapper parentProvidedResource) {
        List<ResourceWrapper> resources = new LinkedList<>();
        for (Map.Entry<AuthenticatedResourceProvider, Resource> resourceVariant : parentProvidedResource.getVariants().entrySet()) {
            AuthenticatedResourceProvider authProvider = resourceVariant.getKey();
            Iterator<Resource> children = authProvider.listChildren(resourceVariant.getValue());
            if (children != null) {
                children.forEachRemaining(resource -> addOrUpdateResource(resources, authProvider, resource));
            }
        }
        listChildrenRegisteredBelowParent(resources, parentProvidedResource);
        if (shouldSort(parentProvidedResource)) {
            resources.sort(Comparator.comparing(ResourceWrapper::getName, String.CASE_INSENSITIVE_ORDER));
        }
        return resources;
    }

    private void listChildrenRegisteredBelowParent(List<ResourceWrapper> resources, ResourceWrapper parentProvidedResource) {
        String parentPath = parentProvidedResource.getPath();
        for (AuthenticatedResourceProvider provider : getProvidersRegisteredBelowPath(parentPath)) {
            String providerRootPath = provider.getInfo().getRoot();
            boolean isRegisteredAsDirectlyBelowParent = parentPath.equals(ResourceUtil.getParent(providerRootPath));
            if (isRegisteredAsDirectlyBelowParent) {
                addOrUpdateResource(resources, provider, provider.getRootResource());
            } else {
                String relativePathWithTrailingSlash = relativizePath(parentPath, providerRootPath);
                String nameOfDirectChild = StringUtils.substringBefore(relativePathWithTrailingSlash, "/");
                String path = StringUtils.appendIfMissing(parentProvidedResource.getPath(), "/") + nameOfDirectChild;
                boolean isAlreadyPresent = resources.stream().anyMatch(resource -> StringUtils.equals(resource.getPath(), path));
                if (!isAlreadyPresent) {
                    resources.add(new ResourceWrapper(nameOfDirectChild, path));
                }
            }
        }
    }

    private static void addOrUpdateResource(List<ResourceWrapper> resources, AuthenticatedResourceProvider provider, Resource resource) {
        if (resource != null) {
            ResourceWrapper providedResource = resources.stream()
                    .filter(r -> StringUtils.equals(r.getPath(), resource.getPath()))
                    .findFirst().orElse(null);
            if (providedResource == null) {
                providedResource = new ResourceWrapper(resource);
                resources.add(providedResource);
            }
            providedResource.addVariant(provider, resource);
        }
    }

    private String relativizePath(String rootPathCandidate, String pathToRelativize) {
        // adding '/' at the end to avoid problems with "/apps/websight-any" and "/apps/websight"
        // and case when paths are equal
        return StringUtils.removeStart(
                StringUtils.appendIfMissing(pathToRelativize, "/"),
                StringUtils.appendIfMissing(rootPathCandidate, "/"));
    }

    public static boolean shouldSort(ResourceWrapper providedParent) {
        for (Resource parent : providedParent.getVariants().values()) {
            Node node = parent.adaptTo(Node.class);
            if (node != null) {
                try {
                    return !hasOrderableChildNodes(node);
                } catch (RepositoryException e) {
                    LOG.warn("Could not get Node Type Definition for Node: {}", parent.getPath(), e);
                }
            }
        }
        return true;
    }

    private static boolean hasOrderableChildNodes(Node node) throws RepositoryException {
        return node.getPrimaryNodeType().hasOrderableChildNodes() ||
                Arrays.stream(node.getMixinNodeTypes()).anyMatch(NodeTypeDefinition::hasOrderableChildNodes);
    }

    public boolean hasChildren(ResourceWrapper parentProvidedResource) {
        return !listChildren(parentProvidedResource).isEmpty();
    }

    private List<AuthenticatedResourceProvider> getProvidersRegisteredBelowPath(String path) {
        return authResourceProviders.stream()
                .filter(provider -> {
                    String providerRoot = provider.getInfo().getRoot();
                    return !providerRoot.equals(path) && pathStartsWith(providerRoot, path);
                }).collect(toList());
    }

    private Stream<AuthenticatedResourceProvider> streamOfProvidersForPath(String path) {
        return authResourceProviders.stream()
                .filter(provider -> pathStartsWith(path, provider.getInfo().getRoot()));
    }

    private static boolean pathStartsWith(String path, String prefixPath) {
        // adding '/' at the end to avoid pathStartsWith("/apps/websight-any", "/apps/websight") == true
        String pathToCompare = StringUtils.appendIfMissing(path, "/");
        String prefixPathToCompare = StringUtils.appendIfMissing(prefixPath, "/");
        return StringUtils.startsWith(pathToCompare, prefixPathToCompare);
    }

}
