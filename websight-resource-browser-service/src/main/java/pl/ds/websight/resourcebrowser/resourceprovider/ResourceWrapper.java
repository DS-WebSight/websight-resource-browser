package pl.ds.websight.resourcebrowser.resourceprovider;

import org.apache.sling.api.resource.Resource;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static java.util.stream.Collectors.toList;

public class ResourceWrapper {

    private final Map<AuthenticatedResourceProvider, Resource> variants = new LinkedHashMap<>();

    private final String name;
    private final String path;

    public ResourceWrapper(Resource resource) {
        this.name = resource.getName();
        this.path = resource.getPath();
    }

    public ResourceWrapper(String name, String path) {
        this.name = name;
        this.path = path;
    }

    public void addVariant(AuthenticatedResourceProvider authProvider, Resource resource) {
        variants.put(authProvider, resource);
    }

    public Map<AuthenticatedResourceProvider, Resource> getVariants() {
        return variants;
    }

    public String getName() {
        return name;
    }

    public String getPath() {
        return path;
    }

    public List<String> getAvailableProviders() {
        return variants.keySet().stream()
                .sorted(Comparator.reverseOrder())
                .map(provider -> provider.getInfo().getName())
                .distinct()
                .collect(toList());
    }

    public Map.Entry<AuthenticatedResourceProvider, Resource> getPrimaryVariant() {
        if (variants.size() > 0) {
            return variants.entrySet().iterator().next();
        }
        return null;
    }

}
