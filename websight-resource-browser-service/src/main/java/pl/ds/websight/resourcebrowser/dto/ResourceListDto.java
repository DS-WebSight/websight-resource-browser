package pl.ds.websight.resourcebrowser.dto;

import org.apache.sling.api.resource.Resource;
import pl.ds.websight.resourcebrowser.resourceprovider.ResourceWrapper;

import java.util.LinkedList;
import java.util.List;

public class ResourceListDto {

    private final String name;
    private final String path;
    private final String type;
    private final List<String> providers;
    private String shadowedBy;

    private final boolean hasContent;
    private final boolean hasChildren;
    private boolean orderable;

    private List<ResourceListDto> children;

    public ResourceListDto(ResourceWrapper providedResource, String shadowedBy, boolean hasContent, boolean hasChildren,
            boolean orderable) {
        this.name = providedResource.getName();
        this.path = providedResource.getPath();
        if (providedResource.getPrimaryVariant() != null) {
            this.type = providedResource.getPrimaryVariant().getValue().getResourceType();
        } else {
            this.type = null;
        }
        this.shadowedBy = shadowedBy;
        this.providers = providedResource.getAvailableProviders();
        this.hasContent = hasContent;
        this.hasChildren = hasChildren;
        this.orderable = orderable;
    }

    public ResourceListDto(Resource resource, List<String> providers, boolean hasContent) {
        this.name = resource.getName();
        this.path = resource.getPath();
        this.type = resource.getResourceType();
        this.providers = providers;
        this.hasContent = hasContent;
        this.hasChildren = resource.hasChildren();
    }

    public void addChild(ResourceListDto child) {
        if (children == null) {
            children = new LinkedList<>();
        }
        children.add(child);
    }

    public String getName() {
        return name;
    }

    public String getPath() {
        return path;
    }

    public String getType() {
        return type;
    }

    public String getShadowedBy() {
        return shadowedBy;
    }

    public List<String> getProviders() {
        return providers;
    }

    public boolean isHasContent() {
        return hasContent;
    }

    public boolean isHasChildren() {
        return hasChildren;
    }

    public boolean isOrderable() {
        return orderable;
    }

    public List<ResourceListDto> getChildren() {
        return children;
    }

}
