package pl.ds.websight.resourcebrowser.resourceprovider;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.spi.resource.provider.ResourceProvider;

import java.util.Map;

public class ResourceProviderInfo implements Comparable<ResourceProviderInfo> {

    private final String name;
    private final String authenticate;
    private final String root;

    private final boolean modifiable;

    public ResourceProviderInfo(String name, Map<String, Object> properties) {
        this.name = name;
        this.authenticate = getStringProperty(ResourceProvider.PROPERTY_AUTHENTICATE, properties);
        this.root = getStringProperty(ResourceProvider.PROPERTY_ROOT, properties);
        this.modifiable = (Boolean) properties.getOrDefault(ResourceProvider.PROPERTY_MODIFIABLE, false);
    }

    private static String getStringProperty(String name, Map<String, Object> properties) {
        return properties.containsKey(name) ? properties.get(name).toString() : null;
    }

    public String getName() {
        return name;
    }

    public String getAuthenticate() {
        return authenticate;
    }

    public boolean isModifiable() {
        return modifiable;
    }

    @Override
    @SuppressWarnings("java:S1210")
    public int compareTo(ResourceProviderInfo other) {
        Integer rootLevel = getRootLevel();
        Integer otherRootLevel = other.getRootLevel();
        if (rootLevel.equals(otherRootLevel)) {
            return StringUtils.compareIgnoreCase(root, other.getRoot());
        }
        return rootLevel.compareTo(otherRootLevel);
    }

    public String getRoot() {
        return root;
    }

    private Integer getRootLevel() {
        return StringUtils.countMatches(root, '/');
    }

}
